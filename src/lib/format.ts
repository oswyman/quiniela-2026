export function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  return new Date(String(value));
}

export function formatDate(value: unknown) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatMoney(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);
}

export function shortCountdown(value: unknown) {
  const date = toDate(value);
  const diff = date.getTime() - Date.now();
  if (Number.isNaN(diff)) return "Por confirmar";
  if (diff <= 0) return "Cerrado";
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h ${Math.max(0, Math.floor(diff / 1000 / 60) % 60)}m`;
}
