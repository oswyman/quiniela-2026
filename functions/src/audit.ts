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
  const doc: Record<string, unknown> = {
    actorUid: input.actorUid,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    createdAt: FieldValue.serverTimestamp()
  };
  if (input.groupId !== undefined) doc.groupId = input.groupId;
  if (input.before !== undefined) doc.before = input.before;
  if (input.after !== undefined) doc.after = input.after;
  await getFirestore().collection("auditLogs").add(doc);
}
