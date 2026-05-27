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
        <PageTitle title="Ranking" subtitle="Ordenado por aciertos. Si dos participantes tienen la misma cantidad, comparten posición." />
        <GroupNav groupId={params.groupId} />
      </div>
      <section className="grid">
        <article className="panel stack">
          <h2>Cómo se calculan los aciertos</h2>
          <p className="muted">Cada partido atinado vale 1 acierto. Fase de grupos: cuenta local gana, empate o visitante gana (resultado a 90 min). Eliminación directa: cuenta el equipo que avanza. Los pronósticos fuera de tiempo valen 0.</p>
        </article>
        <article className="panel stack">
          <h2>Distribución de premios estimados</h2>
          <p className="muted">2 activos: 1.° 100 %. · 3 activos: 1.° 70 %, 2.° 30 %. · 4 o más: 1.° 60 %, 2.° 30 %, 3.° 10 %. Empates en zona de premio se dividen entre los empatados. La Cancha no procesa ni custodia dinero.</p>
        </article>
      </section>
      <div className="tableWrap panel">
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Participante</th>
              <th>Aciertos</th>
              <th>Grupos</th>
              <th>Eliminación</th>
              <th>Válidos</th>
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
                  <td>{score.totalCorrect ?? score.totalPoints}</td>
                  <td>{score.correctGroupPicks ?? 0}</td>
                  <td>{score.correctAdvancingPicks ?? 0}</td>
                  <td>{score.validPredictions ?? 0}</td>
                  <td>{prize ? formatMoney(prize.estimatedPrize, group?.currency ?? "MXN") : "Resultado pendiente"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ranked.length === 0 ? <EmptyState title="Todavía no hay ranking" body="Cuando existan resultados, el administrador puede recalcular aciertos y premios." /> : null}
      </div>
      {prizes.length > 0 ? (
        <section className="panel stack">
          <h2>Detalle de premios estimados</h2>
          {prizes.map((prize) => <p key={prize.uid}>{prize.ruleApplied}{prize.tieApplied ? " · Empate en zona de premio: monto dividido entre empatados." : ""}</p>)}
        </section>
      ) : <section className="panel"><h2>Premios pendientes</h2><p className="muted">Cuando haya resultados cargados, el administrador puede recalcular aciertos y se mostrarán los premios estimados aquí.</p></section>}
    </main>
  );
}
