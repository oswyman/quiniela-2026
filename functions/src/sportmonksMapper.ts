export type SportmonksFixture = {
  id: number;
  name?: string;
  starting_at?: string;
  result_info?: string | null;
  state?: { name?: string; short_name?: string; state?: string };
  venue?: { name?: string };
  group?: { name?: string };
  round?: { name?: string };
  participants?: Array<{ id: number; name: string; meta?: { location?: "home" | "away" } }>;
  scores?: Array<{ score?: { goals?: number }; description?: string; type?: { name?: string } }>;
};

export function normalizeSportmonksFixture(fixture: SportmonksFixture) {
  const participants = fixture.participants ?? [];
  const home = participants.find((item) => item.meta?.location === "home") ?? participants[0];
  const away = participants.find((item) => item.meta?.location === "away") ?? participants[1];
  const scores = extractScores(fixture.scores ?? []);

  return {
    provider: "sportmonks" as const,
    providerMatchId: String(fixture.id),
    matchNumber: fixture.id,
    phase: fixture.round?.name ?? fixture.state?.name ?? "Mundial 2026",
    fifaGroup: fixture.group?.name ?? null,
    venue: fixture.venue?.name ?? null,
    homeTeamId: home?.id ?? null,
    awayTeamId: away?.id ?? null,
    homeTeam: home?.name ?? "Equipo local por confirmar",
    awayTeam: away?.name ?? "Equipo visitante por confirmar",
    kickoffAtIso: fixture.starting_at ? new Date(fixture.starting_at.replace(" ", "T") + "Z").toISOString() : null,
    timezone: "UTC",
    status: normalizeStatus(fixture.state?.short_name ?? fixture.state?.state ?? fixture.state?.name),
    homeGoals90: scores.homeGoals90,
    awayGoals90: scores.awayGoals90,
    homeGoalsExtraTime: null,
    awayGoalsExtraTime: null,
    homePenaltyGoals: null,
    awayPenaltyGoals: null,
    finalHomeGoals: scores.finalHomeGoals,
    finalAwayGoals: scores.finalAwayGoals,
    winnerTeam: null,
    rawProviderStatus: fixture.state?.name ?? null
  };
}

export function normalizeStatus(status?: string | null) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("finished") || value === "ft") return "finished";
  if (value.includes("live") || value.includes("inplay") || value === "1st" || value === "2nd") return "live";
  if (value.includes("cancel")) return "cancelled";
  return "scheduled";
}

function extractScores(scores: NonNullable<SportmonksFixture["scores"]>) {
  const goals = scores.map((score) => score.score?.goals).filter((goal): goal is number => typeof goal === "number");
  return {
    homeGoals90: goals[0] ?? null,
    awayGoals90: goals[1] ?? null,
    finalHomeGoals: goals[0] ?? null,
    finalAwayGoals: goals[1] ?? null
  };
}
