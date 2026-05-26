import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";

type SubmitPredictionInput = {
  groupId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
};

export const submitPrediction = onCall<SubmitPredictionInput>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { groupId, matchId } = request.data;
  const homeGoals = Number(request.data.homeGoals);
  const awayGoals = Number(request.data.awayGoals);

  if (!groupId || !matchId) throw new HttpsError("invalid-argument", "Falta grupo o partido.");
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new HttpsError("invalid-argument", "El marcador debe usar enteros positivos.");
  }

  const db = getFirestore();
  const [memberSnap, matchSnap] = await Promise.all([
    db.doc(`groups/${groupId}/members/${request.auth.uid}`).get(),
    db.doc(`matches/${matchId}`).get()
  ]);
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "No perteneces a este grupo.");
  const match = matchSnap.data();
  if (!match) throw new HttpsError("not-found", "Partido no encontrado.");

  const kickoffMs = match.kickoffAt?.toMillis?.();
  const isClosed = typeof kickoffMs === "number" && Date.now() >= kickoffMs;
  if (isClosed) {
    await writeAuditLog({
      actorUid: request.auth.uid,
      groupId,
      action: "latePredictionRejected",
      entityType: "prediction",
      entityId: `${request.auth.uid}_${matchId}`,
      after: { matchId, homeGoals, awayGoals }
    });
    throw new HttpsError("failed-precondition", "El partido ya cerró.");
  }

  const ref = db.doc(`groups/${groupId}/predictions/${request.auth.uid}_${matchId}`);
  const before = await ref.get();
  const prediction = {
    uid: request.auth.uid,
    matchId,
    homeGoals,
    awayGoals,
    submittedAt: before.exists ? before.data()?.submittedAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    status: "valid",
    isLate: false,
    points: before.data()?.points ?? 0,
    scoringReason: before.data()?.scoringReason ?? "Pendiente de resultado"
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
