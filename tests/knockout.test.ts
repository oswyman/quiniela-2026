import { describe, expect, it } from "vitest";
import { previewKnockoutResolution } from "@/lib/knockout";
import type { Match } from "@/types";

describe("knockout resolution", () => {
  it("resolves final and third-place seeds from semifinal winners and losers", () => {
    const matches = [
      {
        id: "manual-2026-101",
        matchNumber: 101,
        homeTeam: "Mexico",
        awayTeam: "Canada",
        finalHomeGoals: 2,
        finalAwayGoals: 1,
        winnerTeam: "Mexico",
        phase: "Semifinal",
        kickoffAt: "2026-07-14T19:00:00.000Z",
        timezone: "America/Chicago",
        status: "finished"
      },
      {
        id: "manual-2026-102",
        matchNumber: 102,
        homeTeam: "Brazil",
        awayTeam: "Argentina",
        finalHomeGoals: 0,
        finalAwayGoals: 1,
        phase: "Semifinal",
        kickoffAt: "2026-07-15T19:00:00.000Z",
        timezone: "America/New_York",
        status: "finished"
      },
      {
        id: "manual-2026-103",
        matchNumber: 103,
        homeTeam: "Match 101 Loser",
        awayTeam: "Match 102 Loser",
        homeSourceMatchNumber: 101,
        awaySourceMatchNumber: 102,
        homeSourceOutcome: "loser",
        awaySourceOutcome: "loser",
        phase: "Tercer lugar",
        kickoffAt: "2026-07-18T21:00:00.000Z",
        timezone: "America/New_York",
        status: "scheduled"
      },
      {
        id: "manual-2026-104",
        matchNumber: 104,
        homeTeam: "Match 101 Winner",
        awayTeam: "Match 102 Winner",
        homeSourceMatchNumber: 101,
        awaySourceMatchNumber: 102,
        homeSourceOutcome: "winner",
        awaySourceOutcome: "winner",
        phase: "Final",
        kickoffAt: "2026-07-19T19:00:00.000Z",
        timezone: "America/New_York",
        status: "scheduled"
      }
    ] as Match[];

    expect(previewKnockoutResolution(matches)).toEqual([
      { matchNumber: 103, resolvedHomeTeam: "Canada", resolvedAwayTeam: "Brazil" },
      { matchNumber: 104, resolvedHomeTeam: "Mexico", resolvedAwayTeam: "Argentina" }
    ]);
  });
});
