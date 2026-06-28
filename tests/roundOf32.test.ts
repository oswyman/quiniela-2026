import { describe, expect, it } from "vitest";
import { getRoundOf32Readiness } from "../functions/src/roundOf32";
import { buildRoundOf32Assignments } from "../functions/src/standings";
import type { StandingsResult, TeamStanding } from "../functions/src/standings";
import type { Match } from "@/types";

function standing(group: string, team: string, position: number, pts = 6): TeamStanding {
  return { group, team, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: pts, position, needsReview: false };
}

function thirdPlace(group: string, team: string, position: number, pts = 3): TeamStanding {
  return { group, team, played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: pts, position, needsReview: false };
}

function r32Match(id: string, num: number, home: string, away: string): Match {
  return { id, phase: "Dieciseisavos / Ronda de 32", matchNumber: num, homeTeam: home, awayTeam: away, kickoffAt: "2026-06-28T19:00:00.000Z", timezone: "UTC", status: "scheduled" };
}

const R32_MATCHES: Match[] = [
  r32Match("r73", 73, "Group A Runners Up", "Group B Runners Up"),
  r32Match("r74", 74, "Group E Winners", "Group A/B/C/D/F 3rd Place"),
  r32Match("r75", 75, "Group F Winners", "Group C Runners Up"),
  r32Match("r76", 76, "Group C Winners", "Group F Runners Up"),
  r32Match("r77", 77, "Group I Winners", "Group C/D/F/G/H 3rd Place"),
  r32Match("r78", 78, "Group E Runners Up", "Group I Runners Up"),
  r32Match("r79", 79, "Group A Winners", "Group C/E/F/H/I 3rd Place"),
  r32Match("r80", 80, "Group L Winners", "Group E/H/I/J/K 3rd Place"),
  r32Match("r81", 81, "Group D Winners", "Group B/E/F/I/J 3rd Place"),
  r32Match("r82", 82, "Group G Winners", "Group A/E/H/I/J 3rd Place"),
  r32Match("r83", 83, "Group K Runners Up", "Group L Runners Up"),
  r32Match("r84", 84, "Group H Winners", "Group J Runners Up"),
  r32Match("r85", 85, "Group B Winners", "Group E/F/G/I/J 3rd Place"),
  r32Match("r86", 86, "Group J Winners", "Group H Runners Up"),
  r32Match("r87", 87, "Group K Winners", "Group D/E/I/J/L 3rd Place"),
  r32Match("r88", 88, "Group D Runners Up", "Group G Runners Up"),
];

function groupMatch(num: number, status: Match["status"] = "finished"): Match {
  const group = String.fromCharCode(65 + Math.floor((num - 1) / 6));
  return {
    id: `g${num}`,
    phase: "Fase de grupos",
    fifaGroup: group,
    matchNumber: num,
    homeTeam: `${group} home ${num}`,
    awayTeam: `${group} away ${num}`,
    kickoffAt: "2026-06-11T19:00:00.000Z",
    timezone: "UTC",
    status
  };
}

function groupMatches(statusForLast: Match["status"] = "finished") {
  return Array.from({ length: 72 }, (_, index) => groupMatch(index + 1, index === 71 ? statusForLast : "finished"));
}

function makeStandings(advancingThirdGroups: string[]): StandingsResult {
  const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const groups: Record<string, TeamStanding[]> = {};
  for (const g of groupLetters) {
    groups[g] = [
      standing(g, `${g}1winner`, 1),
      standing(g, `${g}2runnerup`, 2),
      thirdPlace(g, `${g}3third`, 3),
      thirdPlace(g, `${g}4fourth`, 4, 1),
    ];
  }
  const bestThirds = advancingThirdGroups.map((g, i) => ({ ...groups[g][2], position: i + 1 }));
  return { groups, bestThirds, needsReview: false, reviewReasons: [] };
}

describe("buildRoundOf32Assignments — tabla oficial FIFA de terceros", () => {
  it("combinación 363 (A,B,D,E,F,G,I,L) asigna cada tercero al slot correcto", () => {
    const standings = makeStandings(["A", "B", "D", "E", "F", "G", "I", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const by = Object.fromEntries(assignments.map((a) => [a.matchNumber, a]));

    expect(by[74].awayTeam).toBe("D3third");  // M74 ← 3D
    expect(by[77].awayTeam).toBe("F3third");  // M77 ← 3F
    expect(by[79].awayTeam).toBe("E3third");  // M79 ← 3E
    expect(by[80].awayTeam).toBe("I3third");  // M80 ← 3I
    expect(by[81].awayTeam).toBe("B3third");  // M81 ← 3B
    expect(by[82].awayTeam).toBe("A3third");  // M82 ← 3A
    expect(by[85].awayTeam).toBe("G3third");  // M85 ← 3G
    expect(by[87].awayTeam).toBe("L3third");  // M87 ← 3L
    expect(by[74].needsReview).toBe(false);
  });

  it("combinación 67 (B,D,E,F,I,J,K,L) asigna correctamente", () => {
    const standings = makeStandings(["B", "D", "E", "F", "I", "J", "K", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const by = Object.fromEntries(assignments.map((a) => [a.matchNumber, a]));

    expect(by[74].awayTeam).toBe("D3third");
    expect(by[77].awayTeam).toBe("F3third");
    expect(by[79].awayTeam).toBe("E3third");
    expect(by[80].awayTeam).toBe("K3third");
    expect(by[81].awayTeam).toBe("B3third");
    expect(by[82].awayTeam).toBe("I3third");
    expect(by[85].awayTeam).toBe("J3third");
    expect(by[87].awayTeam).toBe("L3third");
  });

  it("combinación 73 (B,D,E,F,G,I,K,L) asigna correctamente", () => {
    const standings = makeStandings(["B", "D", "E", "F", "G", "I", "K", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const by = Object.fromEntries(assignments.map((a) => [a.matchNumber, a]));

    expect(by[80].awayTeam).toBe("K3third");
    expect(by[82].awayTeam).toBe("I3third");
    expect(by[85].awayTeam).toBe("G3third");
    expect(by[87].awayTeam).toBe("L3third");
  });

  it("combinación 74 (B,D,E,F,G,I,J,L) asigna correctamente", () => {
    const standings = makeStandings(["B", "D", "E", "F", "G", "I", "J", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const by = Object.fromEntries(assignments.map((a) => [a.matchNumber, a]));

    expect(by[80].awayTeam).toBe("I3third");
    expect(by[82].awayTeam).toBe("J3third");
    expect(by[85].awayTeam).toBe("G3third");
    expect(by[87].awayTeam).toBe("L3third");
  });

  it("combinación desconocida → needsReview en slots de terceros", () => {
    const standings = makeStandings(["A", "B", "C", "D", "E", "F", "G", "H"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const thirdSlots = [74, 77, 79, 80, 81, 82, 85, 87];
    for (const num of thirdSlots) {
      const a = assignments.find((x) => x.matchNumber === num);
      if (a) expect(a.needsReview).toBe(true);
    }
  });

  it("ganadores y subcampeones se resuelven sin depender de la tabla de terceros", () => {
    const standings = makeStandings(["A", "B", "D", "E", "F", "G", "I", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const by = Object.fromEntries(assignments.map((a) => [a.matchNumber, a]));

    expect(by[73].homeTeam).toBe("A2runnerup");
    expect(by[73].awayTeam).toBe("B2runnerup");
    expect(by[76].homeTeam).toBe("C1winner");
    expect(by[76].awayTeam).toBe("F2runnerup");
    expect(by[86].homeTeam).toBe("J1winner");
    expect(by[86].awayTeam).toBe("H2runnerup");
  });

  it("solo queda listo para confirmar cuando terminaron los 72 partidos de grupos", () => {
    const standings = makeStandings(["A", "B", "D", "E", "F", "G", "I", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const readiness = getRoundOf32Readiness([...groupMatches("scheduled"), ...R32_MATCHES], standings, assignments);

    expect(readiness).toMatchObject({
      groupMatchesTotal: 72,
      groupMatchesFinished: 71,
      pendingGroupMatches: [72],
      isReadyForConfirmation: false,
      requiresManualReview: false
    });
  });

  it("queda listo para confirmación manual cuando grupos terminaron y no hay revisión", () => {
    const standings = makeStandings(["A", "B", "D", "E", "F", "G", "I", "L"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const readiness = getRoundOf32Readiness([...groupMatches(), ...R32_MATCHES], standings, assignments);

    expect(readiness).toMatchObject({
      groupMatchesTotal: 72,
      groupMatchesFinished: 72,
      pendingGroupMatches: [],
      isReadyForConfirmation: true,
      requiresManualReview: false
    });
  });

  it("bloquea confirmación automática cuando la combinación requiere revisión", () => {
    const standings = makeStandings(["A", "B", "C", "D", "E", "F", "G", "H"]);
    const assignments = buildRoundOf32Assignments(R32_MATCHES, standings);
    const readiness = getRoundOf32Readiness([...groupMatches(), ...R32_MATCHES], standings, assignments);

    expect(readiness.isReadyForConfirmation).toBe(false);
    expect(readiness.requiresManualReview).toBe(true);
  });
});
