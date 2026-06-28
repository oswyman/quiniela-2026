import type { RoundOf32Assignment, StandingsResult } from "./standings";

type MatchLike = {
  matchNumber?: number | null;
  fifaGroup?: string | null;
  status?: string | null;
};

export type RoundOf32Readiness = {
  groupMatchesTotal: number;
  groupMatchesFinished: number;
  pendingGroupMatches: number[];
  isReadyForConfirmation: boolean;
  requiresManualReview: boolean;
  reviewReasons: string[];
};

export function getRoundOf32Readiness(
  matches: MatchLike[],
  standings: StandingsResult,
  assignments: RoundOf32Assignment[]
): RoundOf32Readiness {
  const groupMatches = matches
    .filter((match) => isGroupStageMatch(match))
    .sort((a, b) => Number(a.matchNumber ?? 0) - Number(b.matchNumber ?? 0));
  const pendingGroupMatches = groupMatches
    .filter((match) => match.status !== "finished")
    .map((match) => Number(match.matchNumber ?? 0))
    .filter((matchNumber) => matchNumber > 0);
  const unresolvedAssignments = assignments.filter((assignment) => assignment.needsReview || !assignment.homeTeam || !assignment.awayTeam);
  return {
    groupMatchesTotal: groupMatches.length,
    groupMatchesFinished: groupMatches.length - pendingGroupMatches.length,
    pendingGroupMatches,
    isReadyForConfirmation: groupMatches.length >= 72 && pendingGroupMatches.length === 0 && assignments.length === 16 && unresolvedAssignments.length === 0,
    requiresManualReview: standings.needsReview || unresolvedAssignments.length > 0,
    reviewReasons: standings.reviewReasons
  };
}

function isGroupStageMatch(match: MatchLike) {
  return Boolean(match.fifaGroup) || Number(match.matchNumber ?? 0) <= 72;
}
