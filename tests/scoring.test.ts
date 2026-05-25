import { describe, expect, it } from "vitest";
import { calculatePredictionScore } from "@/lib/scoring";

describe("calculatePredictionScore", () => {
  it("awards 3 points for exact score", () => {
    const result = calculatePredictionScore({ homeGoals: 2, awayGoals: 1, isLate: false }, { homeGoals: 2, awayGoals: 1 });
    expect(result.points).toBe(3);
    expect(result.exactScores).toBe(1);
  });

  it("awards 2 points for correct goal difference", () => {
    const result = calculatePredictionScore({ homeGoals: 3, awayGoals: 2, isLate: false }, { homeGoals: 2, awayGoals: 1 });
    expect(result.points).toBe(2);
    expect(result.correctGoalDifferences).toBe(1);
  });

  it("awards 1 point for correct winner", () => {
    const result = calculatePredictionScore({ homeGoals: 1, awayGoals: 0, isLate: false }, { homeGoals: 2, awayGoals: 1 });
    expect(result.points).toBe(1);
    expect(result.correctWinners).toBe(1);
  });

  it("awards 2 points for non-exact draw with correct difference", () => {
    const result = calculatePredictionScore({ homeGoals: 2, awayGoals: 2, isLate: false }, { homeGoals: 1, awayGoals: 1 });
    expect(result.points).toBe(2);
    expect(result.correctGoalDifferences).toBe(1);
  });

  it("awards 0 points for incorrect prediction", () => {
    const result = calculatePredictionScore({ homeGoals: 2, awayGoals: 1, isLate: false }, { homeGoals: 1, awayGoals: 1 });
    expect(result.points).toBe(0);
  });

  it("awards 0 points for late prediction", () => {
    const result = calculatePredictionScore({ homeGoals: 2, awayGoals: 1, isLate: true }, { homeGoals: 2, awayGoals: 1 });
    expect(result.points).toBe(0);
    expect(result.latePredictions).toBe(1);
  });
});
