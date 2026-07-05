export type SourceOutcome = "winner" | "loser";

export type KnockoutMatchLike = {
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
  status?: string;
  isPublishedToParticipants?: boolean;
  isResolved?: boolean;
};

export type KnockoutUpdate = {
  id: string;
  resolvedHomeTeam: string | null;
  resolvedAwayTeam: string | null;
  isResolved: boolean;
  isPublishedToParticipants: boolean;
};

export function resolveKnockoutUpdates(matches: KnockoutMatchLike[]): KnockoutUpdate[] {
  const byNumber = new Map<number, KnockoutMatchLike>();
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
    const isPublishedToParticipants = isResolved;

    if (
      (match.resolvedHomeTeam ?? null) !== resolvedHomeTeam ||
      (match.resolvedAwayTeam ?? null) !== resolvedAwayTeam ||
      Boolean(match.isResolved) !== isResolved ||
      Boolean(match.isPublishedToParticipants) !== isPublishedToParticipants
    ) {
      updates.push({ id: match.id, resolvedHomeTeam, resolvedAwayTeam, isResolved, isPublishedToParticipants });
    }
  }

  return updates;
}

function resolveTeam(source: KnockoutMatchLike | undefined, outcome: SourceOutcome) {
  // Solo un partido finalizado define al clasificado: un marcador parcial
  // (status "live") no debe publicar la siguiente llave prematuramente.
  if (!source || source.status !== "finished") return null;
  const home = source.resolvedHomeTeam || source.homeTeam;
  const away = source.resolvedAwayTeam || source.awayTeam;
  const winner = getWinnerSide(source);
  if (!winner) return null;
  if (outcome === "winner") return winner === "home" ? home : away;
  return winner === "home" ? away : home;
}

function getWinnerSide(match: KnockoutMatchLike): "home" | "away" | null {
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
