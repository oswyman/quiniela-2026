import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function writeAuditLog(input: {
  actorUid: string;
  groupId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await getFirestore().collection("auditLogs").add({
    ...input,
    createdAt: FieldValue.serverTimestamp()
  });
}
