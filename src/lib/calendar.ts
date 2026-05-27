import type { Match } from "@/types";
import { formatMatchTime } from "./matchTime";
import { getMatchTitle } from "./matchDisplay";

export function generateWorldCupIcs(matches: Match[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Cancha//Mundial 2026//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Mundial 2026 - La Cancha",
    "X-WR-TIMEZONE:UTC"
  ];

  for (const match of matches) {
    const start = toDate(match.kickoffAt);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const location = [match.venue, match.city].filter(Boolean).join(", ");
    const description = [
      `Fase: ${match.phase}`,
      `Hora CDMX: ${formatMatchTime(match, "cdmx")}`,
      `Hora sede: ${formatMatchTime(match, "venue")}`,
      match.notes ? `Nota: ${match.notes}` : "",
      match.sourceUrl ? `Fuente FIFA: ${match.sourceUrl}` : "",
      "Importado desde La Cancha. Google Calendar mostrará el evento en tu zona horaria."
    ].filter(Boolean).join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:mundial-2026-${match.id}@la-cancha`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(`Mundial 2026: ${getMatchTitle(match)}`)}`,
      `LOCATION:${escapeIcsText(location)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  return new Date(String(value));
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
