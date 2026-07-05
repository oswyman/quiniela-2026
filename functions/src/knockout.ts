import { FieldValue, Firestore } from "firebase-admin/firestore";
import { writeAuditLog } from "./audit";
import { resolveKnockoutUpdates, type KnockoutMatchLike } from "./knockoutResolution";

export async function resolveKnockoutMatchesInFirestore(db: Firestore, actorUid = "system") {
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as KnockoutMatchLike);
  const byId = new Map(matches.map((match) => [match.id, match]));
  const updates = resolveKnockoutUpdates(matches);
  if (!updates.length) return { updated: 0, reseeded: 0 };

  // Si un cruce ya publicado cambia de equipos (p. ej. el admin corrigió el
  // resultado del partido fuente), los pronósticos ya guardados pueden apuntar
  // a un equipo que ya no juega ese cruce. Se deja constancia en auditoría
  // para que el admin revise esos picks.
  const reseeded = updates.filter((update) => {
    const before = byId.get(update.id);
    if (!before?.isPublishedToParticipants) return false;
    return (
      (before.resolvedHomeTeam && before.resolvedHomeTeam !== update.resolvedHomeTeam) ||
      (before.resolvedAwayTeam && before.resolvedAwayTeam !== update.resolvedAwayTeam)
    );
  });

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

  for (const update of reseeded) {
    const before = byId.get(update.id);
    await writeAuditLog({
      actorUid,
      action: "knockoutReseedDetected",
      entityType: "match",
      entityId: update.id,
      before: {
        resolvedHomeTeam: before?.resolvedHomeTeam ?? null,
        resolvedAwayTeam: before?.resolvedAwayTeam ?? null
      },
      after: {
        resolvedHomeTeam: update.resolvedHomeTeam,
        resolvedAwayTeam: update.resolvedAwayTeam,
        warning: "Cruce ya publicado cambió de equipos; revisar pronósticos existentes de este partido."
      }
    });
  }

  return { updated: updates.length, reseeded: reseeded.length };
}
