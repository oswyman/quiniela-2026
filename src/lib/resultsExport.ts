import { formatDate } from "./format";
import { getDisplayTeam } from "./matchDisplay";
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
