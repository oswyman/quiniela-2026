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
  type?: "group_admin" | "participant";
};

export type Match = {
  id: string;
  provider?: "manual" | "mock" | "sportmonks" | "api-football";
  providerMatchId?: string;
  matchNumber?: number | null;
  phase: string;
  fifaGroup?: string;
  venue?: string | null;
  homeTeamId?: string | number | null;
  awayTeamId?: string | number | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: unknown;
  timezone: string;
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
  updatedAt?: unknown;
  lastSyncedAt?: unknown;
  rawProviderStatus?: string | null;
};

export type Prediction = {
  id: string;
  uid: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  submittedAt?: unknown;
  updatedAt?: unknown;
  status: PredictionStatus;
  isLate: boolean;
  points: number;
  scoringReason: string;
};

export type Score = {
  uid: string;
  displayName?: string;
  totalPoints: number;
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
