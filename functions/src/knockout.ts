import { FieldValue, Firestore } from "firebase-admin/firestore";

export type SourceOutcome = "winner" | "loser";

type MatchDoc = {
  id: string;
  matchNumber?: number | null;
  homeTeam: string;
  awayTeam: string;
  resolvedHomeTeam?: string | null;
  resolvedAwayTeam?: string | null;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeSourceOutcome?: SourceOutcome | null;
  awaySourceOutcome?: SourceOutcome | null;
  finalHomeGoals?: number | null;
  finalAwayGoals?: number | null;
  homeGoals90?: number | null;
  awayGoals90?: number | null;
  winnerTeam?: string | null;
};

export type KnockoutUpdate = {
  id: string;
  resolvedHomeTeam: string | null;
  resolvedAwayTeam: string | null;
  isResolved: boolean;
};

export function resolveKnockoutUpdates(matches: MatchDoc[]): KnockoutUpdate[] {
  const byNumber = new Map<number, MatchDoc>();
  for (const match of matches) {
    if (typeof match.matchNumber === "number") byNumber.set(match.matchNumber, match);
  }

  const updates: KnockoutUpdate[] = [];
  for (const match of matches) {
    const hasHomeSource = typeof match.homeSourceMatchNumber === "number" && !!match.homeSourceOutcome;
    const hasAwaySource = typeof match.awaySourceMatchNumber === "number" && !!match.awaySourceOutcome;
    if (!hasHomeSource && !hasAwaySource) continue;

    const resolvedHomeTeam = hasHomeSource
      ? resolveTeam(byNumber.get(match.homeSourceMatchNumber as number), match.homeSourceOutcome as SourceOutcome)
      : match.resolvedHomeTeam ?? null;
    const resolvedAwayTeam = hasAwaySource
      ? resolveTeam(byNumber.get(match.awaySourceMatchNumber as number), match.awaySourceOutcome as SourceOutcome)
      : match.resolvedAwayTeam ?? null;
    const isResolved = (!hasHomeSource || !!resolvedHomeTeam) && (!hasAwaySource || !!resolvedAwayTeam);

    if (
      (match.resolvedHomeTeam ?? null) !== resolvedHomeTeam ||
      (match.resolvedAwayTeam ?? null) !== resolvedAwayTeam ||
      Boolean((match as { isResolved?: boolean }).isResolved) !== isResolved
    ) {
      updates.push({ id: match.id, resolvedHomeTeam, resolvedAwayTeam, isResolved });
    }
  }

  return updates;
}

export async function resolveKnockoutMatchesInFirestore(db: Firestore) {
  const snap = await db.collection("matches").get();
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MatchDoc);
  const updates = resolveKnockoutUpdates(matches);
  if (!updates.length) return { updated: 0 };

  const batch = db.batch();
  for (const update of updates) {
    batch.set(db.doc(`matches/${update.id}`), {
      resolvedHomeTeam: update.resolvedHomeTeam,
      resolvedAwayTeam: update.resolvedAwayTeam,
      isResolved: update.isResolved,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
  return { updated: updates.length };
}

function resolveTeam(source: MatchDoc | undefined, outcome: SourceOutcome) {
  if (!source) return null;
  const home = source.resolvedHomeTeam || source.homeTeam;
  const away = source.resolvedAwayTeam || source.awayTeam;
  const winner = getWinnerSide(source);
  if (!winner) return null;
  if (outcome === "winner") return winner === "home" ? home : away;
  return winner === "home" ? away : home;
}

function getWinnerSide(match: MatchDoc): "home" | "away" | null {
  const home = match.resolvedHomeTeam || match.homeTeam;
  const away = match.resolvedAwayTeam || match.awayTeam;
  if (match.winnerTeam) {
    if (sameTeam(match.winnerTeam, home)) return "home";
    if (sameTeam(match.winnerTeam, away)) return "away";
  }

  const homeGoals = numeric(match.finalHomeGoals) ?? numeric(match.homeGoals90);
  const awayGoals = numeric(match.finalAwayGoals) ?? numeric(match.awayGoals90);
  if (homeGoals === null || awayGoals === null || homeGoals === awayGoals) return null;
  return homeGoals > awayGoals ? "home" : "away";
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sameTeam(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
