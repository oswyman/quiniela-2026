import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

export async function syncMatchesFromProvider() {
  const db = getFirestore();
  const startedAt = FieldValue.serverTimestamp();
  const logRef = await db.collection("apiSyncLogs").add({
    provider: process.env.RESULTS_API_PROVIDER ?? "mock",
    status: "running",
    startedAt,
    message: "Sincronizacion mock iniciada"
  });

  const mockMatches = [
    {
      id: "mock-mex-can-2026",
      phase: "Grupos",
      fifaGroup: "A",
      homeTeam: "Mexico",
      awayTeam: "Canada",
      kickoffAt: new Date("2026-06-11T19:00:00-06:00"),
      timezone: "America/Mexico_City",
      status: "scheduled",
      updatedAt: FieldValue.serverTimestamp()
    },
    {
      id: "mock-usa-bra-2026",
      phase: "Grupos",
      fifaGroup: "B",
      homeTeam: "USA",
      awayTeam: "Brazil",
      kickoffAt: new Date("2026-06-12T18:00:00-06:00"),
      timezone: "America/Mexico_City",
      status: "scheduled",
      updatedAt: FieldValue.serverTimestamp()
    }
  ];

  const batch = db.batch();
  for (const match of mockMatches) {
    batch.set(db.doc(`matches/${match.id}`), match, { merge: true });
  }
  await batch.commit();
  await logRef.update({
    status: "success",
    finishedAt: FieldValue.serverTimestamp(),
    message: `Fixtures mock sincronizados: ${mockMatches.length}`
  });

  return { updated: mockMatches.length };
}

export const scheduledResultsSync = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Mexico_City"
  },
  async () => {
    if ((process.env.RESULTS_API_PROVIDER ?? "mock") === "disabled") return;
    await syncMatchesFromProvider();
  }
);
