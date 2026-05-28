"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
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
import { getDisplayTeam } from "@/lib/matchDisplay";
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

function phaseId(phase: string) {
  return `phase-${phase.replace(/\s+/g, "-").toLowerCase()}`;
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
  const [activePhase, setActivePhase] = useState<string>("");
  const [, setTick] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

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

  const groupedByPhase = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of filteredMatches) {
      const phase = match.phase || "Sin fase";
      if (!groups.has(phase)) groups.set(phase, []);
      groups.get(phase)!.push(match);
    }
    return groups;
  }, [filteredMatches]);

  // Todas las fases (para el nav), independiente del filtro activo
  const allPhases = useMemo(() => {
    const seen = new Set<string>();
    for (const m of visibleMatches) seen.add(m.phase || "Sin fase");
    return [...seen];
  }, [visibleMatches]);

  const totalVisible = visibleMatches.length;
  const totalDone = visibleMatches.filter((m) => byMatch.get(m.id)).length;
  const totalPending = visibleMatches.filter((m) => {
    const kickoffDate = toDate(m.kickoffAt);
    return !isMatchClosed(kickoffDate) && !byMatch.get(m.id);
  }).length;
  const progressPct = totalVisible > 0 ? Math.round((totalDone / totalVisible) * 100) : 0;

  // IntersectionObserver para fase activa
  useEffect(() => {
    if (allPhases.length === 0) return;
    const observers: IntersectionObserver[] = [];
    for (const phase of allPhases) {
      const el = document.getElementById(phaseId(phase));
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActivePhase(phase); },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [allPhases]);

  function getScrollOffset() {
    const headerH = 74;
    const toolbarH = toolbarRef.current?.offsetHeight ?? 0;
    return headerH + toolbarH + 8;
  }

  function scrollToPhase(phase: string) {
    const el = document.getElementById(phaseId(phase));
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - getScrollOffset(), behavior: "smooth" });
  }

  function scrollToNextPending() {
    const match = visibleMatches.find((m) => {
      return !isMatchClosed(toDate(m.kickoffAt)) && !byMatch.get(m.id);
    });
    if (!match) return;
    const el = document.getElementById(`match-${match.id}`);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - getScrollOffset(), behavior: "smooth" });
  }

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

  async function submitPrediction(match: Match, pickType: PredictionPickType, pick: string) {
    if (!user) return;

    const kickoffDate = toDate(match.kickoffAt);
    if (isMatchClosed(kickoffDate)) {
      pushToast({ type: "warning", title: "Pronóstico cerrado", body: "El tiempo para elegir en este partido ya venció." });
      return;
    }

    const prevPredictions = predictions;
    setPredictions((prev) => {
      const existing = prev.find((p) => p.matchId === match.id);
      if (existing) return prev.map((p) => p.matchId === match.id ? { ...p, pick, pickType } : p);
      return [...prev, { id: `optimistic-${match.id}`, uid: user.uid, matchId: match.id, pick, pickType, points: 0, isLate: false, status: "valid", scoringReason: "" }];
    });

    setSavingMatchId(match.id);
    try {
      await savePrediction(params.groupId, match.id, pickType, pick);
      const closesAt = predictionClosesAt(kickoffDate);
      pushToast({ type: "success", title: "Pronóstico guardado", body: `Puedes cambiarlo hasta ${formatDeadlineCDMX(closesAt)}` });
      listPredictions(params.groupId).then(setPredictions).catch(() => null);
    } catch (err) {
      setPredictions(prevPredictions);
      const code = (err as { code?: string })?.code ?? "";
      const msg =
        code === "functions/permission-denied" ? "No tienes permiso para pronosticar en este grupo." :
        code === "functions/failed-precondition" ? "El pronóstico ya cerró para este partido." :
        code === "functions/unauthenticated" ? "Sesión expirada — vuelve a iniciar sesión." :
        err instanceof Error ? err.message :
        "No se pudo guardar el pronóstico. Intenta de nuevo.";
      pushToast({ type: "error", title: "No se pudo guardar", body: msg });
    } finally {
      setSavingMatchId("");
    }
  }

  if (loading) return (
    <main className="container shell">
      <div className="panel" role="status" aria-live="polite"><p className="muted" style={{ margin: 0 }}>Cargando partidos...</p></div>
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
        <p>Cada partido atinado suma <strong>1 acierto</strong>. Fase de grupos: elige Local gana, Empate o Visitante gana — resultado a 90 min. Desde ronda de 32, elige el equipo que avanza.</p>
        <p>Puedes cambiar tu elección hasta <strong>90 minutos antes del kickoff</strong>. Después queda bloqueado.</p>
        {group.predictionVisibility === "BEFORE_CLOSE" ? (
          <p className="muted">Este grupo tiene visibilidad antes del cierre — otros pueden ver tus elecciones antes de que el partido cierre.</p>
        ) : null}
      </details>

      {loadError ? <StatusMessage type="error" onRetry={retryLoad}>{loadError}</StatusMessage> : null}

      {/* ── Sticky toolbar ───────────────────────────── */}
      <div className="predictionsToolbar" ref={toolbarRef}>
        {/* Barra de progreso */}
        <div className="progressBar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${totalDone} de ${totalVisible} pronósticos`}>
          <div className="progressBarFill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Fila 1: progreso + siguiente pendiente */}
        <div className="predictionsToolbarRow">
          <p className="matchStats" style={{ margin: 0 }}>
            <span><strong>{totalDone}</strong>/{totalVisible} pronósticos</span>
            {totalPending > 0 ? (
              <>
                <span className="matchStatsDivider" aria-hidden="true">·</span>
                <span className="pill pill--deadline" style={{ fontSize: "0.78rem", padding: "3px 10px" }}>{totalPending} pendientes</span>
              </>
            ) : null}
          </p>
          {totalPending > 0 ? (
            <button className="button secondary" onClick={scrollToNextPending} type="button" style={{ gap: 6, minHeight: 36, padding: "6px 14px", fontSize: "0.85rem" }}>
              Siguiente pendiente <ChevronDown size={14} aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Fila 2: navegación por fase */}
        {allPhases.length > 1 ? (
          <nav className="phaseNav" aria-label="Saltar a fase">
            {allPhases.map((phase) => (
              <button
                className={activePhase === phase ? "phaseNavBtn active" : "phaseNavBtn"}
                key={phase}
                onClick={() => scrollToPhase(phase)}
                type="button"
              >
                {phase}
              </button>
            ))}
          </nav>
        ) : null}

        {/* Fila 3: filtros + zona horaria */}
        <div className="predictionsToolbarRow">
          <div className="tabs" aria-label="Filtrar partidos">
            <button className={matchFilter === "all" ? "tabButton active" : "tabButton"} onClick={() => setMatchFilter("all")} type="button">Todos</button>
            <button className={matchFilter === "pending" ? "tabButton active" : "tabButton"} onClick={() => setMatchFilter("pending")} type="button">
              Solo pendientes{totalPending > 0 ? <span className="badge" style={{ marginLeft: 6 }}>{totalPending}</span> : null}
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

      {/* ── Estados vacíos ───────────────────────────── */}
      {matches.length === 0 ? (
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures para que puedas pronosticar." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}
      {matches.length > 0 && visibleMatches.length === 0 ? (
        <EmptyState title="Aún no hay partidos disponibles" body="La fase de grupos debe estar cargada, o el superadmin debe publicar la ronda de 32." />
      ) : null}
      {matchFilter === "pending" && filteredMatches.length === 0 && visibleMatches.length > 0 ? (
        <EmptyState title="Todo pronósticado" body="Ya elegiste en todos los partidos abiertos. Vuelve antes del siguiente kickoff si quieres cambiar alguno." />
      ) : null}

      {/* ── Partidos agrupados por fase ───────────────── */}
      <div className="stack-lg">
        {[...groupedByPhase.entries()].map(([phase, phaseMatches]) => {
          const phaseDone = phaseMatches.filter((m) => byMatch.get(m.id)).length;
          return (
            <section key={phase} id={phaseId(phase)}>
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
                      id={`match-${match.id}`}
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
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: CDMX_TIMEZONE
  }).format(date) + " CDMX";
}
