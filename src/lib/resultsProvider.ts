import type { Match } from "@/types";

export type ResultsProvider = {
  getFixtures(): Promise<Partial<Match>[]>;
  getResults(): Promise<Partial<Match>[]>;
};

export function createResultsProvider(): ResultsProvider {
  const provider = process.env.RESULTS_API_PROVIDER ?? "mock";

  if (provider !== "mock") {
    return {
      async getFixtures() {
        throw new Error("Proveedor real no configurado. Usa RESULTS_API_PROVIDER=mock o implementa el adaptador.");
      },
      async getResults() {
        throw new Error("Proveedor real no configurado. Usa RESULTS_API_PROVIDER=mock o implementa el adaptador.");
      }
    };
  }

  return {
    async getFixtures() {
      return [
        {
          id: "mock-mex-can-2026",
          phase: "Grupos",
          fifaGroup: "A",
          homeTeam: "Mexico",
          awayTeam: "Canada",
          kickoffAt: new Date("2026-06-11T19:00:00-06:00"),
          timezone: "America/Mexico_City",
          status: "scheduled"
        }
      ];
    },
    async getResults() {
      return [
        {
          id: "mock-mex-can-2026",
          status: "finished",
          homeGoals90: 2,
          awayGoals90: 1,
          finalHomeGoals: 2,
          finalAwayGoals: 1,
          winnerTeam: "Mexico"
        }
      ];
    }
  };
}
