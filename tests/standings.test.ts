import { describe, expect, it } from "vitest";
import { calculateStandings } from "@/lib/standings";
import type { Match } from "@/types";

function groupMatch(id: string, group: string, homeTeam: string, awayTeam: string, homeGoals90: number, awayGoals90: number): Match {
  return {
    id,
    phase: "Fase de grupos",
    fifaGroup: group,
    homeTeam,
    awayTeam,
    homeGoals90,
    awayGoals90,
    kickoffAt: "2026-06-11T19:00:00.000Z",
    timezone: "America/Mexico_City",
    status: "finished"
  };
}

describe("World Cup standings helpers", () => {
  it("calculates group table by points, goal difference and goals scored", () => {
    const standings = calculateStandings([
      groupMatch("1", "A", "Mexico", "Canada", 2, 0),
      groupMatch("2", "A", "Brazil", "Japan", 1, 1),
      groupMatch("3", "A", "Mexico", "Brazil", 1, 1),
      groupMatch("4", "A", "Canada", "Japan", 0, 3),
      groupMatch("5", "A", "Mexico", "Japan", 0, 0),
      groupMatch("6", "A", "Canada", "Brazil", 1, 2)
    ]);

    expect(standings.groups.A.map((row) => row.team)).toEqual(["Japan", "Mexico", "Brazil", "Canada"]);
    expect(standings.groups.A[0]).toMatchObject({ points: 5, goalDifference: 3, goalsFor: 4 });
  });

  it("marks unresolved FIFA tie-breaker situations for review", () => {
    const standings = calculateStandings([
      groupMatch("1", "B", "Team A", "Team B", 1, 0),
      groupMatch("2", "B", "Team C", "Team D", 1, 0),
      groupMatch("3", "B", "Team A", "Team C", 0, 1),
      groupMatch("4", "B", "Team B", "Team D", 1, 0),
      groupMatch("5", "B", "Team A", "Team D", 1, 0),
      groupMatch("6", "B", "Team B", "Team C", 1, 0)
    ]);

    expect(standings.needsReview).toBe(true);
    expect(standings.reviewReasons.length).toBeGreaterThan(0);
  });
});
