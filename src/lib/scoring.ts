import type { Match, Prediction } from "@/types";
import { canEditPredictionBeforeKickoff, PREDICTION_CUTOFF_MINUTES, predictionDeadline } from "./deadlines";

export type PredictionPickType = "GROUP_OUTCOME" | "ADVANCING_TEAM";
export type GroupPick = "HOME" | "DRAW" | "AWAY";

export function calculatePredictionScore(prediction: Partial<Prediction>, match: Match) {
  if (prediction.isLate) return score(0, "Pronostico tardio", { latePredictions: 1 });
  const pickType = prediction.pickType ?? inferPickType(match);
  const pick = prediction.pick ?? legacyPredictionToPick(prediction);
  if (!pick) return score(0, "Pronostico pendiente");

  if (pickType === "GROUP_OUTCOME") {
    const actual = resolveGroupOutcome(match);
    if (!actual) return score(0, "Falta resultado de fase de grupos");
    const correct = pick === actual;
    return score(correct ? 1 : 0, correct ? "Acierto de resultado" : "No acertado", {
      validPredictions: 1,
      totalCorrect: correct ? 1 : 0,
      correctGroupPicks: correct ? 1 : 0,
      isCorrect: correct
    });
  }

  const winner = resolveAdvancingTeam(match);
  if (!winner) return score(0, "Falta equipo que avanza");
  const correct = normalizeTeam(pick) === normalizeTeam(winner);
  return score(correct ? 1 : 0, correct ? "Acierto de clasificado" : "No acertado", {
    validPredictions: 1,
    totalCorrect: correct ? 1 : 0,
    correctAdvancingPicks: correct ? 1 : 0,
    isCorrect: correct
  });
}

export function inferPickType(match: Pick<Match, "matchNumber" | "fifaGroup">): PredictionPickType {
  return Boolean(match.fifaGroup) || Number(match.matchNumber ?? 0) <= 72 ? "GROUP_OUTCOME" : "ADVANCING_TEAM";
}

export function legacyPredictionToPick(prediction: Partial<Pick<Prediction, "homeGoals" | "awayGoals">>): GroupPick | null {
  if (typeof prediction.homeGoals !== "number" || typeof prediction.awayGoals !== "number") return null;
  if (prediction.homeGoals > prediction.awayGoals) return "HOME";
  if (prediction.awayGoals > prediction.homeGoals) return "AWAY";
  return "DRAW";
}

export function resolveGroupOutcome(match: Pick<Match, "homeGoals90" | "awayGoals90">): GroupPick | null {
  if (typeof match.homeGoals90 !== "number" || typeof match.awayGoals90 !== "number") return null;
  if (match.homeGoals90 > match.awayGoals90) return "HOME";
  if (match.awayGoals90 > match.homeGoals90) return "AWAY";
  return "DRAW";
}

export function resolveAdvancingTeam(match: Pick<Match, "winnerTeam" | "homeTeam" | "awayTeam" | "resolvedHomeTeam" | "resolvedAwayTeam" | "homeGoals90" | "awayGoals90">) {
  if (match.winnerTeam) return match.winnerTeam;
  const home = match.resolvedHomeTeam || match.homeTeam;
  const away = match.resolvedAwayTeam || match.awayTeam;
  if (typeof match.homeGoals90 === "number" && typeof match.awayGoals90 === "number" && match.homeGoals90 !== match.awayGoals90) {
    return match.homeGoals90 > match.awayGoals90 ? home : away;
  }
  return null;
}

export function isMatchClosed(kickoffAt: Date, now = new Date()): boolean {
  return !canEditPredictionBeforeKickoff(kickoffAt, now, PREDICTION_CUTOFF_MINUTES);
}

export function predictionClosesAt(kickoffAt: Date) {
  return predictionDeadline(kickoffAt, PREDICTION_CUTOFF_MINUTES);
}

function normalizeTeam(value: string) {
  return value.trim().toLowerCase();
}

function score(points: number, scoringReason: string, extra: Record<string, unknown> = {}) {
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
