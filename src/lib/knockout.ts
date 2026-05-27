import type { Match } from "@/types";

export function previewKnockoutResolution(matches: Match[]) {
  const byNumber = new Map<number, Match>();
  matches.forEach((match) => {
    if (typeof match.matchNumber === "number") byNumber.set(match.matchNumber, match);
  });

  return matches
    .filter((match) => match.homeSourceMatchNumber || match.awaySourceMatchNumber)
    .map((match) => ({
      matchNumber: match.matchNumber,
      resolvedHomeTeam: match.homeSourceMatchNumber && match.homeSourceOutcome
        ? resolveSourceTeam(byNumber.get(match.homeSourceMatchNumber), match.homeSourceOutcome)
        : match.resolvedHomeTeam ?? null,
      resolvedAwayTeam: match.awaySourceMatchNumber && match.awaySourceOutcome
        ? resolveSourceTeam(byNumber.get(match.awaySourceMatchNumber), match.awaySourceOutcome)
        : match.resolvedAwayTeam ?? null
    }));
}

function resolveSourceTeam(source: Match | undefined, outcome: "winner" | "loser") {
  if (!source) return null;
  const home = source.resolvedHomeTeam || source.homeTeam;
  const away = source.resolvedAwayTeam || source.awayTeam;
  const winner = getWinnerSide(source);
  if (!winner) return null;
  if (outcome === "winner") return winner === "home" ? home : away;
  return winner === "home" ? away : home;
}

function getWinnerSide(match: Match): "home" | "away" | null {
  if (match.winnerTeam) {
    if (same(match.winnerTeam, match.resolvedHomeTeam || match.homeTeam)) return "home";
    if (same(match.winnerTeam, match.resolvedAwayTeam || match.awayTeam)) return "away";
  }
  const homeGoals = numeric(match.finalHomeGoals) ?? numeric(match.homeGoals90);
  const awayGoals = numeric(match.finalAwayGoals) ?? numeric(match.awayGoals90);
  if (homeGoals === null || awayGoals === null || homeGoals === awayGoals) return null;
  return homeGoals > awayGoals ? "home" : "away";
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
