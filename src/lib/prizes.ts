import type { Score } from "@/types";

export type PrizeAllocation = {
  uid: string;
  displayName?: string;
  position: number;
  estimatedPrize: number;
  tieApplied: boolean;
  ruleApplied: string;
};

const RULES = [
  { min: 2, max: 2, percentages: [1, 0, 0], label: "2 participantes: 100% / 0%" },
  { min: 3, max: 3, percentages: [0.7, 0.3, 0], label: "3 participantes: 70% / 30% / 0%" },
  { min: 4, max: Number.MAX_SAFE_INTEGER, percentages: [0.6, 0.3, 0.1], label: "4 o mas participantes: 60% / 30% / 10%" }
];

export function calculatePrizeAllocations(
  scores: Array<Pick<Score, "uid" | "displayName" | "totalPoints" | "exactScores" | "correctGoalDifferences" | "correctWinners" | "correctDraws"> & Partial<Pick<Score, "totalCorrect" | "correctGroupPicks" | "correctAdvancingPicks" | "validPredictions" | "latePredictions">>>,
  contributionAmount: number
): PrizeAllocation[] {
  const ranked = rankScores(scores);
  const activeCount = ranked.length;

  if (activeCount < 2) return [];

  const rule = RULES.find((item) => activeCount >= item.min && activeCount <= item.max) ?? RULES[2];
  const pool = activeCount * contributionAmount;
  const allocations: PrizeAllocation[] = [];
  let index = 0;

  while (index < ranked.length) {
    const tied = ranked.filter((score) => score.position === ranked[index].position);
    const start = ranked[index].position;
    const prizeSlots = Array.from({ length: tied.length }, (_, offset) => start + offset);
    const sharedPool = prizeSlots.reduce((sum, position) => {
      return sum + (rule.percentages[position - 1] ?? 0) * pool;
    }, 0);
    const each = tied.length > 0 ? sharedPool / tied.length : 0;

    for (const score of tied) {
      allocations.push({
        uid: score.uid,
        displayName: score.displayName,
        position: score.position,
        estimatedPrize: roundMoney(each),
        tieApplied: tied.length > 1 && sharedPool > 0,
        ruleApplied:
          tied.length > 1 && sharedPool > 0
            ? `${rule.label}. Empate en zona de premio: se sumaron posiciones ${prizeSlots.join(", ")} y se dividieron entre ${tied.length}.`
            : rule.label
      });
    }

    index += tied.length;
  }

  return allocations;
}

export function rankScores(
  scores: Array<Pick<Score, "uid" | "displayName" | "totalPoints" | "exactScores" | "correctGoalDifferences" | "correctWinners" | "correctDraws"> & Partial<Pick<Score, "totalCorrect" | "correctGroupPicks" | "correctAdvancingPicks" | "validPredictions" | "latePredictions">>>
) {
  const sorted = [...scores].sort((a, b) => {
    return (
      b.totalPoints - a.totalPoints ||
      a.uid.localeCompare(b.uid)
    );
  });

  let previousPosition = 0;

  return sorted.map((score, index) => {
    const previous = sorted[index - 1];
    const tiedWithPrevious =
      previous &&
      previous.totalPoints === score.totalPoints;
    const position = tiedWithPrevious ? previousPosition : index + 1;
    previousPosition = position;

    return { ...score, position };
  });
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
