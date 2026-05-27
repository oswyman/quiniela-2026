import { formatDate } from "./format";
import { getDisplayTeam } from "./matchDisplay";
import { rankScores } from "./prizes";
import type { Group, Match, Member, Prediction, Prize, Score } from "@/types";

type GroupExport = {
  group: Group;
  members: Member[];
  predictions: Prediction[];
  scores: Score[];
  prizes: Prize[];
};

export function generateResultsCsv(matches: Match[], groups: GroupExport[]) {
  const rows: string[][] = [
    ["seccion", "grupo_quiniela", "usuario", "partido", "fase", "grupo_fifa", "local", "visitante", "sede", "kickoff", "resultado_90", "extra", "penales", "ganador", "eleccion", "acierto", "ranking", "premio_estimado", "estado_pago"]
  ];

  for (const match of matches) {
    rows.push([
      "partido",
      "",
      "",
      String(match.matchNumber ?? match.id),
      match.phase,
      match.fifaGroup ?? "",
      getDisplayTeam(match, "home"),
      getDisplayTeam(match, "away"),
      [match.venue, match.city].filter(Boolean).join(" · "),
      formatDate(match.kickoffAt),
      scorePair(match.homeGoals90, match.awayGoals90),
      scorePair(match.homeGoalsExtraTime, match.awayGoalsExtraTime),
      scorePair(match.homePenaltyGoals, match.awayPenaltyGoals),
      match.winnerTeam ?? "",
      "",
      "",
      "",
      "",
      ""
    ]);
  }

  for (const item of groups) {
    const scoreByUid = new Map(item.scores.map((score) => [score.uid, score]));
    const prizeByUid = new Map(item.prizes.map((prize) => [prize.uid, prize]));
    const memberByUid = new Map(item.members.map((member) => [member.uid, member]));
    for (const prediction of item.predictions) {
      const match = matches.find((candidate) => candidate.id === prediction.matchId);
      const score = scoreByUid.get(prediction.uid);
      const prize = prizeByUid.get(prediction.uid);
      const member = memberByUid.get(prediction.uid);
      rows.push([
        "pronostico",
        item.group.name,
        member?.displayName || prediction.uid,
        match ? String(match.matchNumber ?? match.id) : prediction.matchId,
        match?.phase ?? "",
        match?.fifaGroup ?? "",
        match ? getDisplayTeam(match, "home") : "",
        match ? getDisplayTeam(match, "away") : "",
        match ? [match.venue, match.city].filter(Boolean).join(" · ") : "",
        match ? formatDate(match.kickoffAt) : "",
        match ? scorePair(match.homeGoals90, match.awayGoals90) : "",
        match ? scorePair(match.homeGoalsExtraTime, match.awayGoalsExtraTime) : "",
        match ? scorePair(match.homePenaltyGoals, match.awayPenaltyGoals) : "",
        match?.winnerTeam ?? "",
        prediction.pick ?? "",
        prediction.isCorrect ? "si" : "no",
        String(score?.totalCorrect ?? score?.totalPoints ?? ""),
        prize ? String(prize.estimatedPrize) : "",
        member?.paymentStatus ?? ""
      ]);
    }
  }

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function scorePair(home?: number | null, away?: number | null) {
  return typeof home === "number" && typeof away === "number" ? `${home}-${away}` : "";
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function generateRankingCsv(
  scores: Score[],
  prizes: Array<{ uid: string; estimatedPrize: number; ruleApplied: string; tieApplied: boolean }>,
  members: Member[],
  groupName: string,
  currency: string
): string {
  const memberMap = new Map(members.map((m) => [m.uid, m]));
  const prizeMap = new Map(prizes.map((p) => [p.uid, p]));
  const ranked = rankScores(scores);
  const header = ["posicion", "participante", "aciertos_totales", "grupos", "eliminacion", "a_tiempo", "tarde", "premio_estimado_" + currency, "regla_premio", "empate_aplicado"];
  const rows = ranked.map((score) => {
    const prize = prizeMap.get(score.uid);
    const member = memberMap.get(score.uid);
    return [
      score.position,
      escapeCsv(score.displayName ?? member?.displayName ?? score.uid),
      score.totalCorrect ?? score.totalPoints ?? 0,
      score.correctGroupPicks ?? 0,
      score.correctAdvancingPicks ?? 0,
      score.validPredictions ?? 0,
      score.latePredictions ?? 0,
      prize ? prize.estimatedPrize.toFixed(2) : "",
      prize ? escapeCsv(prize.ruleApplied) : "",
      prize?.tieApplied ? "si" : "no"
    ].join(",");
  });
  const note = `# Ranking informativo de ${escapeCsv(groupName)} — generado ${new Date().toLocaleDateString("es-MX")} — solo lectura`;
  return [note, header.join(","), ...rows].join("\r\n");
}
