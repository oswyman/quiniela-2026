import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { writeAuditLog } from "./audit";

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
    legalDisclaimerAccepted: true
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
