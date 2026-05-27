import type { Match } from "@/types";

export function getDisplayTeam(match: Pick<Match, "homeTeam" | "awayTeam" | "resolvedHomeTeam" | "resolvedAwayTeam" | "homeSeedLabel" | "awaySeedLabel">, side: "home" | "away") {
  if (side === "home") return match.resolvedHomeTeam || match.homeSeedLabel || match.homeTeam;
  return match.resolvedAwayTeam || match.awaySeedLabel || match.awayTeam;
}

export function getMatchTitle(match: Pick<Match, "homeTeam" | "awayTeam" | "resolvedHomeTeam" | "resolvedAwayTeam" | "homeSeedLabel" | "awaySeedLabel">) {
  return `${getDisplayTeam(match, "home")} vs ${getDisplayTeam(match, "away")}`;
}
