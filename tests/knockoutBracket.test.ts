import { describe, expect, it } from "vitest";
import { buildKnockoutBracketPayload, FULL_KNOCKOUT_BRACKET } from "../functions/src/knockoutBracket";

describe("full knockout bracket seed", () => {
  it("contains the complete 73-104 bracket exactly once", () => {
    expect(FULL_KNOCKOUT_BRACKET).toHaveLength(32);
    expect(FULL_KNOCKOUT_BRACKET.map((match) => match.matchNumber)).toEqual(
      Array.from({ length: 32 }, (_, index) => index + 73)
    );
    expect(new Set(FULL_KNOCKOUT_BRACKET.map((match) => match.matchNumber)).size).toBe(32);
  });

  it("publishes round of 32 teams and keeps later rounds source-driven", () => {
    const roundOf32 = buildKnockoutBracketPayload(FULL_KNOCKOUT_BRACKET.find((match) => match.matchNumber === 79)!);
    expect(roundOf32).toMatchObject({
      homeTeam: "Mexico",
      awayTeam: "Ecuador",
      resolvedHomeTeam: "Mexico",
      resolvedAwayTeam: "Ecuador",
      isResolved: true,
      isPublishedToParticipants: true,
      venue: "Estadio Azteca",
      city: "Mexico City",
      country: "Mexico"
    });

    const final = buildKnockoutBracketPayload(FULL_KNOCKOUT_BRACKET.find((match) => match.matchNumber === 104)!);
    expect(final).toMatchObject({
      homeTeam: "Match 101 Winner",
      awayTeam: "Match 102 Winner",
      homeSourceMatchNumber: 101,
      awaySourceMatchNumber: 102,
      homeSourceOutcome: "winner",
      awaySourceOutcome: "winner",
      resolvedHomeTeam: null,
      resolvedAwayTeam: null,
      isResolved: false,
      isPublishedToParticipants: false,
      venue: "MetLife Stadium"
    });
  });

  it("uses semifinal losers for third place", () => {
    const thirdPlace = buildKnockoutBracketPayload(FULL_KNOCKOUT_BRACKET.find((match) => match.matchNumber === 103)!);
    expect(thirdPlace).toMatchObject({
      homeTeam: "Match 101 Loser",
      awayTeam: "Match 102 Loser",
      homeSourceMatchNumber: 101,
      awaySourceMatchNumber: 102,
      homeSourceOutcome: "loser",
      awaySourceOutcome: "loser"
    });
  });

  it("converts venue local times to UTC consistently", () => {
    const mexico = buildKnockoutBracketPayload(FULL_KNOCKOUT_BRACKET.find((match) => match.matchNumber === 79)!);
    const final = buildKnockoutBracketPayload(FULL_KNOCKOUT_BRACKET.find((match) => match.matchNumber === 104)!);

    expect(mexico.kickoffAt.toISOString()).toBe("2026-07-01T01:00:00.000Z");
    expect(final.kickoffAt.toISOString()).toBe("2026-07-19T19:00:00.000Z");
  });
});
