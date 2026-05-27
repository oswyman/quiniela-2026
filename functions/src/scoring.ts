export type ScoringConfig = {
  exactScore: number;
  goalDifference: number;
  winnerOrDraw: number;
  incorrect: number;
  late: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  exactScore: 3,
  goalDifference: 2,
  winnerOrDraw: 1,
  incorrect: 0,
  late: 0
};

export function calculatePredictionScore(
  prediction: { homeGoals: number; awayGoals: number; isLate: boolean },
  result: { homeGoals: number | null; awayGoals: number | null },
  scoring: ScoringConfig = DEFAULT_SCORING
) {
  if (prediction.isLate) return summary(scoring.late, "Pronostico tardio", { latePredictions: 1 });
  if (result.homeGoals === null || result.awayGoals === null) return summary(0, "Faltan datos del resultado");
  if (prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals) {
    return summary(scoring.exactScore, "Marcador exacto", { exactScores: 1, validPredictions: 1 });
  }

  if (isCorrectGoalDifference(prediction.homeGoals, prediction.awayGoals, result.homeGoals, result.awayGoals)) {
    return summary(scoring.goalDifference, "Diferencia de goles correcta", { correctGoalDifferences: 1, validPredictions: 1 });
  }

  const predicted = outcome(prediction.homeGoals, prediction.awayGoals);
  const actual = outcome(result.homeGoals, result.awayGoals);
  if (predicted === actual) {
    return actual === "DRAW"
      ? summary(scoring.winnerOrDraw, "Empate correcto", { correctDraws: 1, validPredictions: 1 })
      : summary(scoring.winnerOrDraw, "Ganador correcto", { correctWinners: 1, validPredictions: 1 });
  }

  return summary(scoring.incorrect, "Resultado incorrecto", { validPredictions: 1 });
}

export function resolveMatchResult(match: Record<string, number | null | undefined>, mode: string) {
  if (mode === "FINAL_WITH_PENALTIES") {
    return firstComplete([
      [match.finalHomeGoals, match.finalAwayGoals],
      [sumNullable(match.homeGoalsExtraTime, match.homePenaltyGoals), sumNullable(match.awayGoalsExtraTime, match.awayPenaltyGoals)],
      [match.homeGoalsExtraTime, match.awayGoalsExtraTime],
      [match.homeGoals90, match.awayGoals90]
    ]);
  }
  if (mode === "EXTRA_TIME") {
    return firstComplete([
      [match.homeGoalsExtraTime, match.awayGoalsExtraTime],
      [match.finalHomeGoals, match.finalAwayGoals],
      [match.homeGoals90, match.awayGoals90]
    ]);
  }
  return firstComplete([
    [match.homeGoals90, match.awayGoals90],
    [match.finalHomeGoals, match.finalAwayGoals]
  ]);
}

function outcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function isCorrectGoalDifference(homePred: number, awayPred: number, homeResult: number, awayResult: number) {
  const predictedDiff = homePred - awayPred;
  const actualDiff = homeResult - awayResult;
  if (predictedDiff !== actualDiff) return false;
  if (actualDiff === 0) return true;
  return homePred + awayPred >= homeResult + awayResult;
}

function firstComplete(scores: Array<[number | null | undefined, number | null | undefined]>) {
  for (const [home, away] of scores) {
    if (typeof home === "number" && typeof away === "number") return { homeGoals: home, awayGoals: away };
  }
  return { homeGoals: null, awayGoals: null };
}

function sumNullable(a?: number | null, b?: number | null) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return a + b;
}

function summary(points: number, scoringReason: string, extra = {}) {
  return {
    points,
    scoringReason,
    exactScores: 0,
    correctWinners: 0,
    correctDraws: 0,
    correctGoalDifferences: 0,
    validPredictions: 0,
    latePredictions: 0,
    ...extra
  };
}
