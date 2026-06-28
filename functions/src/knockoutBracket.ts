import { zonedLocalToUtc } from "./timezone";

export type KnockoutBracketMatch = {
  matchNumber: number;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  localDate: string;
  localTime: string;
  timezone: string;
  venue: string;
  city: string;
  country: string;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeSourceOutcome?: "winner" | "loser" | null;
  awaySourceOutcome?: "winner" | "loser" | null;
};

export const FULL_KNOCKOUT_BRACKET: KnockoutBracketMatch[] = [
  r32(73, "South Africa", "Canada", "2026-06-28", "12:00", "America/Los_Angeles", "SoFi Stadium", "Inglewood", "United States"),
  r32(74, "Germany", "Paraguay", "2026-06-29", "16:30", "America/New_York", "Gillette Stadium", "Foxborough", "United States"),
  r32(75, "Netherlands", "Morocco", "2026-06-29", "19:00", "America/Monterrey", "Estadio BBVA", "Guadalupe", "Mexico"),
  r32(76, "Brazil", "Japan", "2026-06-29", "12:00", "America/Chicago", "NRG Stadium", "Houston", "United States"),
  r32(77, "France", "Sweden", "2026-06-30", "17:00", "America/New_York", "MetLife Stadium", "East Rutherford", "United States"),
  r32(78, "Ivory Coast", "Norway", "2026-06-30", "12:00", "America/Chicago", "AT&T Stadium", "Arlington", "United States"),
  r32(79, "Mexico", "Ecuador", "2026-06-30", "19:00", "America/Mexico_City", "Estadio Azteca", "Mexico City", "Mexico"),
  r32(80, "England", "DR Congo", "2026-07-01", "12:00", "America/New_York", "Mercedes-Benz Stadium", "Atlanta", "United States"),
  r32(81, "United States", "Bosnia and Herzegovina", "2026-07-01", "17:00", "America/Los_Angeles", "Levi's Stadium", "Santa Clara", "United States"),
  r32(82, "Belgium", "Senegal", "2026-07-01", "13:00", "America/Los_Angeles", "Lumen Field", "Seattle", "United States"),
  r32(83, "Portugal", "Croatia", "2026-07-02", "19:00", "America/Toronto", "BMO Field", "Toronto", "Canada"),
  r32(84, "Spain", "Austria", "2026-07-02", "12:00", "America/Los_Angeles", "SoFi Stadium", "Inglewood", "United States"),
  r32(85, "Switzerland", "Algeria", "2026-07-02", "20:00", "America/Vancouver", "BC Place", "Vancouver", "Canada"),
  r32(86, "Argentina", "Cabo Verde", "2026-07-03", "18:00", "America/New_York", "Hard Rock Stadium", "Miami Gardens", "United States"),
  r32(87, "Colombia", "Ghana", "2026-07-03", "20:30", "America/Chicago", "Arrowhead Stadium", "Kansas City", "United States"),
  r32(88, "Australia", "Egypt", "2026-07-03", "13:00", "America/Chicago", "AT&T Stadium", "Arlington", "United States"),
  sourced(89, "Octavos de final", 74, 77, "2026-07-04", "17:00", "America/New_York", "Lincoln Financial Field", "Philadelphia", "United States"),
  sourced(90, "Octavos de final", 73, 75, "2026-07-04", "12:00", "America/Chicago", "NRG Stadium", "Houston", "United States"),
  sourced(91, "Octavos de final", 76, 78, "2026-07-05", "16:00", "America/New_York", "MetLife Stadium", "East Rutherford", "United States"),
  sourced(92, "Octavos de final", 79, 80, "2026-07-05", "18:00", "America/Mexico_City", "Estadio Azteca", "Mexico City", "Mexico"),
  sourced(93, "Octavos de final", 83, 84, "2026-07-06", "14:00", "America/Chicago", "AT&T Stadium", "Arlington", "United States"),
  sourced(94, "Octavos de final", 81, 82, "2026-07-06", "17:00", "America/Los_Angeles", "Lumen Field", "Seattle", "United States"),
  sourced(95, "Octavos de final", 86, 88, "2026-07-07", "12:00", "America/New_York", "Mercedes-Benz Stadium", "Atlanta", "United States"),
  sourced(96, "Octavos de final", 85, 87, "2026-07-07", "13:00", "America/Vancouver", "BC Place", "Vancouver", "Canada"),
  sourced(97, "Cuartos de final", 89, 90, "2026-07-09", "16:00", "America/New_York", "Gillette Stadium", "Foxborough", "United States"),
  sourced(98, "Cuartos de final", 93, 94, "2026-07-10", "12:00", "America/Los_Angeles", "SoFi Stadium", "Inglewood", "United States"),
  sourced(99, "Cuartos de final", 91, 92, "2026-07-11", "17:00", "America/New_York", "Hard Rock Stadium", "Miami Gardens", "United States"),
  sourced(100, "Cuartos de final", 95, 96, "2026-07-11", "20:00", "America/Chicago", "Arrowhead Stadium", "Kansas City", "United States"),
  sourced(101, "Semifinal", 97, 98, "2026-07-14", "14:00", "America/Chicago", "AT&T Stadium", "Arlington", "United States"),
  sourced(102, "Semifinal", 99, 100, "2026-07-15", "15:00", "America/New_York", "Mercedes-Benz Stadium", "Atlanta", "United States"),
  sourced(103, "Tercer lugar", 101, 102, "2026-07-18", "17:00", "America/New_York", "Hard Rock Stadium", "Miami Gardens", "United States", "loser"),
  sourced(104, "Final", 101, 102, "2026-07-19", "15:00", "America/New_York", "MetLife Stadium", "East Rutherford", "United States"),
];

export function buildKnockoutBracketPayload(match: KnockoutBracketMatch) {
  const hasSource = typeof match.homeSourceMatchNumber === "number" || typeof match.awaySourceMatchNumber === "number";
  const kickoffDate = zonedLocalToUtc(match.localDate, match.localTime, match.timezone);
  return {
    provider: "manual" as const,
    providerMatchId: `manual-2026-${match.matchNumber}`,
    matchNumber: match.matchNumber,
    phase: match.phase,
    fifaGroup: null,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoffAt: kickoffDate,
    timezone: match.timezone,
    sourceTimezone: match.timezone,
    sourceLocalDate: match.localDate,
    sourceLocalTime: match.localTime,
    displayTimeMode: "cdmx",
    venue: match.venue,
    city: match.city,
    country: match.country,
    sourceName: "Calendario oficial manual",
    sourceUrl: "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage",
    referenceUrl: "https://www.sbnation.com/fifa-world-cup/1120327/2026-world-cup-round-of-32-full-list-of-matches-potential-round-of-16-games",
    notes: "Llave de eliminación directa cargada por superadmin.",
    homeSeedLabel: hasSource ? match.homeTeam : null,
    awaySeedLabel: hasSource ? match.awayTeam : null,
    homeSourceMatchNumber: match.homeSourceMatchNumber ?? null,
    awaySourceMatchNumber: match.awaySourceMatchNumber ?? null,
    homeSourceOutcome: match.homeSourceOutcome ?? null,
    awaySourceOutcome: match.awaySourceOutcome ?? null,
    resolvedHomeTeam: hasSource ? null : match.homeTeam,
    resolvedAwayTeam: hasSource ? null : match.awayTeam,
    isResolved: !hasSource,
    isPublishedToParticipants: !hasSource,
    status: "scheduled" as const,
    rawProviderStatus: "manual knockout bracket",
    lastSyncedAt: kickoffDate,
  };
}

function r32(matchNumber: number, homeTeam: string, awayTeam: string, localDate: string, localTime: string, timezone: string, venue: string, city: string, country: string): KnockoutBracketMatch {
  return { matchNumber, phase: "Ronda de 32", homeTeam, awayTeam, localDate, localTime, timezone, venue, city, country };
}

function sourced(matchNumber: number, phase: string, homeSource: number, awaySource: number, localDate: string, localTime: string, timezone: string, venue: string, city: string, country: string, outcome: "winner" | "loser" = "winner"): KnockoutBracketMatch {
  const label = outcome === "winner" ? "Winner" : "Loser";
  return {
    matchNumber,
    phase,
    homeTeam: `Match ${homeSource} ${label}`,
    awayTeam: `Match ${awaySource} ${label}`,
    localDate,
    localTime,
    timezone,
    venue,
    city,
    country,
    homeSourceMatchNumber: homeSource,
    awaySourceMatchNumber: awaySource,
    homeSourceOutcome: outcome,
    awaySourceOutcome: outcome,
  };
}
