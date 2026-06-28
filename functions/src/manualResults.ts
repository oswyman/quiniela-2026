import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { resolveKnockoutMatchesInFirestore } from "./knockout";
import { getRoundOf32Readiness } from "./roundOf32";
import { buildRoundOf32Assignments, calculateStandings } from "./standings";
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
  referenceUrl?: string;
  notes?: string;
  homeSeedLabel?: string;
  awaySeedLabel?: string;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeSourceOutcome?: "winner" | "loser" | null;
  awaySourceOutcome?: "winner" | "loser" | null;
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

export const calculateGroupStandings = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const db = getFirestore();
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseFirestore.DocumentData & { id: string }));
  return calculateStandings(matches as never);
});

export const previewRoundOf32Resolution = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const db = getFirestore();
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseFirestore.DocumentData & { id: string }));
  const standings = calculateStandings(matches as never);
  const assignments = buildRoundOf32Assignments(matches as never, standings);
  return {
    standings,
    assignments,
    readiness: getRoundOf32Readiness(matches, standings, assignments)
  };
});

export const confirmRoundOf32Resolution = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const db = getFirestore();
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseFirestore.DocumentData & { id: string }));
  const standings = calculateStandings(matches as never);
  const assignments = buildRoundOf32Assignments(matches as never, standings);
  const readiness = getRoundOf32Readiness(matches, standings, assignments);
  if (readiness.pendingGroupMatches.length || readiness.groupMatchesTotal < 72) {
    throw new HttpsError("failed-precondition", "Termina de capturar la fase de grupos antes de confirmar la ronda de 32.", { readiness });
  }
  const unresolved = assignments.filter((item) => item.needsReview || !item.homeTeam || !item.awayTeam);
  if (unresolved.length) {
    throw new HttpsError("failed-precondition", "La propuesta requiere revisión manual antes de confirmarse.", { unresolved, reviewReasons: standings.reviewReasons });
  }
  const batch = db.batch();
  for (const assignment of assignments) {
    batch.set(db.doc(`matches/${assignment.matchId}`), {
      resolvedHomeTeam: assignment.homeTeam,
      resolvedAwayTeam: assignment.awayTeam,
      isResolved: true,
      isPublishedToParticipants: true,
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: request.auth.uid,
      groupStandingsImpact: {
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedBy: request.auth.uid,
        homeSeedLabel: assignment.homeSeedLabel,
        awaySeedLabel: assignment.awaySeedLabel
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
  const knockout = await resolveKnockoutMatchesInFirestore(db);
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "confirmRoundOf32Resolution",
    entityType: "match",
    entityId: "round-of-32",
    after: { assignments, knockoutResolved: knockout.updated }
  });
  return { updated: assignments.length, knockoutResolved: knockout.updated };
});

export const resolveKnockoutMatches = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const result = await resolveKnockoutMatchesInFirestore(getFirestore());
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "resolveKnockoutMatches",
    entityType: "match",
    entityId: "knockout",
    after: result
  });
  return result;
});

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
    referenceUrl: input.referenceUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    homeSeedLabel: input.homeSeedLabel?.trim() || null,
    awaySeedLabel: input.awaySeedLabel?.trim() || null,
    homeSourceMatchNumber: nullableNumber(input.homeSourceMatchNumber),
    awaySourceMatchNumber: nullableNumber(input.awaySourceMatchNumber),
    homeSourceOutcome: input.homeSourceOutcome ?? null,
    awaySourceOutcome: input.awaySourceOutcome ?? null,
    resolvedHomeTeam: input.homeSeedLabel ? null : input.homeTeam.trim(),
    resolvedAwayTeam: input.awaySeedLabel ? null : input.awayTeam.trim(),
    isResolved: !input.homeSeedLabel && !input.awaySeedLabel,
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
        referenceUrl: item.referenceUrl?.trim() || null,
        notes: item.notes?.trim() || null,
        homeSeedLabel: item.homeSeedLabel?.trim() || null,
        awaySeedLabel: item.awaySeedLabel?.trim() || null,
        homeSourceMatchNumber: nullableNumber(item.homeSourceMatchNumber),
        awaySourceMatchNumber: nullableNumber(item.awaySourceMatchNumber),
        homeSourceOutcome: item.homeSourceOutcome ?? null,
        awaySourceOutcome: item.awaySourceOutcome ?? null,
        resolvedHomeTeam: item.homeSeedLabel ? null : item.homeTeam.trim(),
        resolvedAwayTeam: item.awaySeedLabel ? null : item.awayTeam.trim(),
        isResolved: !item.homeSeedLabel && !item.awaySeedLabel,
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
  const isGroupStage = Boolean(before.fifaGroup) || Number(before.matchNumber ?? 0) <= 72;
  const isKnockout = !isGroupStage;
  const homeGoals90 = nullableNumber(input.homeGoals90);
  const awayGoals90 = nullableNumber(input.awayGoals90);
  if (homeGoals90 === null || awayGoals90 === null) {
    throw new HttpsError("invalid-argument", "Captura marcador a 90 minutos.");
  }
  const homeGoalsExtraTime = isGroupStage ? null : nullableNumber(input.homeGoalsExtraTime);
  const awayGoalsExtraTime = isGroupStage ? null : nullableNumber(input.awayGoalsExtraTime);
  const homePenaltyGoals = isGroupStage ? null : nullableNumber(input.homePenaltyGoals);
  const awayPenaltyGoals = isGroupStage ? null : nullableNumber(input.awayPenaltyGoals);
  const finalHomeGoals = inferFinalGoals(homeGoals90, homeGoalsExtraTime, homePenaltyGoals);
  const finalAwayGoals = inferFinalGoals(awayGoals90, awayGoalsExtraTime, awayPenaltyGoals);
  const hasPenaltyWinner = homePenaltyGoals !== null && awayPenaltyGoals !== null && homePenaltyGoals !== awayPenaltyGoals;
  const nextStatus = input.status ?? "finished";
  if (isKnockout && nextStatus === "finished" && finalHomeGoals === finalAwayGoals && !input.winnerTeam && !hasPenaltyWinner) {
    throw new HttpsError("failed-precondition", "En eliminación directa debes capturar penales o ganador oficial si el marcador queda empatado.");
  }
  const patch = {
    status: nextStatus,
    homeGoals90,
    awayGoals90,
    homeGoalsExtraTime,
    awayGoalsExtraTime,
    homePenaltyGoals,
    awayPenaltyGoals,
    finalHomeGoals: nullableNumber(input.finalHomeGoals) ?? finalHomeGoals,
    finalAwayGoals: nullableNumber(input.finalAwayGoals) ?? finalAwayGoals,
    // winnerTeam solo aplica a eliminación directa ("equipo que avanza");
    // en fase de grupos el resultado canónico son los goles a 90 min.
    winnerTeam: isGroupStage ? null : input.winnerTeam || inferWinnerTeam(before, { ...input, finalHomeGoals: nullableNumber(input.finalHomeGoals) ?? finalHomeGoals, finalAwayGoals: nullableNumber(input.finalAwayGoals) ?? finalAwayGoals }),
    provider: "manual",
    resultSource: "manual",
    resultUpdatedBy: request.auth.uid,
    resultLockedAt: FieldValue.serverTimestamp(),
    rawProviderStatus: "manual result",
    updatedAt: FieldValue.serverTimestamp(),
    lastSyncedAt: FieldValue.serverTimestamp()
  };

  await ref.set(patch, { merge: true });
  const resolved = await resolveKnockoutMatchesInFirestore(db);
  const matchesSnap = await db.collection("matches").get();
  const matches = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseFirestore.DocumentData & { id: string }));
  const standings = calculateStandings(matches as never);
  const assignments = buildRoundOf32Assignments(matches as never, standings);
  const roundOf32 = getRoundOf32Readiness(matches, standings, assignments);
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "upsertManualResult",
    entityType: "match",
    entityId: input.matchId,
    before,
    after: { ...patch, knockoutResolved: resolved.updated, roundOf32 }
  });
  return { ok: true, knockoutResolved: resolved.updated, roundOf32 };
});

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function inferWinnerTeam(match: FirebaseFirestore.DocumentData, input: ManualResultInput) {
  const homeGoals = nullableNumber(input.finalHomeGoals ?? input.homeGoals90);
  const awayGoals = nullableNumber(input.finalAwayGoals ?? input.awayGoals90);
  if (homeGoals === null || awayGoals === null || homeGoals === awayGoals) return null;
  const home = match.resolvedHomeTeam || match.homeTeam;
  const away = match.resolvedAwayTeam || match.awayTeam;
  return homeGoals > awayGoals ? home : away;
}

function inferFinalGoals(goals90: number | null, goalsExtra: number | null, penalties: number | null) {
  if (goalsExtra !== null && penalties !== null) return goalsExtra + penalties;
  if (goalsExtra !== null) return goalsExtra;
  return goals90;
}
