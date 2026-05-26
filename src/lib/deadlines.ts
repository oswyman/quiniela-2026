export const REGISTRATION_CUTOFF_MINUTES = 90;

export function registrationDeadline(firstKickoffAt: Date, cutoffMinutes = REGISTRATION_CUTOFF_MINUTES) {
  return new Date(firstKickoffAt.getTime() - cutoffMinutes * 60 * 1000);
}

export function canRegisterForTournament(firstKickoffAt: Date, now = new Date(), cutoffMinutes = REGISTRATION_CUTOFF_MINUTES) {
  return now.getTime() < registrationDeadline(firstKickoffAt, cutoffMinutes).getTime();
}
