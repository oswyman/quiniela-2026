"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [retryCount, setRetryCount] = useState(0);
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");

  useEffect(() => {
    setUserTimeZone(getUserTimeZone());
  }, []);

  const retry = useCallback(() => {
    setError("");
    setLoading(true);
    setRetryCount((c) => c + 1);
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
  }, [params.groupId, retryCount]);

  const activeMembers = members.filter((member) => member.status === "active");
  const paidMembers = members.filter((member) => member.paymentStatus === "paid");
  const nextMatch = useMemo(() => matches.find((match) => match.status === "scheduled") ?? matches[0], [matches]);
  const myPredictions = predictions.filter((prediction) => prediction.uid === user?.uid);
  const predictionMatchIds = new Set(myPredictions.map((prediction) => prediction.matchId));
  const pendingPredictions = matches.filter((match) => match.status === "scheduled" && !predictionMatchIds.has(match.id)).length;
  const nextPredictionClose = nextMatch ? predictionClosesAt(toDate(nextMatch.kickoffAt)) : null;
  const myScore = scores.find((score) => score.uid === user?.uid);
  const myPrize = prizes.find((p) => p.uid === user?.uid);

  if (loading) return (
    <main className="container shell">
      <div className="panel" role="status" aria-live="polite">
        <p className="muted" style={{ margin: 0 }}>Cargando grupo...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="container shell">
      <StatusMessage type="error" onRetry={retry}>{error}</StatusMessage>
    </main>
  );

  if (!group) return (
    <main className="container">
      <EmptyState title="Grupo no encontrado" body="Verifica la invitación o vuelve al dashboard." href="/dashboard" action="Dashboard" />
    </main>
  );

  const pool = activeMembers.length * Number(group.contributionAmount || 0);

  return (
    <>
      <main className="container shell stack-lg">
        <div className="toolbar">
          <PageTitle title={group.name} />
          <div className="cluster">
            <Link className="button gold" href={`/groups/${group.id}/predictions`}>Pronosticar</Link>
            <GroupNav groupId={group.id} />
          </div>
        </div>

        <div className="grid">
          <MetricCard label="Participantes activos" value={`${activeMembers.length}/${group.minParticipants}+`} detail="Mínimo para operar el grupo" />
          <MetricCard label="Pagos marcados" value={`${paidMembers.length}/${activeMembers.length}`} detail="Control manual, sin procesar pagos" />
          <MetricCard label="Bolsa estimada" value={formatMoney(pool, group.currency)} detail="La app no custodia dinero" />
          <MetricCard label="Próximo cierre" value={nextPredictionClose ? shortCountdownToDate(nextPredictionClose) : "Sin partidos"} detail={nextMatch ? `${getMatchTitle(nextMatch)} — cierra 90 min antes del kickoff` : "Sin fixtures cargados"} />
          <MetricCard label="Sin pronosticar" value={pendingPredictions} detail="Partidos programados donde aún no tienes elección" />
          <MetricCard label="Mis aciertos" value={myScore?.totalCorrect ?? myScore?.totalPoints ?? 0} detail="Actualizado al recalcular ranking" />
        </div>

        <section className="twoCol">
          <RulesPanel group={group} />
          <aside className="panel stack">
            <h2>Tu posición</h2>
            {myScore ? (
              <>
                <p style={{ margin: 0 }}>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1 }}>{myScore.totalCorrect ?? myScore.totalPoints}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>aciertos acumulados</span>
                </p>
                {myPrize ? (
                  <p style={{ margin: 0 }}>Premio estimado: <strong className="rankingPrize">{formatMoney(myPrize.estimatedPrize, group.currency)}</strong></p>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>Premio pendiente de calcular.</p>
                )}
                <Link className="button secondary" href={`/groups/${group.id}/ranking`} style={{ alignSelf: "flex-start" }}>Ver ranking completo</Link>
              </>
            ) : (
              <p className="muted">Aún no tienes aciertos registrados. Pronostica para aparecer en el ranking.</p>
            )}
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
            {matches.length === 0 ? (
              <p className="muted">Aún no hay fixtures cargados.</p>
            ) : (
              <div className="stack">
                {matches.slice(0, 5).map((match) => (
                  <div key={match.id}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{getMatchTitle(match)}</p>
                    <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Top ranking</h2>
            {scores.length === 0 ? (
              <p className="muted">Sin aciertos calculados todavía.</p>
            ) : (
              scores.slice(0, 5).map((score, index) => (
                <p key={score.uid} style={{ margin: 0 }}>
                  <strong style={{ fontFamily: "var(--font-display)", marginRight: 6 }}>{index + 1}.</strong>
                  {score.displayName ?? score.uid}
                  <span className="muted" style={{ marginLeft: 6 }}>{score.totalCorrect ?? score.totalPoints} aciertos</span>
                </p>
              ))
            )}
          </section>

          <section className="panel stack">
            <h2>Premios estimados</h2>
            {prizes.length === 0 ? (
              <p className="muted">Recalcula ranking cuando haya resultados.</p>
            ) : (
              prizes.map((prize) => {
                const name = scores.find((s) => s.uid === prize.uid)?.displayName ?? members.find((m) => m.uid === prize.uid)?.displayName ?? prize.uid;
                return (
                  <p key={prize.uid} style={{ margin: 0 }}>
                    <strong>{name}</strong>
                    <span className="muted" style={{ marginLeft: 6 }}>{formatMoney(prize.estimatedPrize, group.currency)}</span>
                  </p>
                );
              })
            )}
          </section>
        </div>
      </main>

      <Link className="stickyPredictButton" href={`/groups/${group.id}/predictions`}>
        Pronosticar ahora
        {pendingPredictions > 0 ? <span className="badge">{pendingPredictions}</span> : null}
      </Link>
    </>
  );
}
