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

export type FixtureCsvRow = {
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
};

export type FixtureCsvParseResult = {
  rows: FixtureCsvRow[];
  errors: string[];
};

export function parseFixtureCsv(text: string): FixtureCsvParseResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["El CSV está vacío."] };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const errors: string[] = [];
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) errors.push(`Falta columna obligatoria: ${header}.`);
  }
  if (lines.length - 1 > 120) errors.push("La carga máxima es de 120 partidos por importación.");
  if (errors.length) return { rows: [], errors };

  const rows: FixtureCsvRow[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, position) => [header, values[position]?.trim() ?? ""]));
    const rowNumber = index + 2;
    const matchNumber = Number(record.matchNumber);
    for (const header of REQUIRED_HEADERS) {
      if (!record[header]) errors.push(`Fila ${rowNumber}: falta ${header}.`);
    }
    if (!Number.isInteger(matchNumber) || matchNumber <= 0) errors.push(`Fila ${rowNumber}: matchNumber debe ser entero positivo.`);
    try {
      const kickoffAtIso = zonedLocalToUtc(record.localDate, record.localTime, record.timezone).toISOString();
      rows.push({
        matchNumber,
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
        kickoffAtIso
      });
    } catch (error) {
      errors.push(`Fila ${rowNumber}: ${error instanceof Error ? error.message : "fecha inválida"}`);
    }
  });

  return { rows: errors.length ? [] : rows, errors };
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
