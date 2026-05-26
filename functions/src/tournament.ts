import { getFirestore, Timestamp } from "firebase-admin/firestore";

const DEFAULT_FIRST_KICKOFF = "2026-06-11T19:00:00-06:00";
const DEFAULT_CUTOFF_MINUTES = 90;

export async function getTournamentConfig() {
  const db = getFirestore();
  const configSnap = await db.doc("systemConfig/tournament").get();
  const config = configSnap.data() ?? {};
  const firstMatchSnap = await db.collection("matches").orderBy("kickoffAt", "asc").limit(1).get();
  const firstMatch = firstMatchSnap.docs[0]?.data();
  const firstKickoffAt =
    firstMatch?.kickoffAt ??
    config.firstKickoffAt ??
    Timestamp.fromDate(new Date(DEFAULT_FIRST_KICKOFF));
  const registrationCutoffMinutes = Number(config.registrationCutoffMinutes ?? DEFAULT_CUTOFF_MINUTES);
  const resultsMode = String(config.resultsMode ?? process.env.RESULTS_API_PROVIDER ?? "manual");

  return { firstKickoffAt, registrationCutoffMinutes, resultsMode };
}

export function deadlineFromKickoff(firstKickoffAt: FirebaseFirestore.Timestamp, cutoffMinutes = DEFAULT_CUTOFF_MINUTES) {
  return Timestamp.fromMillis(firstKickoffAt.toMillis() - cutoffMinutes * 60 * 1000);
}

export function isAfterTimestamp(timestamp: FirebaseFirestore.Timestamp, now = Date.now()) {
  return now >= timestamp.toMillis();
}

export async function resolveFirstKickoff(group?: FirebaseFirestore.DocumentData | null) {
  if (group?.firstTournamentKickoffAt?.toMillis) return group.firstTournamentKickoffAt as FirebaseFirestore.Timestamp;
  const tournament = await getTournamentConfig();
  return tournament.firstKickoffAt;
}

export async function resolveRegistrationDeadline(group?: FirebaseFirestore.DocumentData | null) {
  if (group?.registrationDeadlineAt?.toMillis) return group.registrationDeadlineAt as FirebaseFirestore.Timestamp;
  const tournament = await getTournamentConfig();
  const firstKickoffAt = group?.firstTournamentKickoffAt?.toMillis
    ? group.firstTournamentKickoffAt as FirebaseFirestore.Timestamp
    : tournament.firstKickoffAt;
  return deadlineFromKickoff(firstKickoffAt, tournament.registrationCutoffMinutes);
}
