import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";
import { deadlineFromKickoff, getTournamentConfig, isAfterTimestamp, resolveFirstKickoff } from "./tournament";

type CreateGroupInput = {
  name: string;
  currency: string;
  contributionAmount: number;
  moneyResponsibleName: string;
  moneyResponsibleEmail: string;
  validResultMode: "NINETY" | "EXTRA_TIME" | "FINAL_WITH_PENALTIES";
  predictionVisibility: "AFTER_CLOSE" | "BEFORE_CLOSE";
  legalDisclaimerAccepted: boolean;
};

type UpdateGroupInput = Partial<CreateGroupInput> & {
  groupId: string;
  status?: "draft" | "active" | "closed" | "cancelled";
};

type TournamentConfigInput = {
  firstKickoffAt: string;
  registrationCutoffMinutes?: number;
  resultsMode?: "manual" | "api-football" | "mock" | "sportmonks" | "disabled";
};

async function isPlatformAdmin(uid: string) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.roleGlobal === "platform_admin";
}

async function isGroupAdmin(groupId: string, uid: string) {
  const snap = await getFirestore().doc(`groups/${groupId}/members/${uid}`).get();
  return snap.data()?.role === "group_admin" || (await isPlatformAdmin(uid));
}

function canCreateGroups(roleGlobal?: string) {
  return roleGlobal === "platform_admin" || roleGlobal === "group_admin";
}

export const createGroup = onCall<CreateGroupInput>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const input = request.data;

  if (!input.name?.trim()) throw new HttpsError("invalid-argument", "Falta el nombre del grupo.");
  if (!input.legalDisclaimerAccepted) throw new HttpsError("failed-precondition", "Debes aceptar la advertencia legal.");
  if (!input.moneyResponsibleName?.trim() || !input.moneyResponsibleEmail?.trim()) {
    throw new HttpsError("invalid-argument", "Falta el responsable del dinero.");
  }

  const db = getFirestore();
  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  const user = userSnap.data();
  if (!user) throw new HttpsError("failed-precondition", "No se encontró el perfil de usuario.");
  if (!canCreateGroups(user.roleGlobal)) throw new HttpsError("permission-denied", "Solo administradores invitados pueden crear grupos.");

  const tournament = await getTournamentConfig();
  const registrationDeadlineAt = deadlineFromKickoff(tournament.firstKickoffAt, tournament.registrationCutoffMinutes);

  const groupRef = db.collection("groups").doc();
  const slug = input.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const group = {
    name: input.name.trim(),
    slug,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    status: "active",
    currency: input.currency.trim().toUpperCase() || "MXN",
    contributionAmount: Number(input.contributionAmount || 0),
    moneyResponsibleName: input.moneyResponsibleName.trim(),
    moneyResponsibleEmail: input.moneyResponsibleEmail.trim().toLowerCase(),
    validResultMode: input.validResultMode || "NINETY",
    predictionVisibility: input.predictionVisibility || "AFTER_CLOSE",
    minParticipants: 2,
    prizeRuleMode: "DEFAULT",
    legalDisclaimerAccepted: true,
    firstTournamentKickoffAt: tournament.firstKickoffAt,
    registrationDeadlineAt
  };
  const member = {
    uid: request.auth.uid,
    displayName: user.displayName ?? user.email ?? "Administrador",
    email: user.email ?? request.auth.token.email ?? "",
    role: "group_admin",
    paymentStatus: "not_applicable",
    joinedAt: FieldValue.serverTimestamp(),
    status: "active",
    groupId: groupRef.id
  };

  const batch = db.batch();
  batch.set(groupRef, group);
  batch.set(groupRef.collection("members").doc(request.auth.uid), member);
  batch.set(db.doc(`groupMembers/${groupRef.id}_${request.auth.uid}`), member);
  await batch.commit();

  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId: groupRef.id,
    action: "createGroup",
    entityType: "group",
    entityId: groupRef.id,
    after: group
  });

  return { groupId: groupRef.id };
});

export const updateGroup = onCall<UpdateGroupInput>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const input = request.data;
  if (!input.groupId) throw new HttpsError("invalid-argument", "Falta groupId.");
  if (!(await isGroupAdmin(input.groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes editar este grupo.");

  const db = getFirestore();
  const ref = db.doc(`groups/${input.groupId}`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.data();
  if (!before) throw new HttpsError("not-found", "Grupo no encontrado.");
  const firstKickoffAt = await resolveFirstKickoff(before);
  if (isAfterTimestamp(firstKickoffAt)) {
    throw new HttpsError("failed-precondition", "El Mundial ya empezó; solo se permiten cambios no competitivos por soporte.");
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp()
  };
  if (input.name?.trim()) patch.name = input.name.trim();
  if (input.currency?.trim()) patch.currency = input.currency.trim().toUpperCase();
  if (typeof input.contributionAmount === "number") patch.contributionAmount = Number(input.contributionAmount || 0);
  if (input.moneyResponsibleName?.trim()) patch.moneyResponsibleName = input.moneyResponsibleName.trim();
  if (input.moneyResponsibleEmail?.trim()) patch.moneyResponsibleEmail = input.moneyResponsibleEmail.trim().toLowerCase();
  if (input.validResultMode) patch.validResultMode = input.validResultMode;
  if (input.predictionVisibility) patch.predictionVisibility = input.predictionVisibility;
  if (input.status) patch.status = input.status;

  await ref.update(patch);
  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId: input.groupId,
    action: "updateGroup",
    entityType: "group",
    entityId: input.groupId,
    before,
    after: patch
  });
  return { ok: true };
});

export const deleteGroup = onCall<{ groupId: string }>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const groupId = String(request.data.groupId ?? "");
  if (!groupId) throw new HttpsError("invalid-argument", "Falta groupId.");
  if (!(await isGroupAdmin(groupId, request.auth.uid))) throw new HttpsError("permission-denied", "No puedes cancelar este grupo.");

  const db = getFirestore();
  const ref = db.doc(`groups/${groupId}`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.data();
  if (!before) throw new HttpsError("not-found", "Grupo no encontrado.");
  const firstKickoffAt = await resolveFirstKickoff(before);
  if (isAfterTimestamp(firstKickoffAt)) {
    throw new HttpsError("failed-precondition", "No se pueden eliminar grupos una vez iniciado el Mundial.");
  }

  const patch = {
    status: "cancelled",
    cancelledAt: FieldValue.serverTimestamp(),
    deletedAt: FieldValue.serverTimestamp()
  };
  await ref.update(patch);
  await writeAuditLog({
    actorUid: request.auth.uid,
    groupId,
    action: "deleteGroup",
    entityType: "group",
    entityId: groupId,
    before,
    after: patch
  });
  return { ok: true };
});

export const updateTournamentConfig = onCall<TournamentConfigInput>(async (request) => {
  if (!request.auth || !(await isPlatformAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Solo platform_admin.");
  const firstKickoffDate = new Date(request.data.firstKickoffAt);
  if (Number.isNaN(firstKickoffDate.getTime())) throw new HttpsError("invalid-argument", "Fecha de primer partido inválida.");

  const patch = {
    firstKickoffAt: firstKickoffDate,
    registrationCutoffMinutes: Number(request.data.registrationCutoffMinutes ?? 90),
    resultsMode: request.data.resultsMode ?? "manual",
    updatedAt: FieldValue.serverTimestamp()
  };

  const db = getFirestore();
  const ref = db.doc("systemConfig/tournament");
  const before = (await ref.get()).data() ?? null;
  await ref.set(patch, { merge: true });
  await writeAuditLog({
    actorUid: request.auth.uid,
    action: "updateTournamentConfig",
    entityType: "systemConfig",
    entityId: "tournament",
    before,
    after: patch
  });
  return { ok: true };
});
