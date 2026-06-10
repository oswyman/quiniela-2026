import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { calculatePrizeAllocations, ScoreRow } from "./prizes";
import { calculatePredictionScore, legacyPredictionToPick } from "./scoring";
import { acceptInvite, createAdminInvite, createInvite, createOpenInvite, createParticipantInvite, previewInvite, revokeOpenInvite } from "./invites";
import { createGroup, deleteGroup, updateGroup, updateMemberRole, updatePaymentStatus, updateTournamentConfig } from "./groups";
import { bulkUpsertManualMatches, calculateGroupStandings, confirmRoundOf32Resolution, previewRoundOf32Resolution, resolveKnockoutMatches, upsertManualMatch, upsertManualResult } from "./manualResults";
import { migrateLegacyScorePredictions, submitPrediction } from "./predictions";
import {
  scheduledFixturesSync,
  scheduledLiveResultsSync,
  syncFixturesFromProvider as runFixturesSync,
  syncLiveResultsFromProvider as runLiveSync
} from "./resultsSync";

initializeApp();

export {
  acceptInvite,
  bulkUpsertManualMatches,
  calculateGroupStandings,
  confirmRoundOf32Resolution,
  createAdminInvite,
  createGroup,
  createInvite,
  createOpenInvite,
  createParticipantInvite,
  deleteGroup,
  migrateLegacyScorePredictions,
  previewInvite,
  previewRoundOf32Resolution,
  revokeOpenInvite,
  resolveKnockoutMatches,
  scheduledFixturesSync,
  scheduledLiveResultsSync,
  submitPrediction,
  updateGroup,
  updateMemberRole,
  updatePaymentStatus,
  updateTournamentConfig,
  upsertManualMatch,
  upsertManualResult
};

async function isPlatformAdmin(uid: string) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.roleGlobal === "platform_admin";
}

async function isGroupAdmin(groupId: string, uid: string) {
  const snap = await getFirestore().doc(`groups/${groupId}/members/${uid}`).get();
  return snap.data()?.role === "group_admin" || (await isPlatformAdmin(uid));
}

export const recalculateGroupScores = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const groupId = String(request.data.groupId ?? "");
  if (!groupId) throw new HttpsError("invalid-argument", "Falta groupId.");
  if (!(await isGroupAdmin(groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes recalcular este grupo.");

  await updateGroupRankingInternal(groupId, request.auth.uid);
  return { ok: true };
});

export const updateGroupRanking = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const groupId = String(request.data.groupId ?? "");
  if (!(await isGroupAdmin(groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes actualizar ranking.");
  await updateGroupRankingInternal(groupId, request.auth.uid);
  return { ok: true };
});

export const syncFixturesFromProvider = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  return runFixturesSync();
});

export const syncLiveResultsFromProvider = onCall(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  return runLiveSync();
});

export const syncApiFootballFixtures = syncFixturesFromProvider;
export const syncApiFootballResults = syncLiveResultsFromProvider;

async function updateGroupRankingInternal(groupId: string, actorUid: string) {
  const db = getFirestore();
  const groupSnap = await db.doc(`groups/${groupId}`).get();
  const group = groupSnap.data();
  if (!group) throw new HttpsError("not-found", "Grupo no encontrado.");

  const [membersSnap, predictionsSnap, matchesSnap] = await Promise.all([
    db.collection(`groups/${groupId}/members`).where("status", "==", "active").get(),
    db.collection(`groups/${groupId}/predictions`).get(),
    db.collection("matches").get()
  ]);

  const matches = new Map(matchesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const scores = new Map<string, ScoreRow & { validPredictions: number; latePredictions: number }>();
  for (const member of membersSnap.docs) {
    const data = member.data();
    scores.set(member.id, {
      uid: member.id,
      displayName: data.displayName,
      totalPoints: 0,
      totalCorrect: 0,
      correctGroupPicks: 0,
      correctAdvancingPicks: 0,
      exactScores: 0,
      correctWinners: 0,
      correctDraws: 0,
      correctGoalDifferences: 0,
      validPredictions: 0,
      latePredictions: 0
    });
  }

  const batch = db.batch();
  for (const predictionDoc of predictionsSnap.docs) {
    const prediction = predictionDoc.data();
    const match = matches.get(prediction.matchId);
    const score = scores.get(prediction.uid);
    if (!match || !score) continue;
    const normalizedPrediction = prediction.pick
      ? prediction
      : { ...prediction, pickType: "GROUP_OUTCOME", pick: legacyPredictionToPick(prediction as { homeGoals?: number; awayGoals?: number }) ?? "" };
    const scored = calculatePredictionScore(normalizedPrediction, match as never);
    score.totalPoints += scored.totalCorrect;
    score.totalCorrect = (score.totalCorrect ?? 0) + scored.totalCorrect;
    score.correctGroupPicks = (score.correctGroupPicks ?? 0) + scored.correctGroupPicks;
    score.correctAdvancingPicks = (score.correctAdvancingPicks ?? 0) + scored.correctAdvancingPicks;
    score.validPredictions += scored.validPredictions;
    score.latePredictions += scored.latePredictions;
    batch.update(predictionDoc.ref, {
      pickType: normalizedPrediction.pickType,
      pick: normalizedPrediction.pick,
      points: scored.points,
      totalCorrect: scored.totalCorrect,
      isCorrect: scored.isCorrect,
      scoringReason: scored.scoringReason,
      status: prediction.isLate ? "late" : "valid",
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  for (const score of scores.values()) {
    batch.set(db.doc(`groups/${groupId}/scores/${score.uid}`), { ...score, updatedAt: FieldValue.serverTimestamp() });
  }

  const prizes = calculatePrizeAllocations([...scores.values()], Number(group.contributionAmount ?? 0));
  for (const prize of prizes) {
    batch.set(db.doc(`groups/${groupId}/prizes/${prize.uid}`), { ...prize, updatedAt: FieldValue.serverTimestamp() });
  }

  await batch.commit();
  await writeAuditLog({
    actorUid,
    groupId,
    action: "recalculateGroupScores",
    entityType: "group",
    entityId: groupId,
    after: { scores: scores.size, prizes: prizes.length }
  });
}
