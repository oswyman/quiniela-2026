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
import type { Group, Invite, Match, Member, Prediction, ProviderStatus, Score, UserProfile } from "@/types";

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
  const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoffAt", "asc"), limit(80)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Match);
}

export async function listPredictions(groupId: string) {
  const snap = await getDocs(collection(db, "groups", groupId, "predictions"));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Prediction);
}

export async function savePrediction(groupId: string, uid: string, matchId: string, homeGoals: number, awayGoals: number) {
  const callable = httpsCallable<{ groupId: string; matchId: string; homeGoals: number; awayGoals: number }, { predictionId: string }>(functions, "submitPrediction");
  await callable({ groupId, matchId, homeGoals, awayGoals });
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

export async function createInvite(groupId: string) {
  const callable = httpsCallable<{ groupId: string }, Invite>(functions, "createInvite");
  return callable({ groupId });
}

export async function acceptInvite(inviteCode: string) {
  const callable = httpsCallable<{ inviteCode: string }, { groupId: string }>(functions, "acceptInvite");
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

export async function getProviderStatus() {
  const snap = await getDoc(doc(db, "systemConfig", "providerStatus"));
  return snap.exists() ? (snap.data() as ProviderStatus) : null;
}
