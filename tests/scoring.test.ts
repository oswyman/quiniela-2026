import { describe, expect, it } from "vitest";
import { calculatePredictionScore, inferPickType, isMatchClosed, legacyPredictionToPick } from "@/lib/scoring";
import type { Match } from "@/types";

function match(partial: Partial<Match> = {}): Match {
  return {
    id: "1",
    matchNumber: 1,
    phase: "Fase de grupos",
    fifaGroup: "A",
    homeTeam: "Mexico",
    awayTeam: "Canada",
    kickoffAt: new Date("2026-06-11T18:00:00Z"),
    timezone: "America/Mexico_City",
    status: "finished",
    ...partial
  };
}

describe("legacyPredictionToPick", () => {
  it("converts legacy score predictions to outcome picks", () => {
    expect(legacyPredictionToPick({ homeGoals: 2, awayGoals: 1 })).toBe("HOME");
    expect(legacyPredictionToPick({ homeGoals: 1, awayGoals: 1 })).toBe("DRAW");
    expect(legacyPredictionToPick({ homeGoals: 0, awayGoals: 2 })).toBe("AWAY");
  });
});

describe("calculatePredictionScore", () => {
  it("counts one correct group pick for home win", () => {
    const result = calculatePredictionScore(
      { pickType: "GROUP_OUTCOME", pick: "HOME", isLate: false },
      match({ homeGoals90: 2, awayGoals90: 1 })
    );
    expect(result.points).toBe(1);
    expect(result.totalCorrect).toBe(1);
    expect(result.correctGroupPicks).toBe(1);
    expect(result.isCorrect).toBe(true);
  });

  it("counts one correct group pick for draw", () => {
    const result = calculatePredictionScore(
      { pickType: "GROUP_OUTCOME", pick: "DRAW", isLate: false },
      match({ homeGoals90: 1, awayGoals90: 1 })
    );
    expect(result.points).toBe(1);
    expect(result.correctGroupPicks).toBe(1);
  });

  it("returns zero when group pick is incorrect", () => {
    const result = calculatePredictionScore(
      { pickType: "GROUP_OUTCOME", pick: "AWAY", isLate: false },
      match({ homeGoals90: 2, awayGoals90: 1 })
    );
    expect(result.points).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("counts one correct advancing-team pick", () => {
    const result = calculatePredictionScore(
      { pickType: "ADVANCING_TEAM", pick: "Mexico", isLate: false },
      match({ matchNumber: 73, fifaGroup: undefined, phase: "Ronda de 32", winnerTeam: "Mexico" })
    );
    expect(result.points).toBe(1);
    expect(result.correctAdvancingPicks).toBe(1);
  });

  it("awards zero for late prediction", () => {
    const result = calculatePredictionScore(
      { pickType: "GROUP_OUTCOME", pick: "HOME", isLate: true },
      match({ homeGoals90: 2, awayGoals90: 1 })
    );
    expect(result.points).toBe(0);
    expect(result.latePredictions).toBe(1);
  });

  it("infers group vs knockout pick type", () => {
    expect(inferPickType(match({ matchNumber: 72 }))).toBe("GROUP_OUTCOME");
    expect(inferPickType(match({ matchNumber: 73, fifaGroup: undefined }))).toBe("ADVANCING_TEAM");
  });

  it("detects prediction lock at kickoff", () => {
    expect(isMatchClosed(new Date("2026-06-11T10:00:00Z"), new Date("2026-06-11T10:00:00Z"))).toBe(true);
    expect(isMatchClosed(new Date("2026-06-11T10:00:00Z"), new Date("2026-06-11T09:59:00Z"))).toBe(false);
  });
});
