import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { isAfterTimestamp, resolveRegistrationDeadline } from "./tournament";

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

type InviteInput = {
  groupId?: string;
  inviteeEmail: string;
  displayName?: string;
};

export const createAdminInvite = onCall<InviteInput>(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const inviteeEmail = normalizeEmail(request.data.inviteeEmail);
  if (!inviteeEmail) throw new HttpsError("invalid-argument", "Falta email del administrador.");
  return createInviteRecord({
    actorUid: request.auth.uid,
    inviteeEmail,
    displayName: request.data.displayName,
    role: "group_admin",
    type: "group_admin"
  });
});

export const createParticipantInvite = onCall<InviteInput>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const groupId = String(request.data.groupId ?? "");
  const inviteeEmail = normalizeEmail(request.data.inviteeEmail);
  if (!groupId || !inviteeEmail) throw new HttpsError("invalid-argument", "Falta grupo o email.");
  if (!(await isGroupAdmin(groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes invitar a este grupo.");

  const groupSnap = await getFirestore().doc(`groups/${groupId}`).get();
  const group = groupSnap.data();
  if (!group) throw new HttpsError("not-found", "Grupo no encontrado.");
  const registrationDeadlineAt = await resolveRegistrationDeadline(group);
  if (isAfterTimestamp(registrationDeadlineAt)) {
    await writeAuditLog({
      actorUid: request.auth.uid,
      groupId,
      action: "lateInviteRejected",
      entityType: "invite",
      entityId: inviteeEmail,
      after: { inviteeEmail }
    });
    throw new HttpsError("failed-precondition", "El registro cerró 90 minutos antes del primer partido del Mundial.");
  }

  return createInviteRecord({
    actorUid: request.auth.uid,
    groupId,
    inviteeEmail,
    displayName: request.data.displayName,
    role: "participant",
    type: "participant"
  });
});

export const createInvite = createParticipantInvite;

export const previewInvite = onCall<{ inviteCode: string }>(async (request) => {
  const invite = await findInvite(String(request.data.inviteCode ?? ""));
  if (!invite) throw new HttpsError("not-found", "Invitación no encontrada.");
  return {
    code: invite.data.code,
    inviteeEmail: invite.data.inviteeEmail,
    role: invite.data.role,
    type: invite.data.type,
    groupId: invite.data.groupId ?? null,
    status: invite.data.status,
    expiresAt: invite.data.expiresAt ?? null
  };
});

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const found = await findInvite(String(request.data.inviteCode ?? ""));
  if (!found) throw new HttpsError("not-found", "Invitación no encontrada.");

  const db = getFirestore();
  const inviteData = found.data;
  const authEmail = normalizeEmail(request.auth.token.email);
  if (!authEmail || authEmail !== normalizeEmail(inviteData.inviteeEmail)) {
    throw new HttpsError("permission-denied", "Esta invitación pertenece a otro correo electrónico.");
  }
  if (inviteData.status !== "active") throw new HttpsError("failed-precondition", "Invitación inactiva.");
  if (inviteData.usedCount >= inviteData.maxUses) throw new HttpsError("failed-precondition", "Invitación agotada.");
  if (inviteData.expiresAt?.toMillis && inviteData.expiresAt.toMillis() < Date.now()) throw new HttpsError("failed-precondition", "Invitación expirada.");

  if (inviteData.groupId) {
    const groupSnap = await db.doc(`groups/${inviteData.groupId}`).get();
    const group = groupSnap.data();
    if (!group) throw new HttpsError("not-found", "Grupo no encontrado.");
    const registrationDeadlineAt = await resolveRegistrationDeadline(group);
    if (isAfterTimestamp(registrationDeadlineAt)) {
      await writeAuditLog({
        actorUid: request.auth.uid,
        groupId: inviteData.groupId,
        action: "lateInviteAcceptRejected",
        entityType: "invite",
        entityId: inviteData.code,
        after: { inviteeEmail: inviteData.inviteeEmail }
      });
      throw new HttpsError("failed-precondition", "El registro del grupo ya cerró.");
    }
  }

  const userRef = db.doc(`users/${request.auth.uid}`);
  const uid = request.auth.uid;
  const userSnap = await userRef.get();
  const displayName = userSnap.data()?.displayName ?? request.auth.token.name ?? inviteData.displayName ?? authEmail;
  const roleGlobal = inviteData.type === "group_admin" ? "group_admin" : userSnap.data()?.roleGlobal ?? "user";

  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(found.ref);
    const latestData = latest.data();
    if (!latestData || latestData.usedCount >= latestData.maxUses || latestData.status !== "active") {
      throw new HttpsError("failed-precondition", "Invitación agotada o inactiva.");
    }

    transaction.set(userRef, {
      uid,
      displayName,
      email: authEmail,
      createdAt: userSnap.exists ? userSnap.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      roleGlobal
    }, { merge: true });

    if (inviteData.groupId) {
      const member = {
        uid,
        displayName,
        email: authEmail,
        role: inviteData.role,
        paymentStatus: "pending",
        joinedAt: FieldValue.serverTimestamp(),
        status: "active",
        groupId: inviteData.groupId
      };
      transaction.set(db.doc(`groups/${inviteData.groupId}/members/${uid}`), member);
      transaction.set(db.doc(`groupMembers/${inviteData.groupId}_${uid}`), member);
    }

    transaction.update(found.ref, {
      usedCount: FieldValue.increment(1),
      usedAt: FieldValue.serverTimestamp(),
      usedByUid: uid,
      status: "used"
    });
  });

  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId: inviteData.groupId,
    action: "acceptInvite",
    entityType: "invite",
    entityId: inviteData.code,
    after: { inviteeEmail: inviteData.inviteeEmail, role: inviteData.role, type: inviteData.type }
  });

  return { groupId: inviteData.groupId ?? null, roleGlobal };
});

async function createInviteRecord(input: {
  actorUid: string;
  groupId?: string;
  inviteeEmail: string;
  displayName?: string;
  role: "group_admin" | "participant";
  type: "group_admin" | "participant";
}) {
  const db = getFirestore();
  const inviteCode = code();
  const path = input.groupId ? `groups/${input.groupId}/invites/${inviteCode}` : `adminInvites/${inviteCode}`;
  const invite = {
    code: inviteCode,
    groupId: input.groupId ?? null,
    inviteeEmail: input.inviteeEmail,
    displayName: input.displayName?.trim() ?? "",
    role: input.role,
    type: input.type,
    createdBy: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 14),
    maxUses: 1,
    usedCount: 0,
    status: "active"
  };

  await db.doc(path).set(invite);
  await writeAuditLog({
    actorUid: input.actorUid,
    groupId: input.groupId,
    action: input.type === "group_admin" ? "createAdminInvite" : "createParticipantInvite",
    entityType: "invite",
    entityId: inviteCode,
    after: invite
  });

  return invite;
}

async function findInvite(inviteCode: string) {
  const normalizedCode = inviteCode.toUpperCase();
  if (!normalizedCode) throw new HttpsError("invalid-argument", "Falta inviteCode.");
  const db = getFirestore();
  const adminInvite = await db.doc(`adminInvites/${normalizedCode}`).get();
  if (adminInvite.exists) return { ref: adminInvite.ref, data: adminInvite.data() ?? {} };

  const groups = await db.collection("groups").get();
  for (const group of groups.docs) {
    const snap = await db.doc(`groups/${group.id}/invites/${normalizedCode}`).get();
    if (snap.exists) return { ref: snap.ref, data: snap.data() ?? {} };
  }
  return null;
}

function normalizeEmail(email?: string | null) {
  return String(email ?? "").trim().toLowerCase();
}
