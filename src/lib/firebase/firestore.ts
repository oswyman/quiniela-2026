"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./client";
import type { Group, Invite, Match, Member, Prediction, Score, UserProfile } from "@/types";

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function listenMyMemberships(uid: string, callback: (items: Array<Member & { groupId: string }>) => void) {
  return onSnapshot(query(collection(db, "groupMembers"), where("uid", "==", uid)), (snap) => {
    callback(snap.docs.map((item) => item.data() as Member & { groupId: string }));
  });
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

export async function createGroup(input: Omit<Group, "id" | "createdAt" | "createdBy" | "slug" | "status" | "minParticipants" | "prizeRuleMode">, user: UserProfile) {
  const slug = input.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const ref = await addDoc(collection(db, "groups"), {
    ...input,
    slug,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    status: "active",
    minParticipants: 2,
    prizeRuleMode: "DEFAULT"
  });

  const member: Member & { groupId: string } = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    role: "group_admin",
    paymentStatus: "not_applicable",
    joinedAt: serverTimestamp(),
    status: "active",
    groupId: ref.id
  };

  await setDoc(doc(db, "groups", ref.id, "members", user.uid), member);
  await setDoc(doc(db, "groupMembers", `${ref.id}_${user.uid}`), member);
  return ref.id;
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
  const ref = doc(db, "groups", groupId, "predictions", `${uid}_${matchId}`);
  await setDoc(
    ref,
    {
      uid,
      matchId,
      homeGoals,
      awayGoals,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "valid",
      isLate: false,
      points: 0,
      scoringReason: "Pendiente de resultado"
    },
    { merge: true }
  );
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
