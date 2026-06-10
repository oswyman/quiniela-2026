// Traducción de nombres de equipos a español SOLO en la capa de display.
// Los valores almacenados en Firestore quedan en inglés: el scoring compara
// pick === winnerTeam por string exacto y traducirlos rompería los aciertos.

const NAMES_ES: Record<string, string> = {
  // CONMEBOL
  brazil: "Brasil",
  peru: "Perú",
  // CONCACAF
  canada: "Canadá",
  curacao: "Curazao",
  haiti: "Haití",
  mexico: "México",
  panama: "Panamá",
  "trinidad and tobago": "Trinidad y Tobago",
  usa: "Estados Unidos",
  "united states": "Estados Unidos",
  "dominican republic": "República Dominicana",
  // UEFA
  belgium: "Bélgica",
  "bosnia and herzegovina": "Bosnia y Herzegovina",
  croatia: "Croacia",
  "czech republic": "República Checa",
  czechia: "República Checa",
  denmark: "Dinamarca",
  england: "Inglaterra",
  finland: "Finlandia",
  france: "Francia",
  germany: "Alemania",
  greece: "Grecia",
  hungary: "Hungría",
  iceland: "Islandia",
  ireland: "Irlanda",
  "republic of ireland": "Irlanda",
  italy: "Italia",
  "north macedonia": "Macedonia del Norte",
  netherlands: "Países Bajos",
  norway: "Noruega",
  poland: "Polonia",
  romania: "Rumania",
  scotland: "Escocia",
  slovakia: "Eslovaquia",
  slovenia: "Eslovenia",
  spain: "España",
  sweden: "Suecia",
  switzerland: "Suiza",
  turkey: "Turquía",
  ukraine: "Ucrania",
  wales: "Gales",
  // CAF
  algeria: "Argelia",
  cameroon: "Camerún",
  "cape verde": "Cabo Verde",
  "dr congo": "RD del Congo",
  "democratic republic of congo": "RD del Congo",
  drc: "RD del Congo",
  egypt: "Egipto",
  "ivory coast": "Costa de Marfil",
  "cote d'ivoire": "Costa de Marfil",
  "cote divoire": "Costa de Marfil",
  mali: "Malí",
  morocco: "Marruecos",
  "south africa": "Sudáfrica",
  tunisia: "Túnez",
  gabon: "Gabón",
  libya: "Libia",
  sudan: "Sudán",
  zimbabwe: "Zimbabue",
  benin: "Benín",
  "equatorial guinea": "Guinea Ecuatorial",
  // AFC
  bahrain: "Baréin",
  iran: "Irán",
  iraq: "Irak",
  japan: "Japón",
  jordan: "Jordania",
  korea: "Corea del Sur",
  "south korea": "Corea del Sur",
  "north korea": "Corea del Norte",
  oman: "Omán",
  qatar: "Catar",
  "saudi arabia": "Arabia Saudita",
  saudi: "Arabia Saudita",
  uzbekistan: "Uzbekistán",
  uae: "Emiratos Árabes Unidos",
  "united arab emirates": "Emiratos Árabes Unidos",
  palestine: "Palestina",
  lebanon: "Líbano",
  syria: "Siria",
  thailand: "Tailandia",
  // OFC y repechaje
  "new zealand": "Nueva Zelanda",
  "new caledonia": "Nueva Caledonia",
  suriname: "Surinam",
};

const MATCH_SEED_RE = /^Match\s+(\d+)\s+(Winner|Loser)$/i;

// "Match 101 Winner" → "Ganador del partido 101"; "Group A Winner" → "1.º del Grupo A"
function translateSeedLabel(label: string): string | null {
  const trimmed = label.trim();
  const matchSeed = MATCH_SEED_RE.exec(trimmed);
  if (matchSeed) {
    const word = matchSeed[2].toLowerCase() === "winner" ? "Ganador" : "Perdedor";
    return `${word} del partido ${matchSeed[1]}`;
  }
  if (/^Group\s+/i.test(trimmed)) {
    return trimmed
      .replace(/^Group\s+([A-L])\s+Winner$/i, "1.º del Grupo $1")
      .replace(/^Group\s+([A-L])\s+Runner-?up$/i, "2.º del Grupo $1")
      .replace(/^Group\s+([A-L])\s+1st$/i, "1.º del Grupo $1")
      .replace(/^Group\s+([A-L])\s+2nd$/i, "2.º del Grupo $1")
      .replace(/^Group\s+([A-L])\s+3rd$/i, "3.º del Grupo $1")
      .replace(/^Group\b/i, "Grupo");
  }
  return null;
}

export function teamDisplayName(name?: string | null): string {
  if (!name) return "";
  const seed = translateSeedLabel(name);
  if (seed) return seed;
  return NAMES_ES[normalize(name)] ?? name;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
