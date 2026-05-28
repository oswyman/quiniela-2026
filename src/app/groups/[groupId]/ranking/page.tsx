"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { getGroup, listMembers, listPrizes, listScores } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/format";
import { rankScores } from "@/lib/prizes";
import { generateRankingCsv } from "@/lib/resultsExport";
import type { Group, Member, Score } from "@/types";

export default function RankingPage() {
  return (
    <AuthGate>
      <RankingContent />
    </AuthGate>
  );
}

function positionLabel(position: number) {
  return String(position);
}

function rowClass(position: number, isMe: boolean) {
  const posClass = position === 1 ? "rankingRow--top1" : position === 2 ? "rankingRow--top2" : position === 3 ? "rankingRow--top3" : "";
  const meClass = isMe ? "rankingRow--me" : "";
  return ["rankingRow", posClass, meClass].filter(Boolean).join(" ");
}

function cardClass(position: number, isMe: boolean) {
  const posClass = position === 1 ? "rankingCard--top1" : "";
  const meClass = isMe ? "rankingCard--me" : "";
  return ["rankingCard", posClass, meClass].filter(Boolean).join(" ");
}

function RankingContent() {
  const params = useParams<{ groupId: string }>();
  const { user } = useAuthUser();
  const [group, setGroup] = useState<Group | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [prizes, setPrizes] = useState<Array<{ uid: string; estimatedPrize: number; ruleApplied: string; tieApplied: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setError("");
    setLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextScores, nextPrizes, nextMembers] = await Promise.all([
          getGroup(params.groupId),
          listScores(params.groupId),
          listPrizes(params.groupId),
          listMembers(params.groupId)
        ]);
        setGroup(nextGroup);
        setScores(nextScores);
        setPrizes(nextPrizes as Array<{ uid: string; estimatedPrize: number; ruleApplied: string; tieApplied: boolean }>);
        setMembers(nextMembers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el ranking.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId, retryCount]);

  if (loading) return (
    <main className="container shell">
      <div className="panel" role="status" aria-live="polite">
        <p className="muted" style={{ margin: 0 }}>Cargando ranking...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="container shell">
      <StatusMessage type="error" onRetry={retry}>{error}</StatusMessage>
    </main>
  );

  const ranked = rankScores(scores);

  function downloadCsv() {
    if (!group) return;
    const csv = generateRankingCsv(scores, prizes, members, group.name, group.currency ?? "MXN");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ranking-${group.name.replace(/\s+/g, "-")}-${fecha}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title="Ranking" subtitle="Ordenado por aciertos. Empates comparten posición." />
        <GroupNav groupId={params.groupId} />
      </div>

      {/* Tabla desktop */}
      <div className="tableWrap panel">
        <table className="rankingTable">
          <thead>
            <tr>
              <th className="cell-nowrap">Pos.</th>
              <th>Participante</th>
              <th className="cell-nowrap">Aciertos</th>
              <th className="cell-nowrap">Grupos</th>
              <th className="cell-nowrap">Eliminación</th>
              <th className="cell-nowrap">A tiempo</th>
              <th className="cell-nowrap">Premio estimado</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((score) => {
              const prize = prizes.find((item) => item.uid === score.uid);
              const isMe = user?.uid === score.uid;
              return (
                <tr className={rowClass(score.position, isMe)} key={score.uid}>
                  <td className="cell-nowrap">{positionLabel(score.position)}</td>
                  <td style={{ wordBreak: "break-word" }}>
                    {score.displayName ?? score.uid}
                    {isMe ? <span className="muted" style={{ fontSize: "0.78rem", marginLeft: 6 }}>tú</span> : null}
                  </td>
                  <td className="cell-nowrap">{score.totalCorrect ?? score.totalPoints}</td>
                  <td className="cell-nowrap">{score.correctGroupPicks ?? 0}</td>
                  <td className="cell-nowrap">{score.correctAdvancingPicks ?? 0}</td>
                  <td className="cell-nowrap">{score.validPredictions ?? 0}</td>
                  <td className="cell-nowrap rankingPrize">
                    {prize ? formatMoney(prize.estimatedPrize, group?.currency ?? "MXN") : <span className="muted" style={{ fontWeight: 400 }}>Pendiente</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ranked.length === 0 ? <EmptyState title="Todavía no hay ranking" body="Cuando existan resultados, el administrador puede recalcular aciertos y premios." /> : null}
      </div>

      {/* Cards mobile */}
      {ranked.length > 0 ? (
        <div className="rankingCards">
          {ranked.map((score) => {
            const prize = prizes.find((item) => item.uid === score.uid);
            const isMe = user?.uid === score.uid;
            return (
              <div className={cardClass(score.position, isMe)} key={score.uid}>
                <span className="rankingCard__pos">{positionLabel(score.position)}</span>
                <span className="rankingCard__name">
                  {score.displayName ?? score.uid}
                  {isMe ? <span className="muted" style={{ fontSize: "0.78rem", marginLeft: 6 }}>tú</span> : null}
                </span>
                <span className="rankingCard__detail">
                  {score.totalCorrect ?? score.totalPoints} aciertos · {score.correctGroupPicks ?? 0} grupos · {score.correctAdvancingPicks ?? 0} elim. · {score.validPredictions ?? 0} a tiempo
                </span>
                <span className="rankingCard__prize">
                  {prize ? formatMoney(prize.estimatedPrize, group?.currency ?? "MXN") : "Premio pendiente"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Premios detalle */}
      {prizes.length > 0 ? (
        <section className="panel stack">
          <h2>Detalle de premios estimados</h2>
          {prizes.map((prize) => <p key={prize.uid}>{prize.ruleApplied}{prize.tieApplied ? " · Empate en zona de premio: monto dividido entre empatados." : ""}</p>)}
        </section>
      ) : (
        <section className="panel">
          <h2>Premios pendientes</h2>
          <p className="muted">Cuando haya resultados cargados, el administrador puede recalcular aciertos y se mostrarán los premios estimados aquí.</p>
        </section>
      )}

      {/* Info secundaria — al final, no bloquea la tabla */}
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

      {/* Descarga */}
      {ranked.length > 0 ? (
        <div className="cluster">
          <button className="button secondary" onClick={downloadCsv} type="button">
            <Download size={16} aria-hidden />
            Descargar ranking CSV
          </button>
          <p className="fineprint" style={{ margin: 0 }}>Descarga informativa — datos de solo lectura.</p>
        </div>
      ) : null}
    </main>
  );
}
