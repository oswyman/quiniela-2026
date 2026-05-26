import type { Match } from "@/types";
import { CDMX_TIMEZONE, formatInTimeZone, getUserTimeZone } from "./timezone";

export type MatchTimeMode = "cdmx" | "local" | "venue";

export function formatMatchTime(match: Pick<Match, "kickoffAt" | "timezone" | "sourceTimezone">, mode: MatchTimeMode, userTimeZone = getUserTimeZone()) {
  const venueTimeZone = match.sourceTimezone || match.timezone || CDMX_TIMEZONE;
  const timeZone = mode === "cdmx" ? CDMX_TIMEZONE : mode === "local" ? userTimeZone : venueTimeZone;
  return formatInTimeZone(match.kickoffAt, timeZone);
}

export function matchTimeLabel(mode: MatchTimeMode) {
  if (mode === "cdmx") return "Hora CDMX";
  if (mode === "local") return "Tu hora local";
  return "Hora sede";
}
