import { describe, expect, it } from "vitest";
import { parseFixtureCsv } from "@/lib/fixtureCsv";
import { formatInTimeZone, zonedLocalToUtc } from "@/lib/timezone";

const csv = `matchNumber,phase,fifaGroup,homeTeam,awayTeam,localDate,localTime,timezone,venue,city,country
1,Fase de grupos,A,Mexico,South Africa,2026-06-11,13:00,America/Mexico_City,Estadio Azteca,Ciudad de Mexico,Mexico`;

describe("fixture CSV import helpers", () => {
  it("parses valid fixture CSV and computes UTC kickoff", () => {
    const result = parseFixtureCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      matchNumber: 1,
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      timezone: "America/Mexico_City"
    });
    expect(result.rows[0].kickoffAtIso).toBe("2026-06-11T19:00:00.000Z");
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
