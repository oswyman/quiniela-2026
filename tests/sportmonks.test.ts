import { describe, expect, it } from "vitest";
import { normalizeSportmonksFixture } from "../functions/src/sportmonksMapper";

describe("normalizeSportmonksFixture", () => {
  it("maps fixture identity, teams, venue and kickoff", () => {
    const match = normalizeSportmonksFixture({
      id: 123,
      starting_at: "2026-06-11 19:00:00",
      state: { name: "Not Started", short_name: "NS" },
      venue: { name: "Estadio Azteca" },
      group: { name: "A" },
      round: { name: "Group Stage" },
      participants: [
        { id: 1, name: "Mexico", meta: { location: "home" } },
        { id: 2, name: "Canada", meta: { location: "away" } }
      ]
    });

    expect(match.provider).toBe("sportmonks");
    expect(match.providerMatchId).toBe("123");
    expect(match.homeTeam).toBe("Mexico");
    expect(match.awayTeam).toBe("Canada");
    expect(match.venue).toBe("Estadio Azteca");
    expect(match.status).toBe("scheduled");
    expect(match.kickoffAtIso).toBe("2026-06-11T19:00:00.000Z");
  });

  it("maps live/final scores into normalized goals", () => {
    const match = normalizeSportmonksFixture({
      id: 456,
      state: { name: "Finished", short_name: "FT" },
      scores: [{ score: { goals: 2 } }, { score: { goals: 1 } }]
    });

    expect(match.status).toBe("finished");
    expect(match.homeGoals90).toBe(2);
    expect(match.awayGoals90).toBe(1);
    expect(match.finalHomeGoals).toBe(2);
    expect(match.finalAwayGoals).toBe(1);
  });
});
