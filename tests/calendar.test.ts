import { describe, expect, it } from "vitest";
import { generateWorldCupIcs } from "@/lib/calendar";
import type { Match } from "@/types";

describe("Google Calendar export", () => {
  it("generates a valid ICS calendar for matches", () => {
    const ics = generateWorldCupIcs([{
      id: "manual-2026-1",
      matchNumber: 1,
      phase: "Fase de grupos",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      kickoffAt: "2026-06-11T19:00:00.000Z",
      timezone: "America/Mexico_City",
      sourceTimezone: "America/Mexico_City",
      venue: "Estadio Azteca",
      city: "Mexico City",
      sourceUrl: "https://fifa.example/schedule.pdf",
      status: "scheduled"
    } as Match]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260611T190000Z");
    expect(ics).toContain("DTEND:20260611T210000Z");
    expect(ics).toContain("SUMMARY:Mundial 2026: Mexico vs South Africa");
    expect(ics).toContain("LOCATION:Estadio Azteca\\, Mexico City");
  });
});
