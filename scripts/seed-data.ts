/**
 * seed-data.ts — Datos estáticos para el script de seed del emulador.
 * Define: usuarios, partidos y picks por usuario.
 */

export const GROUP_ID = "grupo-test-2026";
export const PASSWORD = "Test1234!";

// ── Usuarios ────────────────────────────────────────────────────────────────

export interface SeedUser {
  uid: string;
  email: string;
  displayName: string;
  roleGlobal: "platform_admin" | "user";
  paymentStatus: "paid" | "pending" | "not_applicable";
  isGroupAdmin?: boolean;
}

export const USERS: SeedUser[] = [
  { uid: "uid-alice",  email: "alice@test.com",  displayName: "Alice Ramírez",  roleGlobal: "user",           paymentStatus: "paid",           isGroupAdmin: true },
  { uid: "uid-bob",    email: "bob@test.com",    displayName: "Bob Téllez",      roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-carlos", email: "carlos@test.com", displayName: "Carlos Vega",     roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-diana",  email: "diana@test.com",  displayName: "Diana Mora",      roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-eva",    email: "eva@test.com",    displayName: "Eva Soto",        roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-felix",  email: "felix@test.com",  displayName: "Félix Luna",      roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-gina",   email: "gina@test.com",   displayName: "Gina Reyes",      roleGlobal: "user",           paymentStatus: "paid"  },
  { uid: "uid-hugo",   email: "hugo@test.com",   displayName: "Hugo Díaz",       roleGlobal: "user",           paymentStatus: "pending" },
  { uid: "uid-admin",  email: "admin@test.com",  displayName: "Admin Test",      roleGlobal: "platform_admin", paymentStatus: "not_applicable" },
];

// Participantes del grupo (todos menos el admin)
export const PARTICIPANTS = USERS.filter(u => u.roleGlobal === "user");

// ── Partidos ─────────────────────────────────────────────────────────────────

export type SeedMatch = {
  id: string;
  matchNumber: number;
  phase: string;
  fifaGroup?: string;
  homeTeam: string;
  awayTeam: string;
  status: "finished" | "scheduled";
  // Resultados (solo para finished)
  homeGoals90?: number;
  awayGoals90?: number;
  winnerTeam?: string; // knockout only
  // Horas relativas al momento del seed (en minutos)
  kickoffOffsetMinutes: number; // negativo = pasado, positivo = futuro
};

export const MATCHES: SeedMatch[] = [
  // ── Fase de grupos (finished) ──────────────────────────────────────────
  {
    id: "m01", matchNumber: 1,
    phase: "Fase de grupos", fifaGroup: "A",
    homeTeam: "Mexico", awayTeam: "South Africa",
    status: "finished", homeGoals90: 2, awayGoals90: 1,
    kickoffOffsetMinutes: -200,
  },
  {
    id: "m02", matchNumber: 2,
    phase: "Fase de grupos", fifaGroup: "A",
    homeTeam: "Korea Republic", awayTeam: "Czechia",
    status: "finished", homeGoals90: 1, awayGoals90: 1,
    kickoffOffsetMinutes: -300,
  },
  {
    id: "m03", matchNumber: 3,
    phase: "Fase de grupos", fifaGroup: "B",
    homeTeam: "Canada", awayTeam: "Bosnia and Herzegovina",
    status: "finished", homeGoals90: 0, awayGoals90: 2,
    kickoffOffsetMinutes: -400,
  },
  {
    id: "m04", matchNumber: 4,
    phase: "Fase de grupos", fifaGroup: "B",
    homeTeam: "United States", awayTeam: "Paraguay",
    status: "finished", homeGoals90: 3, awayGoals90: 0,
    kickoffOffsetMinutes: -500,
  },
  {
    id: "m05", matchNumber: 5,
    phase: "Fase de grupos", fifaGroup: "C",
    homeTeam: "Argentina", awayTeam: "France",
    status: "finished", homeGoals90: 1, awayGoals90: 0,
    kickoffOffsetMinutes: -600,
  },
  {
    id: "m06", matchNumber: 6,
    phase: "Fase de grupos", fifaGroup: "C",
    homeTeam: "Brazil", awayTeam: "Germany",
    status: "finished", homeGoals90: 2, awayGoals90: 2,
    kickoffOffsetMinutes: -700,
  },
  {
    id: "m07", matchNumber: 7,
    phase: "Fase de grupos", fifaGroup: "D",
    homeTeam: "Spain", awayTeam: "Portugal",
    status: "finished", homeGoals90: 1, awayGoals90: 2,
    kickoffOffsetMinutes: -800,
  },
  {
    id: "m08", matchNumber: 8,
    phase: "Fase de grupos", fifaGroup: "D",
    homeTeam: "England", awayTeam: "Netherlands",
    status: "finished", homeGoals90: 0, awayGoals90: 0,
    kickoffOffsetMinutes: -900,
  },
  {
    id: "m09", matchNumber: 9,
    phase: "Fase de grupos", fifaGroup: "E",
    homeTeam: "Japan", awayTeam: "Morocco",
    status: "finished", homeGoals90: 2, awayGoals90: 1,
    kickoffOffsetMinutes: -1000,
  },
  {
    id: "m10", matchNumber: 10,
    phase: "Fase de grupos", fifaGroup: "E",
    homeTeam: "Nigeria", awayTeam: "Uruguay",
    status: "finished", homeGoals90: 1, awayGoals90: 3,
    kickoffOffsetMinutes: -1100,
  },
  // ── Fase de grupos (scheduled) ─────────────────────────────────────────
  {
    id: "m11", matchNumber: 11,
    phase: "Fase de grupos", fifaGroup: "F",
    homeTeam: "Colombia", awayTeam: "Ecuador",
    status: "scheduled",
    kickoffOffsetMinutes: 24 * 60, // +24h
  },
  {
    id: "m12", matchNumber: 12,
    phase: "Fase de grupos", fifaGroup: "F",
    homeTeam: "Senegal", awayTeam: "Ghana",
    status: "scheduled",
    kickoffOffsetMinutes: 48 * 60, // +48h
  },
  // ── Eliminación directa (finished) ────────────────────────────────────
  {
    id: "m73", matchNumber: 73,
    phase: "Ronda de 32",
    homeTeam: "Argentina", awayTeam: "Korea Republic",
    status: "finished", homeGoals90: 2, awayGoals90: 0,
    winnerTeam: "Argentina",
    kickoffOffsetMinutes: -1500,
  },
  {
    id: "m74", matchNumber: 74,
    phase: "Cuartos de final",
    homeTeam: "United States", awayTeam: "Mexico",
    status: "finished", homeGoals90: 1, awayGoals90: 0,
    winnerTeam: "United States",
    kickoffOffsetMinutes: -1600,
  },
  // ── Eliminación directa (scheduled) ───────────────────────────────────
  {
    id: "m75", matchNumber: 75,
    phase: "Semifinal",
    homeTeam: "France", awayTeam: "Brazil",
    status: "scheduled",
    kickoffOffsetMinutes: 72 * 60, // +72h
  },
];

// ── Picks por usuario ─────────────────────────────────────────────────────────
//
// Resultados correctos de los partidos finished:
//   m01: HOME (Mexico 2-1)      m06: DRAW  (Brazil 2-2)
//   m02: DRAW (Korea 1-1)       m07: AWAY  (Portugal 1-2)
//   m03: AWAY (Bosnia 0-2)      m08: DRAW  (0-0)
//   m04: HOME (USA 3-0)         m09: HOME  (Japan 2-1)
//   m05: HOME (Argentina 1-0)   m10: AWAY  (Uruguay 1-3)
//   m73: Argentina              m74: United States
//
// Partidos scheduled → picks válidos (botones activos en UI):
//   m11: HOME   m12: HOME   m75: France
//
// Convención:
//   null  = no hay predicción (partido se omite)
//   "LATE" suffix añadido externamente en seed.ts según lista de late UIDs

export type UserPick = {
  matchId: string;
  pick: string;
  isLate?: boolean;
};

// alice: 10/12 correctas — líder
export const PICKS_ALICE: UserPick[] = [
  { matchId: "m01", pick: "HOME" },    // ✅
  { matchId: "m02", pick: "DRAW" },    // ✅
  { matchId: "m03", pick: "AWAY" },    // ✅
  { matchId: "m04", pick: "HOME" },    // ✅
  { matchId: "m05", pick: "HOME" },    // ✅
  { matchId: "m06", pick: "DRAW" },    // ✅
  { matchId: "m07", pick: "AWAY" },    // ✅
  { matchId: "m08", pick: "DRAW" },    // ✅
  { matchId: "m09", pick: "HOME" },    // ✅
  { matchId: "m10", pick: "HOME" },    // ❌ (Uruguay gana)
  { matchId: "m73", pick: "Argentina" },  // ✅
  { matchId: "m74", pick: "Mexico" },     // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// bob: 8/12 correctas — 2do lugar
export const PICKS_BOB: UserPick[] = [
  { matchId: "m01", pick: "HOME" },    // ✅
  { matchId: "m02", pick: "DRAW" },    // ✅
  { matchId: "m03", pick: "HOME" },    // ❌
  { matchId: "m04", pick: "HOME" },    // ✅
  { matchId: "m05", pick: "HOME" },    // ✅
  { matchId: "m06", pick: "HOME" },    // ❌
  { matchId: "m07", pick: "AWAY" },    // ✅
  { matchId: "m08", pick: "DRAW" },    // ✅
  { matchId: "m09", pick: "HOME" },    // ✅
  { matchId: "m10", pick: "HOME" },    // ❌
  { matchId: "m73", pick: "Argentina" },  // ✅
  { matchId: "m74", pick: "Mexico" },     // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// carlos: 7/12 correctas + 1 tardío (m05 = 0pts aunque sea correcto)
export const PICKS_CARLOS: UserPick[] = [
  { matchId: "m01", pick: "HOME" },          // ✅
  { matchId: "m02", pick: "DRAW" },          // ✅
  { matchId: "m03", pick: "AWAY" },          // ✅
  { matchId: "m04", pick: "HOME" },          // ✅
  { matchId: "m05", pick: "HOME", isLate: true }, // correcto pero TARDÍO → 0 pts
  { matchId: "m06", pick: "HOME" },          // ❌
  { matchId: "m07", pick: "HOME" },          // ❌
  { matchId: "m08", pick: "DRAW" },          // ✅
  { matchId: "m09", pick: "HOME" },          // ✅
  { matchId: "m10", pick: "HOME" },          // ❌
  { matchId: "m73", pick: "Argentina" },     // ✅
  { matchId: "m74", pick: "Mexico" },        // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// diana: 7/12 correctas + omite m03
export const PICKS_DIANA: UserPick[] = [
  { matchId: "m01", pick: "HOME" },    // ✅
  { matchId: "m02", pick: "DRAW" },    // ✅
  // m03: no pronosticó
  { matchId: "m04", pick: "HOME" },    // ✅
  { matchId: "m05", pick: "HOME" },    // ✅
  { matchId: "m06", pick: "HOME" },    // ❌
  { matchId: "m07", pick: "HOME" },    // ❌
  { matchId: "m08", pick: "DRAW" },    // ✅
  { matchId: "m09", pick: "HOME" },    // ✅
  { matchId: "m10", pick: "AWAY" },    // ✅
  { matchId: "m73", pick: "Argentina" },  // ✅
  { matchId: "m74", pick: "Mexico" },     // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// eva: 6/12 correctas — empate con felix
export const PICKS_EVA: UserPick[] = [
  { matchId: "m01", pick: "HOME" },    // ✅
  { matchId: "m02", pick: "HOME" },    // ❌
  { matchId: "m03", pick: "HOME" },    // ❌
  { matchId: "m04", pick: "HOME" },    // ✅
  { matchId: "m05", pick: "HOME" },    // ✅
  { matchId: "m06", pick: "HOME" },    // ❌
  { matchId: "m07", pick: "AWAY" },    // ✅
  { matchId: "m08", pick: "HOME" },    // ❌
  { matchId: "m09", pick: "HOME" },    // ✅
  { matchId: "m10", pick: "AWAY" },    // ✅
  { matchId: "m73", pick: "Argentina" },  // ✅
  { matchId: "m74", pick: "Mexico" },     // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// felix: 6/12 correctas — empate con eva (picks distintos)
export const PICKS_FELIX: UserPick[] = [
  { matchId: "m01", pick: "DRAW" },    // ❌
  { matchId: "m02", pick: "DRAW" },    // ✅
  { matchId: "m03", pick: "AWAY" },    // ✅
  { matchId: "m04", pick: "DRAW" },    // ❌
  { matchId: "m05", pick: "HOME" },    // ✅
  { matchId: "m06", pick: "DRAW" },    // ✅
  { matchId: "m07", pick: "AWAY" },    // ✅
  { matchId: "m08", pick: "HOME" },    // ❌
  { matchId: "m09", pick: "AWAY" },    // ❌
  { matchId: "m10", pick: "AWAY" },    // ✅
  { matchId: "m73", pick: "Korea Republic" },  // ❌
  { matchId: "m74", pick: "United States" },   // ✅
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// gina: 4/12 correctas + omite m06, m09, m10
export const PICKS_GINA: UserPick[] = [
  { matchId: "m01", pick: "HOME" },    // ✅
  { matchId: "m02", pick: "HOME" },    // ❌
  { matchId: "m03", pick: "HOME" },    // ❌
  { matchId: "m04", pick: "HOME" },    // ✅
  { matchId: "m05", pick: "DRAW" },    // ❌
  // m06: no pronosticó
  { matchId: "m07", pick: "HOME" },    // ❌
  { matchId: "m08", pick: "DRAW" },    // ✅
  // m09: no pronosticó
  // m10: no pronosticó
  { matchId: "m73", pick: "Argentina" },  // ✅
  { matchId: "m74", pick: "Mexico" },     // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// hugo: 3/12 correctas + 2 tardíos (m01, m05)
export const PICKS_HUGO: UserPick[] = [
  { matchId: "m01", pick: "HOME", isLate: true }, // correcto pero TARDÍO → 0 pts
  { matchId: "m02", pick: "DRAW" },   // ✅
  { matchId: "m03", pick: "HOME" },   // ❌
  { matchId: "m04", pick: "HOME" },   // ✅
  { matchId: "m05", pick: "HOME", isLate: true }, // correcto pero TARDÍO → 0 pts
  { matchId: "m06", pick: "HOME" },   // ❌
  { matchId: "m07", pick: "HOME" },   // ❌
  { matchId: "m08", pick: "HOME" },   // ❌
  { matchId: "m09", pick: "HOME" },   // ✅
  { matchId: "m10", pick: "HOME" },   // ❌
  { matchId: "m73", pick: "Korea Republic" }, // ❌
  { matchId: "m74", pick: "Mexico" },          // ❌
  { matchId: "m11", pick: "HOME" },
  { matchId: "m12", pick: "HOME" },
  { matchId: "m75", pick: "France" },
];

// Mapa uid → picks
export const PICKS_BY_UID: Record<string, UserPick[]> = {
  "uid-alice":  PICKS_ALICE,
  "uid-bob":    PICKS_BOB,
  "uid-carlos": PICKS_CARLOS,
  "uid-diana":  PICKS_DIANA,
  "uid-eva":    PICKS_EVA,
  "uid-felix":  PICKS_FELIX,
  "uid-gina":   PICKS_GINA,
  "uid-hugo":   PICKS_HUGO,
};
