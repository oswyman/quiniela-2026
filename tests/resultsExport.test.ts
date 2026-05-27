import { describe, expect, it } from "vitest";
import { generateResultsCsv } from "@/lib/resultsExport";
import type { Group, Match } from "@/types";

describe("generateResultsCsv", () => {
  it("exports match, prediction and ranking details", () => {
    const matches = [{
      id: "m1",
      matchNumber: 1,
      phase: "Fase de grupos",
      fifaGroup: "A",
      homeTeam: "Mexico",
      awayTeam: "Canada",
      kickoffAt: new Date("2026-06-11T19:00:00Z"),
      timezone: "America/Mexico_City",
      venue: "Estadio Azteca",
      status: "finished",
      homeGoals90: 2,
      awayGoals90: 1,
      winnerTeam: "Mexico"
    } as Match];
    const group = { id: "g1", name: "Padel", currency: "MXN", contributionAmount: 500 } as Group;
    const csv = generateResultsCsv(matches, [{
      group,
      members: [{ uid: "u1", displayName: "Oswy", email: "o@test.com", role: "participant", paymentStatus: "paid", status: "active" }],
      predictions: [{ id: "p1", uid: "u1", matchId: "m1", pickType: "GROUP_OUTCOME", pick: "HOME", status: "valid", isLate: false, points: 1, isCorrect: true, scoringReason: "Acierto" }],
      scores: [{ uid: "u1", displayName: "Oswy", totalPoints: 1, totalCorrect: 1, correctGroupPicks: 1, correctAdvancingPicks: 0, exactScores: 0, correctWinners: 0, correctDraws: 0, correctGoalDifferences: 0, validPredictions: 1, latePredictions: 0 }],
      prizes: [{ uid: "u1", position: 1, estimatedPrize: 1000, tieApplied: false, ruleApplied: "demo" }]
    }]);

    expect(csv).toContain("seccion,grupo_quiniela");
    expect(csv).toContain("partido,,,1,Fase de grupos,A,Mexico,Canada");
    expect(csv).toContain("pronostico,Padel,Oswy,1,Fase de grupos,A,Mexico,Canada");
    expect(csv).toContain("HOME,si,1,1000,paid");
  });
});
