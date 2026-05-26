import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { normalizeApiFootballFixture, ApiFootballFixture } from "./apiFootballMapper";
import { normalizeSportmonksFixture, SportmonksFixture } from "./sportmonksMapper";

const SPORTMONKS_BASE_URL = process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v3/football";
const WORLD_CUP_SEASON_ID = process.env.SPORTMONKS_WORLD_CUP_SEASON_ID || "26618";
const API_FOOTBALL_BASE_URL = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const API_FOOTBALL_LEAGUE = process.env.API_FOOTBALL_LEAGUE || "1";
const API_FOOTBALL_SEASON = process.env.API_FOOTBALL_SEASON || "2026";

export async function syncFixturesFromProvider() {
  const provider = process.env.RESULTS_API_PROVIDER || "manual";
  if (provider === "api-football") return syncApiFootballFixtures();
  if (provider === "sportmonks") return syncSportmonksFixtures();
  if (provider === "mock") return syncMockFixtures();
  return writeProviderStatus("manual", "idle", "Modo manual activo; no se sincronizaron fixtures.");
}

export async function syncLiveResultsFromProvider() {
  const provider = process.env.RESULTS_API_PROVIDER || "manual";
  if (provider === "api-football") return syncApiFootballResults();
  if (provider === "sportmonks") return syncSportmonksLiveResults();
  if (provider === "mock") return syncMockResults();
  return writeProviderStatus("manual", "idle", "Modo manual activo; captura resultados desde superadmin.");
}

export async function mapSportmonksFixture(fixture: SportmonksFixture) {
  const normalized = normalizeSportmonksFixture(fixture);
  return {
    ...normalized,
    kickoffAt: normalized.kickoffAtIso ? Timestamp.fromDate(new Date(normalized.kickoffAtIso)) : null,
    kickoffAtIso: FieldValue.delete(),
    lastSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function syncSportmonksFixtures() {
  const fixtures = await fetchSportmonksFixtures("fixtures");
  return writeMatches("sportmonks", fixtures, "fixtures");
}

async function syncApiFootballFixtures() {
  const fixtures = await fetchApiFootballFixtures({ league: API_FOOTBALL_LEAGUE, season: API_FOOTBALL_SEASON });
  const mapped = fixtures.map(mapApiFootballFixture);
  return writeRawMatches("api-football", mapped.map((match) => ({ id: String(match.providerMatchId), ...match })), "fixtures");
}

async function syncApiFootballResults() {
  const fixtures = await fetchApiFootballFixtures({ league: API_FOOTBALL_LEAGUE, season: API_FOOTBALL_SEASON });
  const mapped = fixtures.map(mapApiFootballFixture);
  return writeRawMatches("api-football", mapped.map((match) => ({ id: String(match.providerMatchId), ...match })), "live");
}

async function syncSportmonksLiveResults() {
  const fixtures = await fetchSportmonksFixtures("livescores/latest");
  return writeMatches("sportmonks", fixtures, "live");
}

async function fetchSportmonksFixtures(endpoint: string): Promise<SportmonksFixture[]> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN no configurado.");
  const url = new URL(`${SPORTMONKS_BASE_URL}/${endpoint}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", "participants;scores;state;venue;round;group");
  url.searchParams.set("filters", `fixtureSeasons:${WORLD_CUP_SEASON_ID}`);
  url.searchParams.set("per_page", "100");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sportmonks ${endpoint} fallo con HTTP ${response.status}.`);
  const payload = (await response.json()) as { data?: SportmonksFixture[] };
  return payload.data ?? [];
}

async function fetchApiFootballFixtures(params: Record<string, string>): Promise<ApiFootballFixture[]> {
  const key = process.env.API_FOOTBALL_KEY || process.env.RESULTS_API_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY no configurado.");
  const url = new URL(`${API_FOOTBALL_BASE_URL}/fixtures`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

  const response = await fetch(url, { headers: { "x-apisports-key": key } });
  if (!response.ok) throw new Error(`API-Football fallo con HTTP ${response.status}.`);
  const payload = (await response.json()) as { response?: ApiFootballFixture[]; errors?: unknown };
  return payload.response ?? [];
}

function mapApiFootballFixture(fixture: ApiFootballFixture) {
  const normalized = normalizeApiFootballFixture(fixture);
  return {
    ...normalized,
    kickoffAt: normalized.kickoffAtIso ? Timestamp.fromDate(new Date(normalized.kickoffAtIso)) : null,
    kickoffAtIso: FieldValue.delete(),
    lastSyncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function syncMockFixtures() {
  const fixtures = [
    {
      id: "mock-mex-can-2026",
      provider: "mock",
      providerMatchId: "mock-mex-can-2026",
      matchNumber: 1,
      phase: "Grupos",
      fifaGroup: "A",
      venue: "Estadio Azteca",
      homeTeam: "Mexico",
      awayTeam: "Canada",
      kickoffAt: Timestamp.fromDate(new Date("2026-06-11T19:00:00-06:00")),
      timezone: "America/Mexico_City",
      status: "scheduled",
      rawProviderStatus: "mock scheduled",
      updatedAt: FieldValue.serverTimestamp(),
      lastSyncedAt: FieldValue.serverTimestamp()
    },
    {
      id: "mock-usa-bra-2026",
      provider: "mock",
      providerMatchId: "mock-usa-bra-2026",
      matchNumber: 2,
      phase: "Grupos",
      fifaGroup: "B",
      venue: "AT&T Stadium",
      homeTeam: "USA",
      awayTeam: "Brazil",
      kickoffAt: Timestamp.fromDate(new Date("2026-06-12T18:00:00-06:00")),
      timezone: "America/Mexico_City",
      status: "scheduled",
      rawProviderStatus: "mock scheduled",
      updatedAt: FieldValue.serverTimestamp(),
      lastSyncedAt: FieldValue.serverTimestamp()
    }
  ];
  return writeRawMatches("mock", fixtures, "fixtures");
}

async function writeProviderStatus(provider: string, status: string, message: string) {
  const db = getFirestore();
  await db.doc("systemConfig/providerStatus").set({
    provider,
    status,
    message,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { updated: 0 };
}

async function syncMockResults() {
  const fixtures = [
    {
      id: "mock-mex-can-2026",
      provider: "mock",
      providerMatchId: "mock-mex-can-2026",
      status: "finished",
      homeGoals90: 2,
      awayGoals90: 1,
      finalHomeGoals: 2,
      finalAwayGoals: 1,
      winnerTeam: "Mexico",
      rawProviderStatus: "mock finished",
      updatedAt: FieldValue.serverTimestamp(),
      lastSyncedAt: FieldValue.serverTimestamp()
    }
  ];
  return writeRawMatches("mock", fixtures, "live");
}

async function writeMatches(provider: string, fixtures: SportmonksFixture[], mode: "fixtures" | "live") {
  const mapped = await Promise.all(fixtures.map(mapSportmonksFixture));
  return writeRawMatches(provider, mapped.map((match) => ({ id: String(match.providerMatchId), ...match })), mode);
}

async function writeRawMatches(provider: string, matches: Array<Record<string, unknown> & { id: string }>, mode: "fixtures" | "live") {
  const db = getFirestore();
  const logRef = await db.collection("apiSyncLogs").add({
    provider,
    status: "running",
    startedAt: FieldValue.serverTimestamp(),
    message: `Sincronizacion ${mode} iniciada`
  });

  const batch = db.batch();
  for (const match of matches) {
    const { id, ...data } = match;
    batch.set(db.doc(`matches/${id}`), data, { merge: true });
  }
  batch.set(db.doc("systemConfig/providerStatus"), {
    provider,
    status: "healthy",
    [mode === "fixtures" ? "lastFixturesSyncAt" : "lastLiveSyncAt"]: FieldValue.serverTimestamp(),
    message: `${matches.length} registros sincronizados`,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();

  await logRef.update({
    status: "success",
    finishedAt: FieldValue.serverTimestamp(),
    message: `${matches.length} registros sincronizados`
  });
  return { updated: matches.length };
}

export const scheduledFixturesSync = onSchedule(
  { schedule: "every 6 hours", timeZone: "America/Mexico_City" },
  async () => {
    if ((process.env.RESULTS_API_PROVIDER ?? "manual") === "disabled") return;
    await syncFixturesFromProvider();
  }
);

export const scheduledLiveResultsSync = onSchedule(
  { schedule: "every 5 minutes", timeZone: "America/Mexico_City" },
  async () => {
    if ((process.env.RESULTS_API_PROVIDER ?? "manual") === "disabled") return;
    await syncLiveResultsFromProvider();
  }
);
