import type { Match } from "@/types";
import { toDate } from "./format";
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

// Ventana estimada de juego desde el kickoff: 90' + descanso + agregado en grupos,
// hasta penales en eliminación directa. Cubre el hueco entre que el partido inicia
// y el superadmin captura el resultado, sin depender de que alguien marque "live".
const GROUP_PLAY_WINDOW_MS = 135 * 60_000;
const KNOCKOUT_PLAY_WINDOW_MS = 210 * 60_000;

export function isMatchInPlay(match: Pick<Match, "kickoffAt" | "status" | "fifaGroup" | "matchNumber">, nowMs = Date.now()) {
  if (match.status === "live") return true;
  if (match.status !== "scheduled") return false;
  const kickoffMs = toDate(match.kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  const isGroupStage = Boolean(match.fifaGroup) || Number(match.matchNumber ?? 0) <= 72;
  const windowMs = isGroupStage ? GROUP_PLAY_WINDOW_MS : KNOCKOUT_PLAY_WINDOW_MS;
  return nowMs >= kickoffMs && nowMs - kickoffMs <= windowMs;
}
