import type { Match } from "@/types";

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

export function resultModeLabel(mode: string) {
  if (mode === "NINETY") return "Marcador a los 90 minutos";
  if (mode === "EXTRA_TIME") return "Marcador después de tiempos extra";
  return "Resultado final incluyendo penales";
}

export function calculateStandings(matches: Match[]): StandingsResult {
  const groups: Record<string, TeamStanding[]> = {};
  const reviewReasons: string[] = [];
  const byGroup = new Map<string, Map<string, Omit<TeamStanding, "position" | "goalDifference" | "needsReview">>>();

  for (const match of matches) {
    if (!match.fifaGroup) continue;
    const group = match.fifaGroup.trim().toUpperCase();
    const home = match.resolvedHomeTeam || match.homeTeam;
    const away = match.resolvedAwayTeam || match.awayTeam;
    const table = byGroup.get(group) ?? new Map();
    byGroup.set(group, table);
    ensure(table, group, home);
    ensure(table, group, away);
    if (typeof match.homeGoals90 !== "number" || typeof match.awayGoals90 !== "number") continue;
    const homeRow = table.get(home)!;
    const awayRow = table.get(away)!;
    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += match.homeGoals90;
    homeRow.goalsAgainst += match.awayGoals90;
    awayRow.goalsFor += match.awayGoals90;
    awayRow.goalsAgainst += match.homeGoals90;
    if (match.homeGoals90 > match.awayGoals90) {
      homeRow.wins += 1;
      homeRow.points += 3;
      awayRow.losses += 1;
    } else if (match.awayGoals90 > match.homeGoals90) {
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

  for (const [group, rows] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const ranked = [...rows.values()]
      .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst, position: 0, needsReview: false }))
      .sort(compare);
    markTies(ranked, reviewReasons, `Grupo ${group}`);
    groups[group] = ranked.map((row, index) => ({ ...row, position: index + 1 }));
  }

  const thirds = Object.values(groups).map((rows) => rows[2]).filter(Boolean).sort(compare).map((row, index) => ({ ...row, position: index + 1 }));
  markTies(thirds, reviewReasons, "Mejores terceros");
  return { groups, bestThirds: thirds.slice(0, 8), needsReview: reviewReasons.length > 0, reviewReasons };
}

function compare(a: Pick<TeamStanding, "points" | "goalDifference" | "goalsFor" | "team">, b: Pick<TeamStanding, "points" | "goalDifference" | "goalsFor" | "team">) {
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
}

function markTies(rows: TeamStanding[], reviewReasons: string[], context: string) {
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

function ensure(table: Map<string, Omit<TeamStanding, "position" | "goalDifference" | "needsReview">>, group: string, team: string) {
  if (!table.has(team)) table.set(team, { group, team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
}
