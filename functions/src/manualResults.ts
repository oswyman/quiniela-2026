import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";

async function isPlatformAdmin(uid: string) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.roleGlobal === "platform_admin";
}

type ManualMatchInput = {
  matchId?: string;
  matchNumber?: number;
  phase: string;
  fifaGroup?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  venue?: string;
  status?: "scheduled" | "live" | "finished" | "cancelled";
};

type ManualResultInput = {
  matchId: string;
  status?: "scheduled" | "live" | "finished" | "cancelled";
  homeGoals90?: number | null;
  awayGoals90?: number | null;
  homeGoalsExtraTime?: number | null;
  awayGoalsExtraTime?: number | null;
  homePenaltyGoals?: number | null;
  awayPenaltyGoals?: number | null;
  finalHomeGoals?: number | null;
  finalAwayGoals?: number | null;
  winnerTeam?: string | null;
};

export const upsertManualMatch = onCall<ManualMatchInput>(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const input = request.data;
  if (!input.homeTeam?.trim() || !input.awayTeam?.trim() || !input.kickoffAt) {
    throw new HttpsError("invalid-argument", "Faltan equipos o kickoff.");
  }

  const db = getFirestore();
  const ref = input.matchId ? db.doc(`matches/${input.matchId}`) : db.collection("matches").doc();
  const before = (await ref.get()).data();
  const kickoffAt = Timestamp.fromDate(new Date(input.kickoffAt));
  const match = {
    provider: "manual",
    providerMatchId: ref.id,
    matchNumber: input.matchNumber ?? null,
    phase: input.phase?.trim() || "Mundial 2026",
    fifaGroup: input.fifaGroup?.trim() || null,
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    kickoffAt,
    timezone: "UTC",
    venue: input.venue?.trim() || null,
    status: input.status ?? "scheduled",
    rawProviderStatus: "manual",
    updatedAt: FieldValue.serverTimestamp(),
    lastSyncedAt: FieldValue.serverTimestamp()
  };

  await ref.set(match, { merge: true });
  await db.doc("systemConfig/providerStatus").set({
    provider: "manual",
    status: "healthy",
    message: "Fixture manual actualizado",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "upsertManualMatch",
    entityType: "match",
    entityId: ref.id,
    before,
    after: match
  });
  return { matchId: ref.id };
});

export const upsertManualResult = onCall<ManualResultInput>(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const input = request.data;
  if (!input.matchId) throw new HttpsError("invalid-argument", "Falta matchId.");

  const db = getFirestore();
  const ref = db.doc(`matches/${input.matchId}`);
  const before = (await ref.get()).data();
  if (!before) throw new HttpsError("not-found", "Partido no encontrado.");
  const patch = {
    status: input.status ?? "finished",
    homeGoals90: nullableNumber(input.homeGoals90),
    awayGoals90: nullableNumber(input.awayGoals90),
    homeGoalsExtraTime: nullableNumber(input.homeGoalsExtraTime),
    awayGoalsExtraTime: nullableNumber(input.awayGoalsExtraTime),
    homePenaltyGoals: nullableNumber(input.homePenaltyGoals),
    awayPenaltyGoals: nullableNumber(input.awayPenaltyGoals),
    finalHomeGoals: nullableNumber(input.finalHomeGoals ?? input.homeGoals90),
    finalAwayGoals: nullableNumber(input.finalAwayGoals ?? input.awayGoals90),
    winnerTeam: input.winnerTeam ?? null,
    provider: "manual",
    rawProviderStatus: "manual result",
    updatedAt: FieldValue.serverTimestamp(),
    lastSyncedAt: FieldValue.serverTimestamp()
  };

  await ref.set(patch, { merge: true });
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "upsertManualResult",
    entityType: "match",
    entityId: input.matchId,
    before,
    after: patch
  });
  return { ok: true };
});

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
