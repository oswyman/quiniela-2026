type MatchLike = {
  id: string;
  matchNumber?: number | null;
  phase: string;
  fifaGroup?: string | null;
  homeTeam: string;
  awayTeam: string;
  resolvedHomeTeam?: string | null;
  resolvedAwayTeam?: string | null;
  homeGoals90?: number | null;
  awayGoals90?: number | null;
};

export type TeamStanding = {
  group: string;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  needsReview: boolean;
};

export type StandingsResult = {
  groups: Record<string, TeamStanding[]>;
  bestThirds: TeamStanding[];
  needsReview: boolean;
  reviewReasons: string[];
};

export type RoundOf32Assignment = {
  matchId: string;
  matchNumber: number;
  homeTeam: string | null;
  awayTeam: string | null;
  homeSeedLabel: string;
  awaySeedLabel: string;
  needsReview: boolean;
};

const GROUP_SEED_RE = /^Group\s+([A-L](?:\/[A-L])*)\s+(Winners|Runners Up|3rd Place)$/i;

export function calculateStandings(matches: MatchLike[]): StandingsResult {
  const byGroup = new Map<string, Map<string, Omit<TeamStanding, "position" | "goalDifference" | "needsReview">>>();
  const reviewReasons: string[] = [];

  for (const match of matches) {
    if (!isGroupStage(match) || !match.fifaGroup) continue;
    const homeGoals = numeric(match.homeGoals90);
    const awayGoals = numeric(match.awayGoals90);
    const group = match.fifaGroup.trim().toUpperCase();
    const home = match.resolvedHomeTeam || match.homeTeam;
    const away = match.resolvedAwayTeam || match.awayTeam;
    const table = byGroup.get(group) ?? new Map();
    byGroup.set(group, table);
    ensureStanding(table, group, home);
    ensureStanding(table, group, away);
    if (homeGoals === null || awayGoals === null) continue;

    const homeRow = table.get(home)!;
    const awayRow = table.get(away)!;
    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += homeGoals;
    homeRow.goalsAgainst += awayGoals;
    awayRow.goalsFor += awayGoals;
    awayRow.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeRow.wins += 1;
      homeRow.points += 3;
      awayRow.losses += 1;
    } else if (awayGoals > homeGoals) {
      awayRow.wins += 1;
      awayRow.points += 3;
      homeRow.losses += 1;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  const groups: Record<string, TeamStanding[]> = {};
  for (const [group, rows] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const ranked = [...rows.values()]
      .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst, position: 0, needsReview: false }))
      .sort(compareStanding);
    markTiesForReview(ranked, reviewReasons, `Grupo ${group}`);
    groups[group] = ranked.map((row, index) => ({ ...row, position: index + 1 }));
  }

  const thirds = Object.values(groups)
    .map((rows) => rows[2])
    .filter(Boolean)
    .sort(compareStanding)
    .map((row, index) => ({ ...row, position: index + 1 }));
  markTiesForReview(thirds, reviewReasons, "Mejores terceros");

  return {
    groups,
    bestThirds: thirds.slice(0, 8),
    needsReview: reviewReasons.length > 0,
    reviewReasons
  };
}

export function buildRoundOf32Assignments(matches: MatchLike[], standings: StandingsResult): RoundOf32Assignment[] {
  return matches
    .filter((match) => typeof match.matchNumber === "number" && match.matchNumber >= 73 && match.matchNumber <= 88)
    .sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber))
    .map((match) => {
      const homeSeedLabel = match.homeTeam;
      const awaySeedLabel = match.awayTeam;
      const homeTeam = resolveGroupSeed(homeSeedLabel, standings);
      const awayTeam = resolveGroupSeed(awaySeedLabel, standings);
      return {
        matchId: match.id,
        matchNumber: Number(match.matchNumber),
        homeTeam,
        awayTeam,
        homeSeedLabel,
        awaySeedLabel,
        needsReview: standings.needsReview || !homeTeam || !awayTeam
      };
    });
}

function resolveGroupSeed(seed: string, standings: StandingsResult) {
  const match = seed.trim().match(GROUP_SEED_RE);
  if (!match) return null;
  const groups = match[1].split("/").map((item) => item.toUpperCase());
  const label = match[2].toLowerCase();
  if (label === "winners") return standings.groups[groups[0]]?.[0]?.team ?? null;
  if (label === "runners up") return standings.groups[groups[0]]?.[1]?.team ?? null;

  const eligible = standings.bestThirds.find((row) => groups.includes(row.group));
  return eligible?.team ?? null;
}

function compareStanding(a: Pick<TeamStanding, "points" | "goalDifference" | "goalsFor" | "team">, b: Pick<TeamStanding, "points" | "goalDifference" | "goalsFor" | "team">) {
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
}

function markTiesForReview(rows: TeamStanding[], reviewReasons: string[], context: string) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    const current = rows[index];
    const next = rows[index + 1];
    if (current.points === next.points && current.goalDifference === next.goalDifference && current.goalsFor === next.goalsFor) {
      current.needsReview = true;
      next.needsReview = true;
      reviewReasons.push(`${context}: ${current.team} y ${next.team} requieren criterio FIFA adicional.`);
    }
  }
}

function ensureStanding(table: Map<string, Omit<TeamStanding, "position" | "goalDifference" | "needsReview">>, group: string, team: string) {
  if (table.has(team)) return;
  table.set(team, { group, team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
}

function isGroupStage(match: MatchLike) {
  return match.phase.toLowerCase().includes("grupo") || !!match.fifaGroup;
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
