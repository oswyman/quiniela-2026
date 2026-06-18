import { describe, expect, it } from "vitest";
import { canEditPredictionBeforeKickoff, predictionDeadline } from "@/lib/deadlines";

describe("predictionDeadline", () => {
  const kickoff = new Date("2026-06-11T19:00:00-06:00");

  it("closes each match 90 minutes before kickoff by default", () => {
    expect(predictionDeadline(kickoff).toISOString()).toBe("2026-06-11T23:30:00.000Z");
  });

  it("allows predictions before the cutoff and rejects at the cutoff", () => {
    expect(canEditPredictionBeforeKickoff(kickoff, new Date("2026-06-11T23:29:59.000Z"))).toBe(true);
    expect(canEditPredictionBeforeKickoff(kickoff, new Date("2026-06-11T23:30:00.000Z"))).toBe(false);
  });
});
