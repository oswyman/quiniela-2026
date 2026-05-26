export type ApiFootballFixture = {
  fixture: {
    id: number;
    date?: string;
    venue?: { name?: string | null; city?: string | null };
    status?: { short?: string | null; long?: string | null; elapsed?: number | null };
  };
  league?: { round?: string | null };
  teams?: {
    home?: { id?: number | null; name?: string | null; winner?: boolean | null };
    away?: { id?: number | null; name?: string | null; winner?: boolean | null };
  };
  goals?: { home?: number | null; away?: number | null };
  score?: {
    halftime?: { home?: number | null; away?: number | null };
    fulltime?: { home?: number | null; away?: number | null };
    extratime?: { home?: number | null; away?: number | null };
    penalty?: { home?: number | null; away?: number | null };
  };
};

export function normalizeApiFootballFixture(fixture: ApiFootballFixture) {
  const status = fixture.fixture.status?.short ?? "NS";
  const fulltime = fixture.score?.fulltime;
  const extratime = fixture.score?.extratime;
  const penalty = fixture.score?.penalty;
  const homeName = fixture.teams?.home?.name ?? "Local por confirmar";
  const awayName = fixture.teams?.away?.name ?? "Visitante por confirmar";

  return {
    provider: "api-football" as const,
    providerMatchId: String(fixture.fixture.id),
    phase: normalizeRound(fixture.league?.round),
    fifaGroup: extractGroup(fixture.league?.round),
    homeTeamId: fixture.teams?.home?.id ?? null,
    awayTeamId: fixture.teams?.away?.id ?? null,
    homeTeam: homeName,
    awayTeam: awayName,
    kickoffAtIso: fixture.fixture.date ? new Date(fixture.fixture.date).toISOString() : null,
    timezone: "UTC",
    venue: [fixture.fixture.venue?.name, fixture.fixture.venue?.city].filter(Boolean).join(", ") || null,
    status: normalizeStatus(status),
    homeGoals90: fulltime?.home ?? fixture.goals?.home ?? null,
    awayGoals90: fulltime?.away ?? fixture.goals?.away ?? null,
    homeGoalsExtraTime: extratime?.home ?? null,
    awayGoalsExtraTime: extratime?.away ?? null,
    homePenaltyGoals: penalty?.home ?? null,
    awayPenaltyGoals: penalty?.away ?? null,
    finalHomeGoals: finalGoals(fulltime?.home, extratime?.home, penalty?.home),
    finalAwayGoals: finalGoals(fulltime?.away, extratime?.away, penalty?.away),
    winnerTeam: fixture.teams?.home?.winner ? homeName : fixture.teams?.away?.winner ? awayName : null,
    rawProviderStatus: fixture.fixture.status?.long ?? status
  };
}

function normalizeRound(round?: string | null) {
  if (!round) return "Mundial 2026";
  if (round.toLowerCase().includes("group")) return "Fase de grupos";
  return round;
}

function extractGroup(round?: string | null) {
  const match = round?.match(/group\s+([a-z0-9]+)/i);
  return match?.[1]?.toUpperCase() ?? undefined;
}

function normalizeStatus(status: string) {
  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  if (["1H", "HT", "2H", "ET", "P", "LIVE", "BT"].includes(status)) return "live";
  if (["CANC", "PST", "ABD"].includes(status)) return "cancelled";
  return "scheduled";
}

function finalGoals(fulltime?: number | null, extratime?: number | null, penalty?: number | null) {
  if (typeof penalty === "number" && typeof extratime === "number") return extratime + penalty;
  if (typeof extratime === "number") return extratime;
  if (typeof fulltime === "number") return fulltime;
  return null;
}
