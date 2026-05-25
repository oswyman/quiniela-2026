export type ScoreRow = {
  uid: string;
  displayName?: string;
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  correctDraws: number;
  correctGoalDifferences: number;
};

const RULES = [
  { min: 2, max: 2, percentages: [1, 0, 0], label: "2 participantes: 100% / 0%" },
  { min: 3, max: 3, percentages: [0.7, 0.3, 0], label: "3 participantes: 70% / 30% / 0%" },
  { min: 4, max: Number.MAX_SAFE_INTEGER, percentages: [0.6, 0.3, 0.1], label: "4 o mas participantes: 60% / 30% / 10%" }
];

export function rankScores(scores: ScoreRow[]) {
  const sorted = [...scores].sort((a, b) =>
    b.totalPoints - a.totalPoints ||
    b.exactScores - a.exactScores ||
    b.correctGoalDifferences - a.correctGoalDifferences ||
    b.correctWinners - a.correctWinners ||
    b.correctDraws - a.correctDraws ||
    a.uid.localeCompare(b.uid)
  );
  let previousPosition = 0;
  return sorted.map((score, index) => {
    const previous = sorted[index - 1];
    const tied = previous &&
      previous.totalPoints === score.totalPoints &&
      previous.exactScores === score.exactScores &&
      previous.correctGoalDifferences === score.correctGoalDifferences &&
      previous.correctWinners === score.correctWinners &&
      previous.correctDraws === score.correctDraws;
    const position = tied ? previousPosition : index + 1;
    previousPosition = position;
    return { ...score, position };
  });
}

export function calculatePrizeAllocations(scores: ScoreRow[], contributionAmount: number) {
  const ranked = rankScores(scores);
  if (ranked.length < 2) return [];
  const rule = RULES.find((item) => ranked.length >= item.min && ranked.length <= item.max) ?? RULES[2];
  const pool = ranked.length * contributionAmount;
  const allocations = [];
  let index = 0;
  while (index < ranked.length) {
    const tied = ranked.filter((score) => score.position === ranked[index].position);
    const slots = Array.from({ length: tied.length }, (_, offset) => ranked[index].position + offset);
    const sharedPool = slots.reduce((sum, position) => sum + (rule.percentages[position - 1] ?? 0) * pool, 0);
    for (const score of tied) {
      allocations.push({
        uid: score.uid,
        position: score.position,
        estimatedPrize: Math.round((sharedPool / tied.length) * 100) / 100,
        tieApplied: tied.length > 1 && sharedPool > 0,
        ruleApplied: tied.length > 1 && sharedPool > 0
          ? `${rule.label}. Empate en zona de premio: se sumaron posiciones ${slots.join(", ")} y se dividieron entre ${tied.length}.`
          : rule.label
      });
    }
    index += tied.length;
  }
  return allocations;
}
