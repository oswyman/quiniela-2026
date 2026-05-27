"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { RulesPanel } from "@/components/RulesPanel";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { formatMoney, shortCountdownToDate, toDate } from "@/lib/format";
import { getGroup, listMatches, listMembers, listPredictions, listPrizes, listScores } from "@/lib/firebase/firestore";
import { getMatchTitle } from "@/lib/matchDisplay";
import { formatMatchTime, matchTimeLabel, type MatchTimeMode } from "@/lib/matchTime";
import { predictionClosesAt } from "@/lib/scoring";
import { getUserTimeZone } from "@/lib/timezone";
import type { Group, Match, Member, Prediction, Score } from "@/types";

export default function GroupPage() {
  return (
    <AuthGate>
      <GroupContent />
    </AuthGate>
  );
}

function GroupContent() {
  const { user } = useAuthUser();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [prizes, setPrizes] = useState<Array<{ uid: string; estimatedPrize: number; ruleApplied: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");

  useEffect(() => {
    setUserTimeZone(getUserTimeZone());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextMembers, nextMatches, nextScores, nextPrizes, nextPredictions] = await Promise.all([
          getGroup(params.groupId),
          listMembers(params.groupId),
          listMatches(),
          listScores(params.groupId),
          listPrizes(params.groupId),
          listPredictions(params.groupId)
        ]);
        setGroup(nextGroup);
        setMembers(nextMembers);
        setMatches(nextMatches);
        setScores(nextScores);
        setPrizes(nextPrizes as Array<{ uid: string; estimatedPrize: number; ruleApplied: string }>);
        setPredictions(nextPredictions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el grupo.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  const activeMembers = members.filter((member) => member.status === "active");
  const paidMembers = members.filter((member) => member.paymentStatus === "paid");
  const nextMatch = useMemo(() => matches.find((match) => match.status === "scheduled") ?? matches[0], [matches]);
  const myPredictions = predictions.filter((prediction) => prediction.uid === user?.uid);
  const predictionMatchIds = new Set(myPredictions.map((prediction) => prediction.matchId));
  const pendingPredictions = matches.filter((match) => match.status === "scheduled" && !predictionMatchIds.has(match.id)).length;
  const nextPredictionClose = nextMatch ? predictionClosesAt(toDate(nextMatch.kickoffAt)) : null;
  const myScore = scores.find((score) => score.uid === user?.uid);

  if (loading) return <main className="container shell"><div className="panel">Cargando panel del grupo...</div></main>;
  if (error) return <main className="container"><StatusMessage type="error">{error}</StatusMessage></main>;
  if (!group) return <main className="container"><EmptyState title="Grupo no encontrado" body="Verifica la invitación o vuelve al dashboard." href="/dashboard" action="Dashboard" /></main>;

  const pool = activeMembers.length * Number(group.contributionAmount || 0);

  return (
    <>
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title={group.name} subtitle={`${formatMoney(group.contributionAmount, group.currency)} por participante · Responsable: ${group.moneyResponsibleName} · Quiniela por aciertos`} />
        <div className="cluster">
          <Link className="button gold" href={`/groups/${group.id}/predictions`}>Pronosticar</Link>
          <GroupNav groupId={group.id} />
        </div>
      </div>
      <div className="grid">
        <MetricCard label="Participantes activos" value={`${activeMembers.length}/${group.minParticipants}+`} detail="Mínimo para operar el grupo" />
        <MetricCard label="Pagos marcados" value={`${paidMembers.length}/${activeMembers.length}`} detail="Control manual, sin procesar pagos" />
        <MetricCard label="Bolsa estimada" value={formatMoney(pool, group.currency)} detail="La app no custodia dinero" />
        <MetricCard label="Próximo cierre" value={nextPredictionClose ? shortCountdownToDate(nextPredictionClose) : "Sin partidos"} detail={nextMatch ? `${getMatchTitle(nextMatch)} · 90 min antes` : "Sin fixtures cargados"} />
        <MetricCard label="Mis pendientes" value={pendingPredictions} detail="Elecciones programadas sin capturar" />
        <MetricCard label="Mis aciertos" value={myScore?.totalCorrect ?? myScore?.totalPoints ?? 0} detail="Actualizado al recalcular ranking" />
      </div>
      <section className="twoCol">
        <RulesPanel group={group} />
        <aside className="panel stack">
          <h2>Operación del grupo</h2>
          <p><strong>Formato:</strong> quiniela por aciertos</p>
          <p className="muted">En grupos se elige local, empate o visitante. En eliminación directa se elige el equipo que avanza.</p>
          <p><strong>Pronósticos:</strong> {group.predictionVisibility === "AFTER_CLOSE" ? "Visibles después del cierre" : "Visibles antes del cierre"}</p>
          <p><strong>Responsable:</strong> {group.moneyResponsibleEmail}</p>
        </aside>
      </section>
      <div className="grid">
        <section className="panel stack">
          <h2>Próximos partidos</h2>
          <div className="tabs" aria-label="Preferencia de horario de partidos">
            {(["cdmx", "local", "venue"] as MatchTimeMode[]).map((mode) => (
              <button className={timeMode === mode ? "tabButton active" : "tabButton"} key={mode} onClick={() => setTimeMode(mode)} type="button">
                {matchTimeLabel(mode)}
              </button>
            ))}
          </div>
          {matches.length === 0 ? <p className="muted">Aún no hay fixtures cargados.</p> : matches.slice(0, 5).map((match) => <p key={match.id}>{getMatchTitle(match)}<br /><span className="muted">{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</span></p>)}
        </section>
        <section className="panel stack">
          <h2>Top ranking</h2>
          {scores.length === 0 ? <p className="muted">Sin aciertos calculados todavía.</p> : scores.slice(0, 5).map((score, index) => <p key={score.uid}>{index + 1}. {score.displayName ?? score.uid}: <strong>{score.totalCorrect ?? score.totalPoints} aciertos</strong></p>)}
        </section>
        <section className="panel stack">
          <h2>Premios estimados</h2>
          {prizes.length === 0 ? <p className="muted">Recalcula ranking cuando haya resultados.</p> : prizes.map((prize) => <p key={prize.uid}>{prize.uid}: {formatMoney(prize.estimatedPrize, group.currency)}</p>)}
        </section>
      </div>
    </main>
    <Link className="stickyPredictButton" href={`/groups/${group.id}/predictions`}>Pronosticar ahora · {pendingPredictions} pendientes</Link>
    </>
  );
}
