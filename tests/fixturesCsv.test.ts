import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { parseFixtureCsv } from "@/lib/fixtureCsv";
import { formatInTimeZone, zonedLocalToUtc } from "@/lib/timezone";

const csv = `matchNumber,phase,fifaGroup,homeTeam,awayTeam,localDate,localTime,timezone,venue,city,country
1,Fase de grupos,A,Mexico,South Africa,2026-06-11,13:00,America/Mexico_City,Estadio Azteca,Ciudad de Mexico,Mexico`;

const fifaCsv = `numero_partido,fase,grupo,equipo_1,equipo_2,partido,estadio,ciudad_sede,zona_horaria_sede,fecha_sede,hora_sede,fecha_hora_sede_iso,nota_horarios,fuente_oficial_fifa,fuente_tabla_referencia
1,Fase de grupos,A,Mexico,South Africa,Mexico vs South Africa,Estadio Azteca,Mexico City,America/Mexico_City,2026-06-11,13:00,2026-06-11T13:00:00-06:00,Calendario sujeto a cambios,https://fifa.example/schedule.pdf,https://reference.example
104,Final,,Match 101 Winner,Match 102 Winner,Match 101 Winner vs Match 102 Winner,MetLife Stadium,New York/New Jersey,America/New_York,2026-07-19,15:00,2026-07-19T15:00:00-04:00,Calendario sujeto a cambios,https://fifa.example/schedule.pdf,https://reference.example`;

describe("fixture CSV import helpers", () => {
  it("parses valid fixture CSV and computes UTC kickoff", () => {
    const result = parseFixtureCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      matchId: "manual-2026-1",
      matchNumber: 1,
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      timezone: "America/Mexico_City"
    });
    expect(result.rows[0].kickoffAtIso).toBe("2026-06-11T19:00:00.000Z");
  });

  it("parses the FIFA CSV format and extracts knockout seeds", () => {
    const result = parseFixtureCsv(fifaCsv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      matchId: "manual-2026-1",
      sourceUrl: "https://fifa.example/schedule.pdf",
      referenceUrl: "https://reference.example",
      kickoffAtIso: "2026-06-11T19:00:00.000Z"
    });
    expect(result.rows[1]).toMatchObject({
      matchNumber: 104,
      homeSeedLabel: "Match 101 Winner",
      awaySeedLabel: "Match 102 Winner",
      homeSourceMatchNumber: 101,
      awaySourceMatchNumber: 102,
      homeSourceOutcome: "winner",
      awaySourceOutcome: "winner"
    });
  });

  it("parses the provided 104-match CSV when available locally", () => {
    const file = "/Users/oswy/Desktop/HAPPEN INC/mundial_2026_partidos_horarios_cdmx_y_local.csv";
    if (!existsSync(file)) return;
    const result = parseFixtureCsv(readFileSync(file, "utf8"));
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(104);
    expect(result.rows[0]).toMatchObject({
      matchId: "manual-2026-1",
      matchNumber: 1,
      timezone: "America/Mexico_City",
      kickoffAtIso: "2026-06-11T19:00:00.000Z"
    });
    expect(result.rows[103]).toMatchObject({
      matchId: "manual-2026-104",
      homeSeedLabel: "Match 101 Winner",
      awaySeedLabel: "Match 102 Winner"
    });
  });

  it("rejects CSV without required columns", () => {
    const result = parseFixtureCsv("matchNumber,homeTeam\n1,Mexico");
    expect(result.rows).toEqual([]);
    expect(result.errors.some((error) => error.includes("localDate"))).toBe(true);
  });

  it("rejects more than 120 rows", () => {
    const rows = Array.from({ length: 121 }, (_, index) => `${index + 1},Fase,A,A,B,2026-06-11,13:00,America/Mexico_City,Sede,Ciudad,Pais`);
    const result = parseFixtureCsv(`matchNumber,phase,fifaGroup,homeTeam,awayTeam,localDate,localTime,timezone,venue,city,country\n${rows.join("\n")}`);
    expect(result.errors).toContain("La carga máxima es de 120 partidos por importación.");
  });

  it("formats a kickoff in CDMX and another user timezone", () => {
    const kickoff = zonedLocalToUtc("2026-06-11", "13:00", "America/Mexico_City");
    expect(kickoff.toISOString()).toBe("2026-06-11T19:00:00.000Z");
    expect(formatInTimeZone(kickoff, "America/Mexico_City")).toContain("01:00 p.m.");
    expect(formatInTimeZone(kickoff, "America/New_York")).toContain("03:00 p.m.");
  });
});
