const FLAGS: Record<string, string> = {
  // CONMEBOL
  argentina: "🇦🇷",
  bolivia: "🇧🇴",
  brazil: "🇧🇷",
  chile: "🇨🇱",
  colombia: "🇨🇴",
  ecuador: "🇪🇨",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  uruguay: "🇺🇾",
  venezuela: "🇻🇪",
  // CONCACAF
  canada: "🇨🇦",
  "costa rica": "🇨🇷",
  costa: "🇨🇷",
  cuba: "🇨🇺",
  curacao: "🇨🇼",
  "el salvador": "🇸🇻",
  guatemala: "🇬🇹",
  haiti: "🇭🇹",
  honduras: "🇭🇳",
  jamaica: "🇯🇲",
  mexico: "🇲🇽",
  panama: "🇵🇦",
  "trinidad and tobago": "🇹🇹",
  trinidad: "🇹🇹",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  // UEFA
  albania: "🇦🇱",
  austria: "🇦🇹",
  belgium: "🇧🇪",
  "bosnia and herzegovina": "🇧🇦",
  bosnia: "🇧🇦",
  bulgaria: "🇧🇬",
  croatia: "🇭🇷",
  "czech republic": "🇨🇿",
  czechia: "🇨🇿",
  denmark: "🇩🇰",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  finland: "🇫🇮",
  france: "🇫🇷",
  germany: "🇩🇪",
  greece: "🇬🇷",
  hungary: "🇭🇺",
  iceland: "🇮🇸",
  ireland: "🇮🇪",
  "republic of ireland": "🇮🇪",
  italy: "🇮🇹",
  "north macedonia": "🇲🇰",
  netherlands: "🇳🇱",
  norway: "🇳🇴",
  poland: "🇵🇱",
  portugal: "🇵🇹",
  romania: "🇷🇴",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  serbia: "🇷🇸",
  slovakia: "🇸🇰",
  slovenia: "🇸🇮",
  spain: "🇪🇸",
  sweden: "🇸🇪",
  switzerland: "🇨🇭",
  turkey: "🇹🇷",
  ukraine: "🇺🇦",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  // CAF
  algeria: "🇩🇿",
  cameroon: "🇨🇲",
  "dr congo": "🇨🇩",
  "democratic republic of congo": "🇨🇩",
  drc: "🇨🇩",
  egypt: "🇪🇬",
  ghana: "🇬🇭",
  "ivory coast": "🇨🇮",
  "cote d'ivoire": "🇨🇮",
  "cote divoire": "🇨🇮",
  mali: "🇲🇱",
  morocco: "🇲🇦",
  nigeria: "🇳🇬",
  senegal: "🇸🇳",
  "south africa": "🇿🇦",
  tanzania: "🇹🇿",
  tunisia: "🇹🇳",
  zambia: "🇿🇲",
  // AFC
  australia: "🇦🇺",
  bahrain: "🇧🇭",
  china: "🇨🇳",
  indonesia: "🇮🇩",
  iran: "🇮🇷",
  iraq: "🇮🇶",
  japan: "🇯🇵",
  jordan: "🇯🇴",
  korea: "🇰🇷",
  "south korea": "🇰🇷",
  "north korea": "🇰🇵",
  oman: "🇴🇲",
  qatar: "🇶🇦",
  "saudi arabia": "🇸🇦",
  saudi: "🇸🇦",
  uzbekistan: "🇺🇿",
  // OFC
  "new zealand": "🇳🇿"
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
