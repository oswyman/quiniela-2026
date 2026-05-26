import { describe, expect, it } from "vitest";
import { canRegisterForTournament, registrationDeadline } from "@/lib/deadlines";

describe("registrationDeadline", () => {
  const firstKickoff = new Date("2026-06-11T19:00:00-06:00");

  it("closes registration 90 minutes before the first World Cup kickoff by default", () => {
    expect(registrationDeadline(firstKickoff).toISOString()).toBe("2026-06-11T23:30:00.000Z");
  });

  it("allows registration before the cutoff and rejects at the cutoff", () => {
    expect(canRegisterForTournament(firstKickoff, new Date("2026-06-11T23:29:59.000Z"))).toBe(true);
    expect(canRegisterForTournament(firstKickoff, new Date("2026-06-11T23:30:00.000Z"))).toBe(false);
  });
});
