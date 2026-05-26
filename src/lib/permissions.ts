import type { GroupRole, UserProfile } from "@/types";

export function isPlatformAdmin(user?: Pick<UserProfile, "roleGlobal"> | null) {
  return user?.roleGlobal === "platform_admin";
}

export function canCreateGroup(user?: Pick<UserProfile, "roleGlobal"> | null) {
  return user?.roleGlobal === "platform_admin" || user?.roleGlobal === "group_admin";
}

export function canManageGroup(memberRole?: GroupRole | null) {
  return memberRole === "group_admin";
}

export function canEditPrediction(params: { isOwner: boolean; isClosed: boolean }) {
  return params.isOwner && !params.isClosed;
}
