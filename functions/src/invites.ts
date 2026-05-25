import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";

function code() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function isPlatformAdmin(uid: string) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.roleGlobal === "platform_admin";
}

async function isGroupAdmin(groupId: string, uid: string) {
  const snap = await getFirestore().doc(`groups/${groupId}/members/${uid}`).get();
  return snap.data()?.role === "group_admin" || (await isPlatformAdmin(uid));
}

export const createInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const groupId = String(request.data.groupId ?? "");
  if (!groupId) throw new HttpsError("invalid-argument", "Falta groupId.");
  if (!(await isGroupAdmin(groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes crear invitaciones.");

  const inviteCode = code();
  const invite = {
    code: inviteCode,
    groupId,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 14),
    maxUses: 100,
    usedCount: 0,
    status: "active"
  };

  await getFirestore().doc(`groups/${groupId}/invites/${inviteCode}`).set(invite);
  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId,
    action: "createInvite",
    entityType: "invite",
    entityId: inviteCode,
    after: invite
  });

  return invite;
});

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const inviteCode = String(request.data.inviteCode ?? "").toUpperCase();
  if (!inviteCode) throw new HttpsError("invalid-argument", "Falta inviteCode.");

  const db = getFirestore();
  const groups = await db.collection("groups").get();
  let inviteRef: FirebaseFirestore.DocumentReference | null = null;
  let inviteData: FirebaseFirestore.DocumentData | null = null;

  for (const group of groups.docs) {
    const snap = await db.doc(`groups/${group.id}/invites/${inviteCode}`).get();
    if (snap.exists) {
      inviteRef = snap.ref;
      inviteData = snap.data() ?? null;
      break;
    }
  }

  if (!inviteRef || !inviteData) throw new HttpsError("not-found", "Invitación no encontrada.");
  if (inviteData.status !== "active") throw new HttpsError("failed-precondition", "Invitación inactiva.");
  if (inviteData.usedCount >= inviteData.maxUses) throw new HttpsError("failed-precondition", "Invitación agotada.");
  if (inviteData.expiresAt?.toMillis && inviteData.expiresAt.toMillis() < Date.now()) throw new HttpsError("failed-precondition", "Invitación expirada.");

  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  const user = userSnap.data();
  if (!user) throw new HttpsError("failed-precondition", "Perfil de usuario no encontrado.");

  const member = {
    uid: request.auth.uid,
    displayName: user.displayName ?? request.auth.token.name ?? user.email,
    email: user.email ?? request.auth.token.email,
    role: "participant",
    paymentStatus: "pending",
    joinedAt: FieldValue.serverTimestamp(),
    status: "active",
    groupId: inviteData.groupId
  };

  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(inviteRef as FirebaseFirestore.DocumentReference);
    const latestData = latest.data();
    if (!latestData || latestData.usedCount >= latestData.maxUses) {
      throw new HttpsError("failed-precondition", "Invitación agotada.");
    }
    transaction.set(db.doc(`groups/${inviteData?.groupId}/members/${request.auth?.uid}`), member);
    transaction.set(db.doc(`groupMembers/${inviteData?.groupId}_${request.auth?.uid}`), member);
    transaction.update(inviteRef as FirebaseFirestore.DocumentReference, { usedCount: FieldValue.increment(1) });
  });

  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId: inviteData.groupId,
    action: "acceptInvite",
    entityType: "member",
    entityId: request.auth.uid,
    after: member
  });

  return { groupId: inviteData.groupId };
});
