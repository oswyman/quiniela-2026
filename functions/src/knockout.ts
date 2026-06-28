import { FieldValue, Firestore } from "firebase-admin/firestore";
import { resolveKnockoutUpdates, type KnockoutMatchLike } from "./knockoutResolution";

export async function resolveKnockoutMatchesInFirestore(db: Firestore) {
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as KnockoutMatchLike);
  const updates = resolveKnockoutUpdates(matches);
  if (!updates.length) return { updated: 0 };

  const batch = db.batch();
  for (const update of updates) {
    batch.set(db.doc(`matches/${update.id}`), {
      resolvedHomeTeam: update.resolvedHomeTeam,
      resolvedAwayTeam: update.resolvedAwayTeam,
      isResolved: update.isResolved,
      isPublishedToParticipants: update.isPublishedToParticipants,
      publishedAt: update.isPublishedToParticipants ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
  return { updated: updates.length };
}
