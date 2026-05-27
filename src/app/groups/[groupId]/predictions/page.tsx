"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { Toast, createToastId, type ToastItem } from "@/components/Toast";
import { useAuthUser } from "@/components/useAuthUser";
import { toDate } from "@/lib/format";
import { getGroup, listMatches, listPredictions, savePrediction } from "@/lib/firebase/firestore";
import { getDisplayTeam, getMatchTitle } from "@/lib/matchDisplay";
import { formatMatchTime, matchTimeLabel, type MatchTimeMode } from "@/lib/matchTime";
import { inferPickType, isMatchClosed, predictionClosesAt, type GroupPick, type PredictionPickType } from "@/lib/scoring";
import { teamFlagEmoji } from "@/lib/teamFlags";
import { CDMX_TIMEZONE, getUserTimeZone } from "@/lib/timezone";
import type { Group, Match, Prediction } from "@/types";

export default function PredictionsPage() {
  return (
    <AuthGate>
      <PredictionsContent />
    </AuthGate>
  );
}

function PredictionsContent() {
  const { user } = useAuthUser();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    setUserTimeZone(getUserTimeZone());
  }, []);

  // Re-render countdowns cada minuto
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextMatches, nextPredictions] = await Promise.all([
          getGroup(params.groupId),
          listMatches(),
          listPredictions(params.groupId)
        ]);
        setGroup(nextGroup);
        setMatches(nextMatches);
        setPredictions(nextPredictions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los partidos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function pushToast(item: Omit<ToastItem, "id">) {
    setToasts((prev) => [...prev, { ...item, id: createToastId() }]);
  }

  const byMatch = useMemo(() => new Map(predictions.map((p) => [p.matchId, p])), [predictions]);
  const visibleMatches = useMemo(() => matches.filter(isVisibleForParticipants), [matches]);
  const groupStageCount = visibleMatches.filter((m) => inferPickType(m) === "GROUP_OUTCOME").length;
  const knockoutCount = visibleMatches.length - groupStageCount;

  async function submitPrediction(match: Match, pickType: PredictionPickType, pick: string) {
    if (!user) return;
    setError("");

    const kickoffDate = toDate(match.kickoffAt);
    if (isMatchClosed(kickoffDate)) {
      pushToast({
        type: "warning",
        title: "Pronóstico cerrado",
        body: "El tiempo para elegir en este partido ya venció."
      });
      return;
    }

    // Optimistic update — marcar la selección inmediatamente
    const prevPredictions = predictions;
    setPredictions((prev) => {
      const existing = prev.find((p) => p.matchId === match.id);
      if (existing) {
        return prev.map((p) => p.matchId === match.id ? { ...p, pick, pickType } : p);
      }
      return [...prev, { id: `optimistic-${match.id}`, uid: user.uid, matchId: match.id, pick, pickType, points: 0, isLate: false, status: "valid", scoringReason: "" }];
    });

    setSavingMatchId(match.id);
    try {
      await savePrediction(params.groupId, match.id, pickType, pick);

      const closesAt = predictionClosesAt(kickoffDate);
      const deadline = formatDeadlineCDMX(closesAt);
      pushToast({
        type: "success",
        title: "Pronóstico guardado",
        body: `Puedes cambiarlo hasta ${deadline}`
      });

      // Sync en background sin bloquear la UI
      listPredictions(params.groupId).then(setPredictions).catch(() => null);
    } catch (err) {
      // Revertir optimistic update
      setPredictions(prevPredictions);
      const msg = err instanceof Error ? err.message : "No se pudo guardar el pronóstico.";
      pushToast({ type: "error", title: "No se pudo guardar", body: msg });
      setError(msg);
    } finally {
      setSavingMatchId("");
    }
  }

  if (loading) return <main className="container shell"><div className="panel">Cargando partidos y pronósticos...</div></main>;
  if (!group) return <main className="container shell"><EmptyState title="Grupo no encontrado" body="Vuelve al dashboard para seleccionar un grupo activo." href="/dashboard" action="Dashboard" /></main>;

  return (
    <main className="container shell stack-lg">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="toolbar">
        <PageTitle title="Pronósticos" subtitle="Elige quién gana o empate en grupos. Desde ronda de 32, elige quién avanza." />
        <GroupNav groupId={params.groupId} />
      </div>

      <details className="panel stack rulesPanel">
        <summary className="rulesSummary">¿Cómo funciona? <span className="muted">(toca para ver las reglas)</span></summary>
        <p>Cada partido atinado suma <strong>1 acierto</strong>. En la fase de grupos elige Local gana, Empate o Visitante gana — el resultado se evalúa a 90 minutos. Desde la ronda de 32, elige el equipo que avanza al siguiente round.</p>
        <p>Puedes cambiar tu elección en cualquier momento hasta <strong>90 minutos antes del kickoff</strong> de cada partido. Después de ese límite, el pronóstico queda bloqueado.</p>
        {group.predictionVisibility === "BEFORE_CLOSE" ? (
          <p className="muted">Este grupo tiene visibilidad antes del cierre — otros participantes pueden ver tus elecciones antes de que el partido cierre.</p>
        ) : null}
      </details>

      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <section className="metricsGrid">
        <div className="stat"><strong>{groupStageCount}</strong><span>partidos de grupos</span></div>
        <div className="stat"><strong>{knockoutCount}</strong><span>eliminatorios publicados</span></div>
        <div className="stat"><strong>{predictions.length}</strong><span>elecciones guardadas</span></div>
      </section>

      <div className="tabs" aria-label="Preferencia de horario">
        {(["cdmx", "local", "venue"] as MatchTimeMode[]).map((mode) => (
          <button className={timeMode === mode ? "tabButton active" : "tabButton"} key={mode} onClick={() => setTimeMode(mode)} type="button">
            {matchTimeLabel(mode)}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures para que puedas pronosticar." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}

      {matches.length > 0 && visibleMatches.length === 0 ? (
        <EmptyState title="Aún no hay partidos disponibles" body="La fase de grupos debe estar cargada, o el superadmin debe publicar la ronda de 32 tras revisar cruces, horarios y sedes." />
      ) : null}

      <div className="grid">
        {visibleMatches.map((match) => {
          const prediction = byMatch.get(match.id);
          const kickoffDate = toDate(match.kickoffAt);
          const closed = isMatchClosed(kickoffDate);
          const closesAt = predictionClosesAt(kickoffDate);
          const pickType = inferPickType(match);
          const homeTeam = getDisplayTeam(match, "home");
          const awayTeam = getDisplayTeam(match, "away");
          const options = getPickOptions(match, pickType, homeTeam, awayTeam);
          return (
            <article className={`panel stack matchCard${closed ? " matchCard--closed" : ""}`} key={match.id}>
              <div className="cluster">
                <span className="pill">{match.phase}</span>
                <span className="pill">{pickType === "GROUP_OUTCOME" ? "Resultado a 90 min" : "Elige clasificado"}</span>
                {closed ? (
                  <span className="closedBadge"><Lock size={12} aria-hidden /> Cerrado</span>
                ) : (
                  <span className="pill">Cierra {formatDeadlineCDMX(closesAt)}</span>
                )}
              </div>
              <div>
                <h2 className="teamsTitle">
                  <span>{teamFlagEmoji(homeTeam)} {homeTeam}</span>
                  <span>vs</span>
                  <span>{teamFlagEmoji(awayTeam)} {awayTeam}</span>
                </h2>
                <p className="muted">{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</p>
              </div>
              <div className="choiceGrid" role="group" aria-label={`Elección para ${homeTeam} vs ${awayTeam}`}>
                {options.map((option) => (
                  <button
                    className={prediction?.pick === option.value ? "choiceButton active" : "choiceButton"}
                    disabled={closed || savingMatchId === match.id}
                    key={option.value}
                    onClick={() => submitPrediction(match, pickType, option.value)}
                    type="button"
                  >
                    <span>{option.label}</span>
                    <strong>{option.caption}</strong>
                  </button>
                ))}
              </div>
              {closed ? (
                <p className="muted">
                  {prediction
                    ? `Tu elección: ${labelPick(prediction, homeTeam, awayTeam)} · ${prediction.scoringReason || "Resultado pendiente"}`
                    : "No registraste una elección antes del cierre."}
                </p>
              ) : (
                <p className="muted">
                  {prediction
                    ? `Guardado: ${labelPick(prediction, homeTeam, awayTeam)} · ${prediction.scoringReason || "Pendiente de resultado"}`
                    : "Pendiente de elegir."}
                </p>
              )}
              {closed ? <Link href={`/groups/${params.groupId}/ranking`}>Ver ranking</Link> : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}

function isVisibleForParticipants(match: Match) {
  const pickType = inferPickType(match);
  if (pickType === "GROUP_OUTCOME") return true;
  return Boolean(match.isPublishedToParticipants && match.isResolved);
}

function getPickOptions(match: Match, pickType: PredictionPickType, homeTeam: string, awayTeam: string) {
  if (pickType === "ADVANCING_TEAM") {
    return [
      { value: match.resolvedHomeTeam || match.homeTeam, label: "Avanza", caption: `${teamFlagEmoji(homeTeam)} ${homeTeam}` },
      { value: match.resolvedAwayTeam || match.awayTeam, label: "Avanza", caption: `${teamFlagEmoji(awayTeam)} ${awayTeam}` }
    ];
  }
  return [
    { value: "HOME" satisfies GroupPick, label: "Gana", caption: `${teamFlagEmoji(homeTeam)} ${homeTeam}` },
    { value: "DRAW" satisfies GroupPick, label: "Empate", caption: "Igualan a 90 min" },
    { value: "AWAY" satisfies GroupPick, label: "Gana", caption: `${teamFlagEmoji(awayTeam)} ${awayTeam}` }
  ];
}

function labelPick(prediction: Prediction, homeTeam: string, awayTeam: string) {
  if (prediction.pickType === "ADVANCING_TEAM") return `avanza ${prediction.pick}`;
  if (prediction.pick === "HOME") return `gana ${homeTeam}`;
  if (prediction.pick === "AWAY") return `gana ${awayTeam}`;
  if (prediction.pick === "DRAW") return "empate";
  return prediction.pick ?? "pendiente";
}

function formatDeadlineCDMX(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CDMX_TIMEZONE
  }).format(date) + " CDMX";
}
