const FLAGS: Record<string, string> = {
  argentina: "🇦🇷",
  australia: "🇦🇺",
  austria: "🇦🇹",
  belgium: "🇧🇪",
  brazil: "🇧🇷",
  canada: "🇨🇦",
  chile: "🇨🇱",
  colombia: "🇨🇴",
  costa: "🇨🇷",
  croatia: "🇭🇷",
  denmark: "🇩🇰",
  ecuador: "🇪🇨",
  england: "🏴",
  france: "🇫🇷",
  germany: "🇩🇪",
  ghana: "🇬🇭",
  italy: "🇮🇹",
  japan: "🇯🇵",
  korea: "🇰🇷",
  mexico: "🇲🇽",
  morocco: "🇲🇦",
  netherlands: "🇳🇱",
  nigeria: "🇳🇬",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  poland: "🇵🇱",
  portugal: "🇵🇹",
  qatar: "🇶🇦",
  saudi: "🇸🇦",
  scotland: "🏴",
  senegal: "🇸🇳",
  serbia: "🇷🇸",
  spain: "🇪🇸",
  switzerland: "🇨🇭",
  tunisia: "🇹🇳",
  uruguay: "🇺🇾",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  wales: "🏴"
};

export function teamFlagEmoji(teamName?: string | null) {
  const value = normalize(teamName);
  if (!value || value.includes("winner") || value.includes("runner") || value.includes("third") || value.includes("match")) return "🏆";
  const direct = FLAGS[value];
  if (direct) return direct;
  const partial = Object.entries(FLAGS).find(([key]) => value.includes(key));
  return partial?.[1] ?? "⚽";
}

function normalize(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
