import { describe, expect, it } from "vitest";
import { normalizeApiFootballFixture } from "../functions/src/apiFootballMapper";

describe("normalizeApiFootballFixture", () => {
  it("maps World Cup fixture identity, teams, venue and kickoff", () => {
    const match = normalizeApiFootballFixture({
      fixture: {
        id: 9001,
        date: "2026-06-11T19:00:00-06:00",
        venue: { name: "Estadio Azteca" },
        status: { short: "NS", long: "Not Started" }
      },
      league: { round: "Group Stage - 1" },
      teams: {
        home: { id: 1, name: "Mexico" },
        away: { id: 2, name: "Canada" }
      },
      goals: { home: null, away: null },
      score: {}
    });

    expect(match.provider).toBe("api-football");
    expect(match.providerMatchId).toBe("9001");
    expect(match.homeTeam).toBe("Mexico");
    expect(match.awayTeam).toBe("Canada");
    expect(match.venue).toBe("Estadio Azteca");
    expect(match.status).toBe("scheduled");
    expect(match.kickoffAtIso).toBe("2026-06-12T01:00:00.000Z");
  });

  it("maps final and penalty goals into normalized final score", () => {
    const match = normalizeApiFootballFixture({
      fixture: {
        id: 9002,
        date: "2026-07-19T19:00:00Z",
        status: { short: "PEN", long: "Match Finished" }
      },
      league: { round: "Final" },
      teams: {
        home: { name: "Team A", winner: true },
        away: { name: "Team B", winner: false }
      },
      goals: { home: 1, away: 1 },
      score: {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 1, away: 1 },
        extratime: { home: 2, away: 2 },
        penalty: { home: 4, away: 3 }
      }
    });

    expect(match.status).toBe("finished");
    expect(match.homeGoals90).toBe(1);
    expect(match.awayGoals90).toBe(1);
    expect(match.homeGoalsExtraTime).toBe(2);
    expect(match.awayGoalsExtraTime).toBe(2);
    expect(match.homePenaltyGoals).toBe(4);
    expect(match.awayPenaltyGoals).toBe(3);
    expect(match.finalHomeGoals).toBe(6);
    expect(match.finalAwayGoals).toBe(5);
    expect(match.winnerTeam).toBe("Team A");
  });
});
