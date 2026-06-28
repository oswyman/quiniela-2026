export type GlobalRole = "platform_admin" | "group_admin" | "user";
export type GroupRole = "group_admin" | "participant";
export type GroupStatus = "draft" | "active" | "closed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "not_applicable";
export type MemberStatus = "active" | "inactive";
export type ValidResultMode = "NINETY" | "EXTRA_TIME" | "FINAL_WITH_PENALTIES";
export type PredictionVisibility = "AFTER_CLOSE" | "BEFORE_CLOSE";
export type PrizeRuleMode = "DEFAULT";
export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type PredictionStatus = "valid" | "late" | "void";
export type PredictionPickType = "GROUP_OUTCOME" | "ADVANCING_TEAM";
export type PredictionPick = "HOME" | "DRAW" | "AWAY" | string;

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  createdAt?: unknown;
  roleGlobal: GlobalRole;
};

export type Group = {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt?: unknown;
  status: GroupStatus;
  currency: string;
  contributionAmount: number;
  moneyResponsibleName: string;
  moneyResponsibleEmail: string;
  validResultMode: ValidResultMode;
  predictionVisibility: PredictionVisibility;
  minParticipants: number;
  prizeRuleMode: PrizeRuleMode;
  legalDisclaimerAccepted: boolean;
  firstTournamentKickoffAt?: unknown;
  registrationDeadlineAt?: unknown;
  deletedAt?: unknown;
  cancelledAt?: unknown;
  lockedAt?: unknown;
};

export type Member = {
  uid: string;
  displayName: string;
  email: string;
  role: GroupRole;
  paymentStatus: PaymentStatus;
  joinedAt?: unknown;
  status: MemberStatus;
};

export type Invite = {
  code: string;
  groupId: string;
  createdBy: string;
  createdAt?: unknown;
  expiresAt?: unknown;
  maxUses: number;
  usedCount: number;
  status: "active" | "expired" | "disabled";
  inviteeEmail?: string;
  role?: GroupRole;
  usedAt?: unknown;
  usedByUid?: string;
  type?: "group_admin" | "participant" | "open";
};

export type Match = {
  id: string;
  provider?: "manual" | "mock" | "sportmonks" | "api-football";
  providerMatchId?: string;
  matchNumber?: number | null;
  phase: string;
  fifaGroup?: string;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  homeTeamId?: string | number | null;
  awayTeamId?: string | number | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: unknown;
  timezone: string;
  sourceTimezone?: string | null;
  sourceLocalDate?: string | null;
  sourceLocalTime?: string | null;
  displayTimeMode?: "cdmx" | "local" | "venue";
  sourceName?: string | null;
  sourceUrl?: string | null;
  referenceUrl?: string | null;
  notes?: string | null;
  homeSeedLabel?: string | null;
  awaySeedLabel?: string | null;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeSourceOutcome?: "winner" | "loser" | null;
  awaySourceOutcome?: "winner" | "loser" | null;
  resolvedHomeTeam?: string | null;
  resolvedAwayTeam?: string | null;
  isResolved?: boolean;
  isPublishedToParticipants?: boolean;
  publishedAt?: unknown;
  publishedBy?: string | null;
  status: MatchStatus;
  homeGoals90?: number | null;
  awayGoals90?: number | null;
  homeGoalsExtraTime?: number | null;
  awayGoalsExtraTime?: number | null;
  homePenaltyGoals?: number | null;
  awayPenaltyGoals?: number | null;
  finalHomeGoals?: number | null;
  finalAwayGoals?: number | null;
  winnerTeam?: string | null;
  groupStandingsImpact?: unknown;
  resultLockedAt?: unknown;
  resultUpdatedBy?: string | null;
  resultSource?: "manual" | "api" | null;
  updatedAt?: unknown;
  lastSyncedAt?: unknown;
  rawProviderStatus?: string | null;
};

export type Prediction = {
  id: string;
  uid: string;
  matchId: string;
  pickType?: PredictionPickType;
  pick?: PredictionPick;
  homeGoals?: number | null;
  awayGoals?: number | null;
  submittedAt?: unknown;
  updatedAt?: unknown;
  status: PredictionStatus;
  isLate: boolean;
  points: number;
  totalCorrect?: number;
  isCorrect?: boolean | null;
  scoringReason: string;
};

export type Score = {
  uid: string;
  displayName?: string;
  totalPoints: number;
  totalCorrect?: number;
  correctGroupPicks?: number;
  correctAdvancingPicks?: number;
  exactScores: number;
  correctWinners: number;
  correctDraws: number;
  correctGoalDifferences: number;
  validPredictions: number;
  latePredictions: number;
  updatedAt?: unknown;
};

export type Prize = {
  uid: string;
  position: number;
  estimatedPrize: number;
  tieApplied: boolean;
  ruleApplied: string;
  updatedAt?: unknown;
};

export type AuditLog = {
  id: string;
  actorUid: string;
  groupId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt?: unknown;
};

export type ProviderStatus = {
  provider: "manual" | "mock" | "sportmonks" | "api-football" | "disabled";
  status: "healthy" | "degraded" | "error" | "idle" | "syncing";
  lastFixturesSyncAt?: unknown;
  lastLiveSyncAt?: unknown;
  message?: string;
  updatedAt?: unknown;
};

export type TournamentConfig = {
  firstKickoffAt?: unknown;
  registrationCutoffMinutes: number;
  resultsMode: "manual" | "api-football" | "mock" | "sportmonks";
};

export type TeamStanding = {
  group: string;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  needsReview: boolean;
};

export type RoundOf32Assignment = {
  matchId: string;
  matchNumber: number;
  homeTeam: string | null;
  awayTeam: string | null;
  homeSeedLabel: string;
  awaySeedLabel: string;
  needsReview: boolean;
};

export type RoundOf32Readiness = {
  groupMatchesTotal: number;
  groupMatchesFinished: number;
  pendingGroupMatches: number[];
  isReadyForConfirmation: boolean;
  requiresManualReview: boolean;
  reviewReasons: string[];
};
