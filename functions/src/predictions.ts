import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { inferPickType, legacyPredictionToPick, PredictionPickType } from "./scoring";

const PREDICTION_CUTOFF_MINUTES = 90;

type SubmitPredictionInput = {
  groupId: string;
  matchId: string;
  pickType?: PredictionPickType;
  pick?: string;
  homeGoals?: number;
  awayGoals?: number;
};

export const submitPrediction = onCall<SubmitPredictionInput>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { groupId, matchId } = request.data;

  if (!groupId || !matchId) throw new HttpsError("invalid-argument", "Falta grupo o partido.");

  const db = getFirestore();
  const [memberSnap, matchSnap] = await Promise.all([
    db.doc(`groups/${groupId}/members/${request.auth.uid}`).get(),
    db.doc(`matches/${matchId}`).get()
  ]);
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "No perteneces a este grupo.");
  const match = matchSnap.data();
  if (!match) throw new HttpsError("not-found", "Partido no encontrado.");
  const pickType = inferPickType(match as never);
  if (request.data.pickType && request.data.pickType !== pickType) {
    throw new HttpsError("invalid-argument", "El tipo de elección no corresponde a la fase del partido.");
  }
  const pick = String(request.data.pick ?? legacyPredictionToPick(request.data) ?? "");
  if (!pick) throw new HttpsError("invalid-argument", "Falta elección.");
  if (pickType === "GROUP_OUTCOME" && !["HOME", "DRAW", "AWAY"].includes(pick)) {
    throw new HttpsError("invalid-argument", "Elección inválida para fase de grupos.");
  }
  if (pickType === "ADVANCING_TEAM" && (!match.isResolved || !match.isPublishedToParticipants)) {
    throw new HttpsError("failed-precondition", "Este partido aún no está publicado para pronosticar.");
  }
  if (pickType === "ADVANCING_TEAM") {
    const home = match.resolvedHomeTeam || match.homeTeam;
    const away = match.resolvedAwayTeam || match.awayTeam;
    if (![home, away].includes(pick)) throw new HttpsError("invalid-argument", "Elige uno de los equipos del partido.");
  }

  const kickoffMs = match.kickoffAt?.toMillis?.();
  const predictionClosesAt = typeof kickoffMs === "number" ? kickoffMs - PREDICTION_CUTOFF_MINUTES * 60 * 1000 : null;
  const isClosed = typeof predictionClosesAt === "number" && Date.now() >= predictionClosesAt;
  if (isClosed) {
    await writeAuditLog({
      actorUid: request.auth.uid,
      groupId,
      action: "latePredictionRejected",
      entityType: "prediction",
      entityId: `${request.auth.uid}_${matchId}`,
      after: { matchId, pickType, pick, reason: "predictionCutoff90Min", predictionClosesAt }
    });
    throw new HttpsError("failed-precondition", "El pronóstico cerró 90 minutos antes del kickoff.");
  }

  const ref = db.doc(`groups/${groupId}/predictions/${request.auth.uid}_${matchId}`);
  const before = await ref.get();
  const beforeData = before.data();
  const prediction = {
    uid: request.auth.uid,
    matchId,
    pickType,
    pick,
    homeGoals: request.data.homeGoals ?? beforeData?.homeGoals ?? null,
    awayGoals: request.data.awayGoals ?? beforeData?.awayGoals ?? null,
    submittedAt: before.exists ? beforeData?.submittedAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    status: "valid",
    isLate: false,
    points: beforeData?.points ?? 0,
    totalCorrect: beforeData?.totalCorrect ?? 0,
    isCorrect: beforeData?.isCorrect ?? false,
    scoringReason: beforeData?.scoringReason ?? "Pendiente de resultado"
  };

  await ref.set(prediction, { merge: true });
  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId,
    action: before.exists ? "updatePrediction" : "createPrediction",
    entityType: "prediction",
    entityId: ref.id,
    before: before.data(),
    after: prediction
  });

  return { predictionId: ref.id };
});

export const migrateLegacyScorePredictions = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const db = getFirestore();
  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (userSnap.data()?.roleGlobal !== "platform_admin") throw new HttpsError("permission-denied", "Solo platform_admin.");

  const groupsSnap = await db.collection("groups").get();
  let migrated = 0;
  let skipped = 0;

  for (const groupDoc of groupsSnap.docs) {
    const predictionsSnap = await db.collection(`groups/${groupDoc.id}/predictions`).get();
    const batch = db.batch();
    let batchHasWrites = false;

    for (const predictionDoc of predictionsSnap.docs) {
      const prediction = predictionDoc.data();
      if (prediction.pick) {
        skipped += 1;
        continue;
      }
      const pick = legacyPredictionToPick(prediction as { homeGoals?: number; awayGoals?: number });
      if (!pick) {
        skipped += 1;
        continue;
      }
      batch.set(predictionDoc.ref, {
        pickType: "GROUP_OUTCOME",
        pick,
        migrationVersion: "pick-v1",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      migrated += 1;
      batchHasWrites = true;
    }

    if (batchHasWrites) await batch.commit();
  }

  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "migrateLegacyScorePredictions",
    entityType: "prediction",
    entityId: "all-groups",
    after: { migrated, skipped }
  });

  return { migrated, skipped };
});
