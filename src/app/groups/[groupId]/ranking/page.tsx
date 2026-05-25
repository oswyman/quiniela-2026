"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { getGroup, listPrizes, listScores } from "@/lib/firebase/firestore";
import { rankScores } from "@/lib/prizes";
import type { Group, Score } from "@/types";

export default function RankingPage() {
  return (
    <AuthGate>
      <RankingContent />
    </AuthGate>
  );
}

function RankingContent() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [prizes, setPrizes] = useState<Array<{ uid: string; estimatedPrize: number; ruleApplied: string; tieApplied: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [nextGroup, nextScores, nextPrizes] = await Promise.all([
        getGroup(params.groupId),
        listScores(params.groupId),
        listPrizes(params.groupId)
      ]);
      setGroup(nextGroup);
      setScores(nextScores);
      setPrizes(nextPrizes as Array<{ uid: string; estimatedPrize: number; ruleApplied: string; tieApplied: boolean }>);
      setLoading(false);
    }
    load();
  }, [params.groupId]);

  if (loading) return <main className="container"><p>Cargando ranking...</p></main>;
  const ranked = rankScores(scores);

  return (
    <main className="container stack">
      <PageTitle title="Ranking" subtitle="Desempates: puntos, marcadores exactos, diferencias, ganadores, empates." />
      <div className="tableWrap card">
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Participante</th>
              <th>Puntos</th>
              <th>Exactos</th>
              <th>Diferencias</th>
              <th>Ganadores</th>
              <th>Empates</th>
              <th>Premio estimado</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((score) => {
              const prize = prizes.find((item) => item.uid === score.uid);
              return (
                <tr key={score.uid}>
                  <td>{score.position}</td>
                  <td>{score.displayName ?? score.uid}</td>
                  <td>{score.totalPoints}</td>
                  <td>{score.exactScores}</td>
                  <td>{score.correctGoalDifferences}</td>
                  <td>{score.correctWinners}</td>
                  <td>{score.correctDraws}</td>
                  <td>{group?.currency ?? "MXN"} {prize?.estimatedPrize ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ranked.length === 0 ? <p className="muted">Todavía no hay puntuaciones calculadas.</p> : null}
      </div>
      {prizes.map((prize) => (
        <div className="notice" key={prize.uid}>{prize.ruleApplied}</div>
      ))}
    </main>
  );
}
