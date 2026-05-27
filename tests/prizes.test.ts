import { describe, expect, it } from "vitest";
import { calculatePrizeAllocations, rankScores } from "@/lib/prizes";

const base = {
  exactScores: 0,
  correctWinners: 0,
  correctDraws: 0,
  correctGoalDifferences: 0
};

describe("rankScores", () => {
  it("ranks by aciertos and keeps real ties", () => {
    const ranked = rankScores([
      { uid: "a", totalPoints: 5, exactScores: 0, correctGoalDifferences: 0, correctWinners: 0, correctDraws: 0 },
      { uid: "b", totalPoints: 5, exactScores: 1, correctGoalDifferences: 0, correctWinners: 0, correctDraws: 0 },
      { uid: "c", totalPoints: 3, exactScores: 0, correctGoalDifferences: 0, correctWinners: 0, correctDraws: 0 }
    ]);
    expect(ranked.map((item) => item.uid)).toEqual(["a", "b", "c"]);
    expect(ranked.map((item) => item.position)).toEqual([1, 1, 3]);
  });
});

describe("calculatePrizeAllocations", () => {
  it("assigns 100 percent to first place for two participants", () => {
    const prizes = calculatePrizeAllocations([
      { uid: "a", totalPoints: 6, ...base },
      { uid: "b", totalPoints: 2, ...base }
    ], 100);
    expect(prizes.find((item) => item.uid === "a")?.estimatedPrize).toBe(200);
    expect(prizes.find((item) => item.uid === "b")?.estimatedPrize).toBe(0);
  });

  it("uses 70/30 for three participants", () => {
    const prizes = calculatePrizeAllocations([
      { uid: "a", totalPoints: 6, ...base },
      { uid: "b", totalPoints: 4, ...base },
      { uid: "c", totalPoints: 2, ...base }
    ], 100);
    expect(prizes.find((item) => item.uid === "a")?.estimatedPrize).toBe(210);
    expect(prizes.find((item) => item.uid === "b")?.estimatedPrize).toBe(90);
    expect(prizes.find((item) => item.uid === "c")?.estimatedPrize).toBe(0);
  });

  it("uses 60/30/10 for four or more participants", () => {
    const prizes = calculatePrizeAllocations([
      { uid: "a", totalPoints: 6, ...base },
      { uid: "b", totalPoints: 4, ...base },
      { uid: "c", totalPoints: 2, ...base },
      { uid: "d", totalPoints: 1, ...base }
    ], 100);
    expect(prizes.find((item) => item.uid === "a")?.estimatedPrize).toBe(240);
    expect(prizes.find((item) => item.uid === "b")?.estimatedPrize).toBe(120);
    expect(prizes.find((item) => item.uid === "c")?.estimatedPrize).toBe(40);
  });

  it("splits tied prize zones", () => {
    const prizes = calculatePrizeAllocations([
      { uid: "a", totalPoints: 6, ...base },
      { uid: "b", totalPoints: 6, ...base },
      { uid: "c", totalPoints: 2, ...base }
    ], 100);
    expect(prizes.find((item) => item.uid === "a")?.estimatedPrize).toBe(150);
    expect(prizes.find((item) => item.uid === "b")?.estimatedPrize).toBe(150);
    expect(prizes.find((item) => item.uid === "a")?.tieApplied).toBe(true);
  });
});
