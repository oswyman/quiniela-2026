export const PREDICTION_CUTOFF_MINUTES = 90;

export function predictionDeadline(kickoffAt: Date, cutoffMinutes = PREDICTION_CUTOFF_MINUTES) {
  return new Date(kickoffAt.getTime() - cutoffMinutes * 60 * 1000);
}

export function canEditPredictionBeforeKickoff(kickoffAt: Date, now = new Date(), cutoffMinutes = PREDICTION_CUTOFF_MINUTES) {
  return now.getTime() < predictionDeadline(kickoffAt, cutoffMinutes).getTime();
}
