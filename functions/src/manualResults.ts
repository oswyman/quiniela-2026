import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { zonedLocalToUtc } from "./timezone";

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
  kickoffAt?: string;
  localDate?: string;
  localTime?: string;
  timezone?: string;
  city?: string;
  country?: string;
  venue?: string;
  sourceName?: string;
  sourceUrl?: string;
  status?: "scheduled" | "live" | "finished" | "cancelled";
};

type BulkManualMatchInput = {
  matches: Array<ManualMatchInput & { matchNumber: number }>;
  sourceName?: string;
  sourceUrl?: string;
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
  if (!input.homeTeam?.trim() || !input.awayTeam?.trim() || (!input.kickoffAt && (!input.localDate || !input.localTime || !input.timezone))) {
    throw new HttpsError("invalid-argument", "Faltan equipos o kickoff.");
  }

  const db = getFirestore();
  const ref = input.matchId ? db.doc(`matches/${input.matchId}`) : db.collection("matches").doc();
  const before = (await ref.get()).data();
  const sourceTimezone = input.timezone?.trim() || "UTC";
  const kickoffDate = input.localDate && input.localTime
    ? zonedLocalToUtc(input.localDate, input.localTime, sourceTimezone)
    : new Date(input.kickoffAt);
  if (Number.isNaN(kickoffDate.getTime())) throw new HttpsError("invalid-argument", "Kickoff inválido.");
  const kickoffAt = Timestamp.fromDate(kickoffDate);
  const match = {
    provider: "manual",
    providerMatchId: ref.id,
    matchNumber: input.matchNumber ?? null,
    phase: input.phase?.trim() || "Mundial 2026",
    fifaGroup: input.fifaGroup?.trim() || null,
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    kickoffAt,
    timezone: sourceTimezone,
    sourceTimezone,
    sourceLocalDate: input.localDate ?? null,
    sourceLocalTime: input.localTime ?? null,
    displayTimeMode: "cdmx",
    venue: input.venue?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
    sourceName: input.sourceName?.trim() || "Carga manual",
    sourceUrl: input.sourceUrl?.trim() || null,
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

export const bulkUpsertManualMatches = onCall<BulkManualMatchInput>(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const input = request.data;
  const matches = input.matches ?? [];
  if (!Array.isArray(matches) || matches.length === 0) throw new HttpsError("invalid-argument", "No hay partidos para importar.");
  if (matches.length > 120) throw new HttpsError("invalid-argument", "La carga máxima es de 120 partidos por importación.");

  const db = getFirestore();
  const errors: Array<{ row: number; message: string }> = [];
  const batch = db.batch();
  let imported = 0;

  for (const [index, item] of matches.entries()) {
    try {
      if (!item.matchNumber || !item.homeTeam?.trim() || !item.awayTeam?.trim() || !item.localDate || !item.localTime || !item.timezone?.trim()) {
        throw new Error("Faltan columnas obligatorias.");
      }
      const ref = item.matchId ? db.doc(`matches/${item.matchId}`) : db.doc(`matches/manual-2026-${item.matchNumber}`);
      const kickoffDate = zonedLocalToUtc(item.localDate, item.localTime, item.timezone);
      const payload = {
        provider: "manual",
        providerMatchId: ref.id,
        matchNumber: Number(item.matchNumber),
        phase: item.phase?.trim() || "Mundial 2026",
        fifaGroup: item.fifaGroup?.trim() || null,
        homeTeam: item.homeTeam.trim(),
        awayTeam: item.awayTeam.trim(),
        kickoffAt: Timestamp.fromDate(kickoffDate),
        timezone: item.timezone.trim(),
        sourceTimezone: item.timezone.trim(),
        sourceLocalDate: item.localDate,
        sourceLocalTime: item.localTime,
        displayTimeMode: "cdmx",
        venue: item.venue?.trim() || null,
        city: item.city?.trim() || null,
        country: item.country?.trim() || null,
        sourceName: input.sourceName?.trim() || item.sourceName?.trim() || "FIFA schedule manual",
        sourceUrl: input.sourceUrl?.trim() || item.sourceUrl?.trim() || null,
        status: item.status ?? "scheduled",
        rawProviderStatus: "manual bulk",
        updatedAt: FieldValue.serverTimestamp(),
        lastSyncedAt: FieldValue.serverTimestamp()
      };
      batch.set(ref, payload, { merge: true });
      imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, message: error instanceof Error ? error.message : "Fila inválida." });
    }
  }

  if (errors.length) {
    await writeAuditLog({
      actorUid: request.auth.uid,
      action: "bulkUpsertManualMatchesRejected",
      entityType: "match",
      entityId: "bulk",
      after: { errors }
    });
    throw new HttpsError("invalid-argument", "Hay errores en el CSV.", { errors });
  }

  batch.set(db.doc("systemConfig/providerStatus"), {
    provider: "manual",
    status: "healthy",
    message: `${imported} fixtures manuales importados`,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "bulkUpsertManualMatches",
    entityType: "match",
    entityId: "bulk",
    after: { imported, sourceName: input.sourceName ?? null, sourceUrl: input.sourceUrl ?? null }
  });
  return { imported, errors: [] };
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
