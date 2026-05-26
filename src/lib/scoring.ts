import type { Match, Prediction, ValidResultMode } from "@/types";

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

export type ScoreResult = {
  points: number;
  code:
    | "LATE"
    | "NO_RESULT"
    | "EXACT_SCORE"
    | "GOAL_DIFFERENCE"
    | "CORRECT_WINNER"
    | "CORRECT_DRAW"
    | "INCORRECT";
  reason: string;
  exactScores: number;
  correctWinners: number;
  correctDraws: number;
  correctGoalDifferences: number;
  validPredictions: number;
  latePredictions: number;
};

export function calculatePredictionScore(
  prediction: Pick<Prediction, "homeGoals" | "awayGoals" | "isLate">,
  result: { homeGoals: number | null; awayGoals: number | null },
  config: ScoringConfig = DEFAULT_SCORING
): ScoreResult {
  if (prediction.isLate) {
    return buildScore(config.late, "LATE", "Pronostico tardio", { latePredictions: 1 });
  }

  if (result.homeGoals === null || result.awayGoals === null) {
    return buildScore(0, "NO_RESULT", "Faltan datos del resultado");
  }

  if (prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals) {
    return buildScore(config.exactScore, "EXACT_SCORE", "Marcador exacto", {
      exactScores: 1,
      validPredictions: 1
    });
  }

  const predictedOutcome = outcome(prediction.homeGoals, prediction.awayGoals);
  const actualOutcome = outcome(result.homeGoals, result.awayGoals);
  const predictedDiff = prediction.homeGoals - prediction.awayGoals;
  const actualDiff = result.homeGoals - result.awayGoals;

  if (isCorrectGoalDifference(prediction.homeGoals, prediction.awayGoals, result.homeGoals, result.awayGoals)) {
    return buildScore(config.goalDifference, "GOAL_DIFFERENCE", "Diferencia de goles correcta", {
      correctGoalDifferences: 1,
      validPredictions: 1
    });
  }

  if (predictedOutcome === actualOutcome) {
    if (actualOutcome === "DRAW") {
      return buildScore(config.winnerOrDraw, "CORRECT_DRAW", "Empate correcto", {
        correctDraws: 1,
        validPredictions: 1
      });
    }

    return buildScore(config.winnerOrDraw, "CORRECT_WINNER", "Ganador correcto", {
      correctWinners: 1,
      validPredictions: 1
    });
  }

  return buildScore(config.incorrect, "INCORRECT", "Resultado incorrecto", { validPredictions: 1 });
}

export function resolveMatchResult(
  match: Match,
  resultMode: ValidResultMode
): { homeGoals: number | null; awayGoals: number | null } {
  if (resultMode === "FINAL_WITH_PENALTIES") {
    return firstComplete([
      [match.finalHomeGoals, match.finalAwayGoals],
      [sumNullable(match.homeGoalsExtraTime, match.homePenaltyGoals), sumNullable(match.awayGoalsExtraTime, match.awayPenaltyGoals)],
      [match.homeGoalsExtraTime, match.awayGoalsExtraTime],
      [match.homeGoals90, match.awayGoals90]
    ]);
  }

  if (resultMode === "EXTRA_TIME") {
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

export function isMatchClosed(kickoffAt: Date, now = new Date()): boolean {
  return now.getTime() >= kickoffAt.getTime();
}

function outcome(home: number, away: number): "HOME" | "AWAY" | "DRAW" {
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
    if (typeof home === "number" && typeof away === "number") {
      return { homeGoals: home, awayGoals: away };
    }
  }

  return { homeGoals: null, awayGoals: null };
}

function sumNullable(a?: number | null, b?: number | null) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return a + b;
}

function buildScore(
  points: number,
  code: ScoreResult["code"],
  reason: string,
  counters: Partial<Omit<ScoreResult, "points" | "code" | "reason">> = {}
): ScoreResult {
  return {
    points,
    code,
    reason,
    exactScores: 0,
    correctWinners: 0,
    correctDraws: 0,
    correctGoalDifferences: 0,
    validPredictions: 0,
    latePredictions: 0,
    ...counters
  };
}
