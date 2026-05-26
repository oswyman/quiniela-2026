export function zonedLocalToUtc(localDate: string, localTime: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error("Fecha u hora inválida.");
  if (!timeZone?.trim()) throw new Error("Falta zona horaria.");

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  const targetMs = Date.UTC(year, month - 1, day, hour, minute);

  for (let index = 0; index < 4; index += 1) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const actualMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const diffMs = actualMs - targetMs;
    if (diffMs === 0) break;
    utcMs -= diffMs;
  }

  return new Date(utcMs);
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute)
  };
}
