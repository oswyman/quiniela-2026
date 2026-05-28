"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./client";
import type { Group, Invite, Match, Member, Prediction, PredictionPickType, ProviderStatus, RoundOf32Assignment, Score, TeamStanding, TournamentConfig, UserProfile } from "@/types";

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function listenMyMemberships(uid: string, callback: (items: Array<Member & { groupId: string }>) => void) {
  return onSnapshot(query(collection(db, "groupMembers"), where("uid", "==", uid)), (snap) => {
    callback(snap.docs.map((item) => item.data() as Member & { groupId: string }));
  });
}

export function listenCollection<T>(path: string, callback: (items: T[]) => void, sortField?: string, direction: "asc" | "desc" = "asc") {
  const ref = collection(db, path);
  const q = sortField ? query(ref, orderBy(sortField, direction)) : query(ref);
  return onSnapshot(q, (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as T)));
}

export async function listMyGroups(uid: string) {
  const memberships = await getDocs(query(collection(db, "groupMembers"), where("uid", "==", uid)));
  const groups = await Promise.all(
    memberships.docs.map(async (membership) => {
      const data = membership.data() as Member & { groupId: string };
      const groupSnap = await getDoc(doc(db, "groups", data.groupId));
      return groupSnap.exists() ? ({ id: groupSnap.id, ...groupSnap.data(), memberRole: data.role } as Group & { memberRole: string }) : null;
    })
  );
  return groups.filter(Boolean) as Array<Group & { memberRole: string }>;
}

export async function createGroup(input: Omit<Group, "id" | "createdAt" | "createdBy" | "slug" | "status" | "minParticipants" | "prizeRuleMode">) {
  const callable = httpsCallable<typeof input, { groupId: string }>(functions, "createGroup");
  const result = await callable(input);
  return result.data.groupId;
}

export async function updateGroup(groupId: string, input: Partial<Group>) {
  const callable = httpsCallable<Partial<Group> & { groupId: string }, { ok: boolean }>(functions, "updateGroup");
  return callable({ ...input, groupId });
}

export async function deleteGroup(groupId: string) {
  const callable = httpsCallable<{ groupId: string }, { ok: boolean }>(functions, "deleteGroup");
  return callable({ groupId });
}

export async function getGroup(groupId: string) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export async function getMyMember(groupId: string, uid: string) {
  const snap = await getDoc(doc(db, "groups", groupId, "members", uid));
  return snap.exists() ? (snap.data() as Member) : null;
}

export async function listMembers(groupId: string) {
  const snap = await getDocs(query(collection(db, "groups", groupId, "members"), orderBy("joinedAt", "asc")));
  return snap.docs.map((item) => item.data() as Member);
}

export async function listMatches() {
  const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoffAt", "asc"), limit(120)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Match);
}

export async function listRecentResults(count = 6) {
  // No orderBy to avoid requiring a composite index while it builds.
  // Sort client-side instead.
  const snap = await getDocs(
    query(collection(db, "matches"), where("status", "==", "finished"), limit(50))
  );
  const all = snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Match);
  all.sort((a, b) => {
    const ta = toTimestampMillis(a.kickoffAt);
    const tb = toTimestampMillis(b.kickoffAt);
    return tb - ta;
  });
  return all.slice(0, count);
}

function toTimestampMillis(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "object" && val !== null && "toMillis" in val) return (val as { toMillis(): number }).toMillis();
  if (typeof val === "string" || typeof val === "number") return new Date(val).getTime();
  return 0;
}

export async function listAllGroups() {
  const snap = await getDocs(query(collection(db, "groups"), limit(100)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Group);
}

export async function listAllUsers() {
  const snap = await getDocs(query(collection(db, "users"), limit(100)));
  return snap.docs.map((item) => item.data() as UserProfile);
}

export async function listPredictions(groupId: string) {
  const snap = await getDocs(collection(db, "groups", groupId, "predictions"));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Prediction);
}

// Errores transitorios que ameritan un reintento (cold start, token refresh, red)
const TRANSIENT_FUNCTION_CODES = new Set([
  "functions/unavailable",
  "functions/internal",
  "functions/deadline-exceeded",
  "functions/unknown",
]);

export async function savePrediction(groupId: string, matchId: string, pickType: PredictionPickType, pick: string) {
  const callable = httpsCallable<{ groupId: string; matchId: string; pickType: PredictionPickType; pick: string }, { predictionId: string }>(functions, "submitPrediction");
  try {
    await callable({ groupId, matchId, pickType, pick });
  } catch (err) {
    // Si es un error de lógica (permission-denied, invalid-argument, etc.) lo lanzamos de inmediato
    const code = (err as { code?: string })?.code ?? "";
    if (!TRANSIENT_FUNCTION_CODES.has(code)) throw err;
    // Cold start o problema de red — esperar 900 ms y reintentar una vez
    await new Promise((resolve) => setTimeout(resolve, 900));
    await callable({ groupId, matchId, pickType, pick });
  }
}

export async function listScores(groupId: string) {
  const snap = await getDocs(query(collection(db, "groups", groupId, "scores"), orderBy("totalPoints", "desc")));
  return snap.docs.map((item) => item.data() as Score);
}

export async function listPrizes(groupId: string) {
  const snap = await getDocs(collection(db, "groups", groupId, "prizes"));
  return snap.docs.map((item) => item.data());
}

export async function updatePaymentStatus(groupId: string, uid: string, paymentStatus: Member["paymentStatus"]) {
  await updateDoc(doc(db, "groups", groupId, "members", uid), { paymentStatus });
  await updateDoc(doc(db, "groupMembers", `${groupId}_${uid}`), { paymentStatus });
}

export async function createParticipantInvite(groupId: string, inviteeEmail: string, displayName?: string) {
  const callable = httpsCallable<{ groupId: string; inviteeEmail: string; displayName?: string }, Invite>(functions, "createParticipantInvite");
  return callable({ groupId, inviteeEmail, displayName });
}

export async function createInvite(groupId: string, inviteeEmail: string, displayName?: string) {
  return createParticipantInvite(groupId, inviteeEmail, displayName);
}

export async function createOpenInvite(groupId: string) {
  const callable = httpsCallable<{ groupId: string }, Invite>(functions, "createOpenInvite");
  return callable({ groupId });
}

export async function listOpenInvites(groupId: string) {
  const snap = await getDocs(
    query(collection(db, "groups", groupId, "invites"), where("type", "==", "open"), where("status", "==", "active"))
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as unknown as Invite));
}

export async function revokeOpenInvite(groupId: string, inviteCode: string) {
  const callable = httpsCallable<{ groupId: string; inviteCode: string }, { ok: boolean }>(functions, "revokeOpenInvite");
  return callable({ groupId, inviteCode });
}

export async function createAdminInvite(inviteeEmail: string, displayName?: string) {
  const callable = httpsCallable<{ inviteeEmail: string; displayName?: string }, Invite>(functions, "createAdminInvite");
  return callable({ inviteeEmail, displayName });
}

export async function previewInvite(inviteCode: string) {
  const callable = httpsCallable<{ inviteCode: string }, Invite>(functions, "previewInvite");
  return callable({ inviteCode });
}

export async function acceptInvite(inviteCode: string) {
  const callable = httpsCallable<{ inviteCode: string }, { groupId: string | null; roleGlobal: string }>(functions, "acceptInvite");
  return callable({ inviteCode });
}

export async function recalculateGroupScores(groupId: string) {
  const callable = httpsCallable<{ groupId: string }, { ok: boolean }>(functions, "recalculateGroupScores");
  return callable({ groupId });
}

export async function syncFixturesFromProvider() {
  const callable = httpsCallable<Record<string, never>, { updated: number }>(functions, "syncFixturesFromProvider");
  return callable({});
}

export async function syncLiveResultsFromProvider() {
  const callable = httpsCallable<Record<string, never>, { updated: number }>(functions, "syncLiveResultsFromProvider");
  return callable({});
}

export async function upsertManualMatch(input: Record<string, unknown> & { kickoffAt: string }) {
  const callable = httpsCallable<typeof input, { matchId: string }>(functions, "upsertManualMatch");
  return callable(input);
}

export async function bulkUpsertManualMatches(input: {
  matches: Array<Record<string, unknown>>;
  sourceName?: string;
  sourceUrl?: string;
}) {
  const callable = httpsCallable<typeof input, { imported: number; errors: Array<{ row: number; message: string }> }>(functions, "bulkUpsertManualMatches");
  return callable(input);
}

export async function upsertManualResult(input: Partial<Match> & { matchId: string }) {
  const callable = httpsCallable<typeof input, { ok: boolean }>(functions, "upsertManualResult");
  return callable(input);
}

export async function resolveKnockoutMatches() {
  const callable = httpsCallable<Record<string, never>, { updated: number }>(functions, "resolveKnockoutMatches");
  return callable({});
}

export async function calculateGroupStandings() {
  const callable = httpsCallable<Record<string, never>, { groups: Record<string, TeamStanding[]>; bestThirds: TeamStanding[]; needsReview: boolean; reviewReasons: string[] }>(functions, "calculateGroupStandings");
  return callable({});
}

export async function previewRoundOf32Resolution() {
  const callable = httpsCallable<Record<string, never>, { standings: { groups: Record<string, TeamStanding[]>; bestThirds: TeamStanding[]; needsReview: boolean; reviewReasons: string[] }; assignments: RoundOf32Assignment[] }>(functions, "previewRoundOf32Resolution");
  return callable({});
}

export async function confirmRoundOf32Resolution() {
  const callable = httpsCallable<Record<string, never>, { updated: number; knockoutResolved: number }>(functions, "confirmRoundOf32Resolution");
  return callable({});
}

export async function migrateLegacyScorePredictions() {
  const callable = httpsCallable<Record<string, never>, { migrated: number; skipped: number }>(functions, "migrateLegacyScorePredictions");
  return callable({});
}

export async function getProviderStatus() {
  const snap = await getDoc(doc(db, "systemConfig", "providerStatus"));
  return snap.exists() ? (snap.data() as ProviderStatus) : null;
}

export async function getTournamentConfig() {
  const snap = await getDoc(doc(db, "systemConfig", "tournament"));
  return snap.exists() ? (snap.data() as TournamentConfig) : null;
}

export async function updateTournamentConfig(input: {
  firstKickoffAt: string;
  registrationCutoffMinutes?: number;
  resultsMode?: TournamentConfig["resultsMode"] | "disabled";
}) {
  const callable = httpsCallable<typeof input, { ok: boolean }>(functions, "updateTournamentConfig");
  return callable(input);
}
