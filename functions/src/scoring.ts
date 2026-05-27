export type PredictionPickType = "GROUP_OUTCOME" | "ADVANCING_TEAM";
export type GroupPick = "HOME" | "DRAW" | "AWAY";

type PredictionLike = {
  homeGoals?: number;
  awayGoals?: number;
  isLate?: boolean;
  pickType?: PredictionPickType;
  pick?: string;
};

type MatchLike = {
  matchNumber?: number | null;
  fifaGroup?: string | null;
  homeTeam: string;
  awayTeam: string;
  resolvedHomeTeam?: string | null;
  resolvedAwayTeam?: string | null;
  homeGoals90?: number | null;
  awayGoals90?: number | null;
  winnerTeam?: string | null;
};

export function calculatePredictionScore(prediction: PredictionLike, match: MatchLike) {
  if (prediction.isLate) return summary(0, "Pronostico tardio", { latePredictions: 1 });
  const pickType = prediction.pickType ?? inferPickType(match);
  const pick = prediction.pick ?? legacyPredictionToPick(prediction);
  if (!pick) return summary(0, "Pronostico pendiente");

  if (pickType === "GROUP_OUTCOME") {
    const actual = resolveGroupOutcome(match);
    if (!actual) return summary(0, "Falta resultado de fase de grupos");
    const correct = pick === actual;
    return summary(correct ? 1 : 0, correct ? "Acierto de resultado" : "No acertado", {
      validPredictions: 1,
      totalCorrect: correct ? 1 : 0,
      correctGroupPicks: correct ? 1 : 0,
      isCorrect: correct
    });
  }

  const winner = resolveAdvancingTeam(match);
  if (!winner) return summary(0, "Falta equipo que avanza");
  const correct = normalizeTeam(pick) === normalizeTeam(winner);
  return summary(correct ? 1 : 0, correct ? "Acierto de clasificado" : "No acertado", {
    validPredictions: 1,
    totalCorrect: correct ? 1 : 0,
    correctAdvancingPicks: correct ? 1 : 0,
    isCorrect: correct
  });
}

export function inferPickType(match: MatchLike): PredictionPickType {
  return isGroupStage(match) ? "GROUP_OUTCOME" : "ADVANCING_TEAM";
}

export function legacyPredictionToPick(prediction: Pick<PredictionLike, "homeGoals" | "awayGoals">): GroupPick | null {
  if (typeof prediction.homeGoals !== "number" || typeof prediction.awayGoals !== "number") return null;
  if (prediction.homeGoals > prediction.awayGoals) return "HOME";
  if (prediction.awayGoals > prediction.homeGoals) return "AWAY";
  return "DRAW";
}

export function resolveGroupOutcome(match: MatchLike): GroupPick | null {
  if (typeof match.homeGoals90 !== "number" || typeof match.awayGoals90 !== "number") return null;
  if (match.homeGoals90 > match.awayGoals90) return "HOME";
  if (match.awayGoals90 > match.homeGoals90) return "AWAY";
  return "DRAW";
}

export function resolveAdvancingTeam(match: MatchLike) {
  if (match.winnerTeam) return match.winnerTeam;
  const home = match.resolvedHomeTeam || match.homeTeam;
  const away = match.resolvedAwayTeam || match.awayTeam;
  if (typeof match.homeGoals90 === "number" && typeof match.awayGoals90 === "number" && match.homeGoals90 !== match.awayGoals90) {
    return match.homeGoals90 > match.awayGoals90 ? home : away;
  }
  return null;
}

function isGroupStage(match: MatchLike) {
  return Boolean(match.fifaGroup) || Number(match.matchNumber ?? 0) <= 72;
}

function normalizeTeam(value: string) {
  return value.trim().toLowerCase();
}

function summary(points: number, scoringReason: string, extra: Record<string, unknown> = {}) {
  return {
    points,
    scoringReason,
    totalCorrect: 0,
    correctGroupPicks: 0,
    correctAdvancingPicks: 0,
    validPredictions: 0,
    latePredictions: 0,
    isCorrect: false,
    ...extra
  };
}
