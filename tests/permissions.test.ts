import { describe, expect, it } from "vitest";
import { canCreateGroup } from "@/lib/permissions";

describe("canCreateGroup", () => {
  it("allows platform and group admins only", () => {
    expect(canCreateGroup({ roleGlobal: "platform_admin" })).toBe(true);
    expect(canCreateGroup({ roleGlobal: "group_admin" })).toBe(true);
    expect(canCreateGroup({ roleGlobal: "user" })).toBe(false);
    expect(canCreateGroup(null)).toBe(false);
  });
});
