import type { Match } from "@/types";
import { teamDisplayName } from "./teamNames";

// Devuelve el nombre PARA MOSTRAR (traducido a español). Los valores crudos
// de match.homeTeam/awayTeam quedan en inglés para scoring y almacenamiento.
export function getDisplayTeam(match: Pick<Match, "homeTeam" | "awayTeam" | "resolvedHomeTeam" | "resolvedAwayTeam" | "homeSeedLabel" | "awaySeedLabel">, side: "home" | "away") {
  if (side === "home") return teamDisplayName(match.resolvedHomeTeam || match.homeSeedLabel || match.homeTeam);
  return teamDisplayName(match.resolvedAwayTeam || match.awaySeedLabel || match.awayTeam);
}

export function getMatchTitle(match: Pick<Match, "homeTeam" | "awayTeam" | "resolvedHomeTeam" | "resolvedAwayTeam" | "homeSeedLabel" | "awaySeedLabel">) {
  return `${getDisplayTeam(match, "home")} vs ${getDisplayTeam(match, "away")}`;
}
