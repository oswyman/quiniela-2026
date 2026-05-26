"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { getGroup, listPrizes, listScores } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/format";
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

  if (loading) return <main className="container shell"><div className="panel">Cargando ranking...</div></main>;
  const ranked = rankScores(scores);

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title="Ranking" subtitle="Desempates: puntos, marcadores exactos, diferencias, ganadores, empates." />
        <GroupNav groupId={params.groupId} />
      </div>
      <div className="tableWrap panel">
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
                <tr className="rankingRow" key={score.uid}>
                  <td>{score.position}</td>
                  <td>{score.displayName ?? score.uid}</td>
                  <td>{score.totalPoints}</td>
                  <td>{score.exactScores}</td>
                  <td>{score.correctGoalDifferences}</td>
                  <td>{score.correctWinners}</td>
                  <td>{score.correctDraws}</td>
                  <td>{formatMoney(prize?.estimatedPrize ?? 0, group?.currency ?? "MXN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ranked.length === 0 ? <EmptyState title="Todavía no hay ranking" body="Cuando existan resultados, el administrador puede recalcular puntos y premios." /> : null}
      </div>
      {prizes.length > 0 ? (
        <section className="panel stack">
          <h2>Explicación de premios</h2>
          {prizes.map((prize) => <p key={prize.uid}>{prize.ruleApplied}</p>)}
        </section>
      ) : null}
    </main>
  );
}
