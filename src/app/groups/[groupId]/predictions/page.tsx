"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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

type MatchFilter = "all" | "pending";

export default function PredictionsPage() {
  return (
    <AuthGate>
      <PredictionsContent />
    </AuthGate>
  );
}

function PredictionsContent() {
  const { user } = useAuthUser();
  const reduce = useReducedMotion();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [, setTick] = useState(0);

  useEffect(() => {
    setUserTimeZone(getUserTimeZone());
  }, []);

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
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los partidos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId, retryCount]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError("");
    setLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  function pushToast(item: Omit<ToastItem, "id">) {
    setToasts((prev) => [...prev, { ...item, id: createToastId() }]);
  }

  const byMatch = useMemo(() => new Map(predictions.map((p) => [p.matchId, p])), [predictions]);
  const visibleMatches = useMemo(() => matches.filter(isVisibleForParticipants), [matches]);

  const filteredMatches = useMemo(() => {
    if (matchFilter === "pending") {
      return visibleMatches.filter((m) => {
        const kickoffDate = toDate(m.kickoffAt);
        return !isMatchClosed(kickoffDate) && !byMatch.get(m.id);
      });
    }
    return visibleMatches;
  }, [visibleMatches, matchFilter, byMatch]);

  // Agrupar por fase manteniendo el orden original
  const groupedByPhase = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of filteredMatches) {
      const phase = match.phase || "Sin fase";
      if (!groups.has(phase)) groups.set(phase, []);
      groups.get(phase)!.push(match);
    }
    return groups;
  }, [filteredMatches]);

  const totalVisible = visibleMatches.length;
  const totalDone = visibleMatches.filter((m) => byMatch.get(m.id)).length;
  const totalPending = visibleMatches.filter((m) => {
    const kickoffDate = toDate(m.kickoffAt);
    return !isMatchClosed(kickoffDate) && !byMatch.get(m.id);
  }).length;

  async function submitPrediction(match: Match, pickType: PredictionPickType, pick: string) {
    if (!user) return;

    const kickoffDate = toDate(match.kickoffAt);
    if (isMatchClosed(kickoffDate)) {
      pushToast({
        type: "warning",
        title: "Pronóstico cerrado",
        body: "El tiempo para elegir en este partido ya venció."
      });
      return;
    }

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

      listPredictions(params.groupId).then(setPredictions).catch(() => null);
    } catch (err) {
      // Revertir optimistic update
      setPredictions(prevPredictions);
      const msg = err instanceof Error ? err.message : "No se pudo guardar el pronóstico.";
      // El error de guardado va solo al toast — no al StatusMessage de carga
      pushToast({ type: "error", title: "No se pudo guardar", body: msg });
    } finally {
      setSavingMatchId("");
    }
  }

  if (loading) return (
    <main className="container shell">
      <div className="panel" role="status" aria-live="polite">
        <p className="muted" style={{ margin: 0 }}>Cargando partidos...</p>
      </div>
    </main>
  );

  if (!group) return (
    <main className="container shell">
      <EmptyState title="Grupo no encontrado" body="Vuelve al dashboard para seleccionar un grupo activo." href="/dashboard" action="Dashboard" />
    </main>
  );

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

      {loadError ? <StatusMessage type="error" onRetry={retryLoad}>{loadError}</StatusMessage> : null}

      {/* Progreso + filtros */}
      <div className="predictionsToolbar">
        <p className="matchStats">
          <span><strong>{totalDone}</strong>/{totalVisible} pronósticos</span>
          {totalPending > 0 ? (
            <>
              <span className="matchStatsDivider" aria-hidden="true">·</span>
              <span className="pill pill--deadline" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>{totalPending} sin elegir</span>
            </>
          ) : null}
        </p>
        <div className="cluster">
          <div className="tabs" aria-label="Filtrar partidos">
            <button className={matchFilter === "all" ? "tabButton active" : "tabButton"} onClick={() => setMatchFilter("all")} type="button">Todos</button>
            <button className={matchFilter === "pending" ? "tabButton active" : "tabButton"} onClick={() => setMatchFilter("pending")} type="button">
              Solo pendientes
              {totalPending > 0 ? <span className="badge">{totalPending}</span> : null}
            </button>
          </div>
          <div className="tabs" aria-label="Preferencia de horario">
            {(["cdmx", "local", "venue"] as MatchTimeMode[]).map((mode) => (
              <button className={timeMode === mode ? "tabButton active" : "tabButton"} key={mode} onClick={() => setTimeMode(mode)} type="button">
                {matchTimeLabel(mode)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures para que puedas pronosticar." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}

      {matches.length > 0 && visibleMatches.length === 0 ? (
        <EmptyState title="Aún no hay partidos disponibles" body="La fase de grupos debe estar cargada, o el superadmin debe publicar la ronda de 32 tras revisar cruces, horarios y sedes." />
      ) : null}

      {matchFilter === "pending" && filteredMatches.length === 0 ? (
        <EmptyState title="Todo pronósticado" body="Ya elegiste en todos los partidos abiertos. Vuelve antes del siguiente kickoff si quieres cambiar alguno." />
      ) : null}

      {/* Partidos agrupados por fase */}
      <div className="stack-lg">
        {[...groupedByPhase.entries()].map(([phase, phaseMatches]) => {
          const phaseDone = phaseMatches.filter((m) => byMatch.get(m.id)).length;
          return (
            <section key={phase}>
              <div className="predictionPhaseHeader">
                <span className="predictionPhaseTitle">{phase}</span>
                <span className="muted fineprint">{phaseDone}/{phaseMatches.length}</span>
              </div>
              <div className="predictionsGrid">
                {phaseMatches.map((match) => {
                  const prediction = byMatch.get(match.id);
                  const kickoffDate = toDate(match.kickoffAt);
                  const closed = isMatchClosed(kickoffDate);
                  const closesAt = predictionClosesAt(kickoffDate);
                  const pickType = inferPickType(match);
                  const homeTeam = getDisplayTeam(match, "home");
                  const awayTeam = getDisplayTeam(match, "away");
                  const options = getPickOptions(match, pickType, homeTeam, awayTeam);
                  return (
                    <motion.article
                      className={`panel stack matchCard${closed ? " matchCard--closed" : ""}`}
                      key={match.id}
                      initial={reduce ? false : { opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.05 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="cluster">
                        {closed ? (
                          <span className="closedBadge"><Lock size={12} aria-hidden /> Cerrado</span>
                        ) : (
                          <span className="pill pill--deadline">Cierra {formatDeadlineCDMX(closesAt)}</span>
                        )}
                        <span className="pill">{pickType === "GROUP_OUTCOME" ? "Resultado a 90 min" : "Elige clasificado"}</span>
                      </div>
                      <div>
                        <h2 className="teamsTitle">
                          <span>{teamFlagEmoji(homeTeam)} {homeTeam}</span>
                          <span style={{ color: "var(--muted)", fontSize: "0.6em", fontWeight: 800, textTransform: "uppercase" }}>vs</span>
                          <span>{teamFlagEmoji(awayTeam)} {awayTeam}</span>
                        </h2>
                        <p className="matchVenue muted">{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</p>
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
                      {closed ? (
                        <Link className="button secondary" style={{ alignSelf: "flex-start" }} href={`/groups/${params.groupId}/ranking`}>Ver ranking</Link>
                      ) : null}
                    </motion.article>
                  );
                })}
              </div>
            </section>
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
