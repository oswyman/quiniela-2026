import { zonedLocalToUtc } from "./timezone";

export const FIXTURE_CSV_HEADERS = [
  "matchNumber",
  "phase",
  "fifaGroup",
  "homeTeam",
  "awayTeam",
  "localDate",
  "localTime",
  "timezone",
  "venue",
  "city",
  "country"
] as const;

const REQUIRED_HEADERS = ["matchNumber", "phase", "homeTeam", "awayTeam", "localDate", "localTime", "timezone", "venue"] as const;
const FIFA_REQUIRED_HEADERS = ["numero_partido", "fase", "equipo_1", "equipo_2", "fecha_sede", "hora_sede", "zona_horaria_sede", "estadio"] as const;
const SOURCE_OUTCOME_RE = /^Match\s+(\d+)\s+(Winner|Loser)$/i;

export type FixtureCsvRow = {
  matchId: string;
  matchNumber: number;
  phase: string;
  fifaGroup: string;
  homeTeam: string;
  awayTeam: string;
  localDate: string;
  localTime: string;
  timezone: string;
  venue: string;
  city: string;
  country: string;
  kickoffAtIso: string;
  sourceUrl?: string;
  referenceUrl?: string;
  notes?: string;
  homeSeedLabel?: string;
  awaySeedLabel?: string;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeSourceOutcome?: "winner" | "loser" | null;
  awaySourceOutcome?: "winner" | "loser" | null;
};

export type FixtureCsvParseResult = {
  rows: FixtureCsvRow[];
  errors: string[];
};

export function parseFixtureCsv(text: string): FixtureCsvParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["El CSV está vacío."] };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().replace(/^\uFEFF/, ""));
  const errors: string[] = [];
  const isFifaFormat = headers.includes("numero_partido");
  const requiredHeaders = isFifaFormat ? FIFA_REQUIRED_HEADERS : REQUIRED_HEADERS;
  for (const header of requiredHeaders) if (!headers.includes(header)) errors.push(`Falta columna obligatoria: ${header}.`);
  if (lines.length - 1 > 120) errors.push("La carga máxima es de 120 partidos por importación.");
  if (errors.length) return { rows: [], errors };

  const rows: FixtureCsvRow[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, position) => [header, values[position]?.trim() ?? ""]));
    const rowNumber = index + 2;
    const normalized = normalizeRecord(record, isFifaFormat);
    const matchNumber = Number(normalized.matchNumber);
    for (const header of requiredHeaders) if (!record[header]) errors.push(`Fila ${rowNumber}: falta ${header}.`);
    if (!Number.isInteger(matchNumber) || matchNumber <= 0) errors.push(`Fila ${rowNumber}: matchNumber debe ser entero positivo.`);
    try {
      const kickoffAtIso = normalized.kickoffAtIso || zonedLocalToUtc(normalized.localDate, normalized.localTime, normalized.timezone).toISOString();
      const homeSeed = parseSeed(normalized.homeTeam);
      const awaySeed = parseSeed(normalized.awayTeam);
      rows.push({
        matchId: `manual-2026-${matchNumber}`,
        matchNumber,
        phase: normalized.phase,
        fifaGroup: normalized.fifaGroup,
        homeTeam: normalized.homeTeam,
        awayTeam: normalized.awayTeam,
        localDate: normalized.localDate,
        localTime: normalized.localTime,
        timezone: normalized.timezone,
        venue: normalized.venue,
        city: normalized.city,
        country: normalized.country,
        kickoffAtIso,
        sourceUrl: normalized.sourceUrl,
        referenceUrl: normalized.referenceUrl,
        notes: normalized.notes,
        homeSeedLabel: isSeedLabel(normalized.homeTeam) ? normalized.homeTeam : undefined,
        awaySeedLabel: isSeedLabel(normalized.awayTeam) ? normalized.awayTeam : undefined,
        homeSourceMatchNumber: homeSeed.matchNumber,
        awaySourceMatchNumber: awaySeed.matchNumber,
        homeSourceOutcome: homeSeed.outcome,
        awaySourceOutcome: awaySeed.outcome
      });
    } catch (error) {
      errors.push(`Fila ${rowNumber}: ${error instanceof Error ? error.message : "fecha inválida"}`);
    }
  });

  return { rows: errors.length ? [] : rows, errors };
}

function normalizeRecord(record: Record<string, string>, isFifaFormat: boolean) {
  if (!isFifaFormat) {
    return {
      matchNumber: record.matchNumber,
      phase: record.phase,
      fifaGroup: record.fifaGroup ?? "",
      homeTeam: record.homeTeam,
      awayTeam: record.awayTeam,
      localDate: record.localDate,
      localTime: record.localTime,
      timezone: record.timezone,
      venue: record.venue,
      city: record.city ?? "",
      country: record.country ?? "",
      kickoffAtIso: "",
      sourceUrl: record.sourceUrl ?? "",
      referenceUrl: record.referenceUrl ?? "",
      notes: record.notes ?? ""
    };
  }

  return {
    matchNumber: record.numero_partido,
    phase: record.fase,
    fifaGroup: record.grupo ?? "",
    homeTeam: record.equipo_1,
    awayTeam: record.equipo_2,
    localDate: record.fecha_sede,
    localTime: record.hora_sede,
    timezone: record.zona_horaria_sede,
    venue: record.estadio,
    city: record.ciudad_sede ?? "",
    country: "",
    kickoffAtIso: record.fecha_hora_sede_iso ? new Date(record.fecha_hora_sede_iso).toISOString() : "",
    sourceUrl: record.fuente_oficial_fifa ?? "",
    referenceUrl: record.fuente_tabla_referencia ?? "",
    notes: record.nota_horarios ?? ""
  };
}

function parseSeed(label: string): { matchNumber: number | null; outcome: "winner" | "loser" | null } {
  const match = label.trim().match(SOURCE_OUTCOME_RE);
  if (!match) return { matchNumber: null, outcome: null };
  return {
    matchNumber: Number(match[1]),
    outcome: match[2].toLowerCase() === "winner" ? "winner" : "loser"
  };
}

function isSeedLabel(label: string) {
  return /^(Match\s+\d+\s+(Winner|Loser)|Group\s+)/i.test(label.trim());
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}
