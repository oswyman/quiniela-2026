"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, Lock } from "lucide-react";
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
import { teamDisplayName } from "@/lib/teamNames";
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
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [, setTick] = useState(0);

  useEffect(() => { setUserTimeZone(getUserTimeZone()); }, []);

  // Refresco de countdowns cada minuto
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextMatches, nextPredictions] = await Promise.all([
          getGroup(params.groupId),
          listMatches(),
          listPredictions(params.groupId),
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

  // Solo los propios pronósticos — filtrar por uid evita mostrar picks de otros usuarios antes del cierre
  const byMatch = useMemo(
    () => new Map(predictions.filter((p) => p.uid === user?.uid).map((p) => [p.matchId, p])),
    [predictions, user]
  );

  // Incluye partidos de grupos + knockout publicados aunque no tengan equipos aún
  const visibleMatches = useMemo(() => matches.filter(isVisibleForParticipants), [matches]);

  // Fases únicas en orden canónico (torneos tienen orden fijo)
  const phases = useMemo(() => {
    const seen = new Set<string>();
    for (const m of visibleMatches) seen.add(m.phase || "Sin fase");
    return [...seen].sort((a, b) => {
      const ia = PHASE_ORDER.indexOf(a);
      const ib = PHASE_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });
  }, [visibleMatches]);

  // Inicializar tab activa en la primera fase con pendientes, si no en la primera
  useEffect(() => {
    if (phases.length === 0) return;
    if (activeTab && phases.includes(activeTab)) return;
    const firstPending = phases.find((p) =>
      visibleMatches
        .filter((m) => (m.phase || "Sin fase") === p)
        .some((m) => m.isResolved !== false && !isMatchClosed(toDate(m.kickoffAt)) && !byMatch.get(m.id))
    );
    setActiveTab(firstPending ?? phases[0]);
  }, [phases]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partidos de la fase activa
  const tabMatches = useMemo(
    () => visibleMatches.filter((m) => (m.phase || "Sin fase") === activeTab),
    [visibleMatches, activeTab],
  );

  // Badges por fase: pendientes (solo partidos con equipos conocidos, abiertos, sin pick)
  const phasePending = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of visibleMatches) {
      const p = m.phase || "Sin fase";
      const canPick = m.isResolved !== false && !isMatchClosed(toDate(m.kickoffAt)) && !byMatch.get(m.id);
      if (canPick) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  }, [visibleMatches, byMatch]);

  const totalPending = [...phasePending.values()].reduce((s, n) => s + n, 0);

  // Fases completas: sin pendientes y con al menos un pick propio (evita marcar fases TBD vacías)
  const phaseComplete = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of visibleMatches) {
      const p = m.phase || "Sin fase";
      if (byMatch.get(m.id)) map.set(p, true);
    }
    return map;
  }, [visibleMatches, byMatch]);

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
        code === "functions/unauthenticated" ? "Sesión expirada. Vuelve a iniciar sesión." :
        err instanceof Error ? err.message :
        "No se pudo guardar. Intenta de nuevo.";
      pushToast({ type: "error", title: "No se pudo guardar", body: msg });
    } finally {
      setSavingMatchId("");
    }
  }

  if (loading) return (
    <main className="container shell stack-lg" role="status" aria-live="polite" aria-label="Cargando partidos">
      <div className="predictionsGrid">
        {[0, 1, 2].map((i) => (
          <div className="panel stack matchCard" key={i} aria-hidden>
            <div className="cluster">
              <span className="skeleton skeletonPill" />
              <span className="skeleton skeletonPill" />
            </div>
            <span className="skeleton skeletonTitle" />
            <span className="skeleton skeletonLineShort" />
            <div className="choiceGrid">
              <span className="skeleton skeletonChoice" />
              <span className="skeleton skeletonChoice" />
              <span className="skeleton skeletonChoice" />
            </div>
          </div>
        ))}
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
        <PageTitle
          title="Mis pronósticos"
          subtitle={
            totalPending > 0
              ? `${totalPending} partido${totalPending > 1 ? "s" : ""} pendiente${totalPending > 1 ? "s" : ""} de pronosticar`
              : "Al día con todos los pronósticos"
          }
        />
        <GroupNav groupId={params.groupId} />
      </div>

      {loadError ? <StatusMessage type="error" onRetry={retryLoad}>{loadError}</StatusMessage> : null}

      <details className="panel stack rulesPanel">
        <summary className="rulesSummary">¿Cómo funciona? <span className="muted">(toca para ver las reglas)</span></summary>
        <p>Cada partido atinado suma <strong>1 acierto</strong>. Fase de grupos: elige Local gana, Empate o Visitante gana (resultado a 90 min). Desde ronda de 32, elige el equipo que avanza.</p>
        <p>Puedes cambiar tu elección hasta <strong>90 minutos antes del kickoff</strong>. Después queda bloqueado.</p>
        {group.predictionVisibility === "BEFORE_CLOSE" ? (
          <p className="muted">Este grupo tiene visibilidad antes del cierre. Otros pueden ver tus elecciones antes de que el partido cierre.</p>
        ) : null}
      </details>

      {/* ── Preferencia horario ─────────────────────── */}
      <div className="cluster" style={{ justifyContent: "flex-end" }}>
        <div className="tabs" aria-label="Preferencia de horario">
          {(["cdmx", "local", "venue"] as MatchTimeMode[]).map((mode) => (
            <button className={timeMode === mode ? "tabButton active" : "tabButton"} key={mode} onClick={() => setTimeMode(mode)} type="button">
              {matchTimeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Estados vacíos ───────────────────────────── */}
      {matches.length === 0 ? (
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures para que puedas pronosticar." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}
      {matches.length > 0 && visibleMatches.length === 0 ? (
        <EmptyState title="Aún no hay partidos disponibles" body="La fase de grupos debe estar cargada, o el superadmin debe publicar la ronda de 32." />
      ) : null}

      {visibleMatches.length > 0 ? (
        <>
          {/* ── Tabs de fase ───────────────────────────── */}
          <nav className="phaseTabs" aria-label="Seleccionar fase">
            {phases.map((phase) => {
              const pending = phasePending.get(phase) ?? 0;
              return (
                <button
                  key={phase}
                  className={activeTab === phase ? "phaseTab active" : "phaseTab"}
                  onClick={() => setActiveTab(phase)}
                  type="button"
                >
                  {phase}
                  {pending > 0 ? (
                    <span className="phaseTabBadge">{pending}</span>
                  ) : phaseComplete.get(phase) ? (
                    <span className="phaseTabCheck" aria-label="Fase completa">✓</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* ── Cards de la fase activa ─────────────────── */}
          <div className="predictionsGrid">
            {tabMatches.length === 0 ? (
              <EmptyState title="Sin partidos en esta fase" body="Los partidos de esta fase aún no se publican. Vuelve cuando avance el torneo." />
            ) : tabMatches.map((match) => {
              const prediction = byMatch.get(match.id);
              const kickoffDate = toDate(match.kickoffAt);
              const closed = isMatchClosed(kickoffDate);
              const closesAt = predictionClosesAt(kickoffDate);
              const pickType = inferPickType(match);
              const homeTeam = getDisplayTeam(match, "home");
              const awayTeam = getDisplayTeam(match, "away");
              const teamsKnown = match.isResolved !== false;
              const isLive = match.status === "live";
              const hasResult = match.status === "finished";
              const isCorrect = prediction?.isCorrect;
              const options = getPickOptions(match, pickType, homeTeam, awayTeam);

              // Card state classes
              const cardClass = [
                "panel stack matchCard",
                closed && !isLive ? "matchCard--closed" : "",
                !teamsKnown ? "matchCard--tbd" : "",
                isLive ? "matchCard--live" : "",
                hasResult && isCorrect === true ? "matchCard--correct" : "",
                hasResult && isCorrect === false ? "matchCard--wrong" : "",
              ].filter(Boolean).join(" ");

              return (
                <article
                  className={cardClass}
                  id={`match-${match.id}`}
                  key={match.id}
                >
                  {/* ── Cabecera: estado y tipo ─────────── */}
                  <div className="cluster">
                    {isLive ? (
                      <span className="liveBadge"><span className="liveDot" aria-hidden />EN VIVO</span>
                    ) : closed ? (
                      <span className="closedBadge"><Lock size={12} aria-hidden /> Cerrado</span>
                    ) : !teamsKnown ? (
                      <span className="pill pill--tbd"><Clock size={12} aria-hidden /> Equipos por definir</span>
                    ) : closesAt.getTime() - Date.now() <= DAY_MS ? (
                      <span className="pill pill--closing"><Clock size={12} aria-hidden /> Cierra en {formatCountdown(closesAt.getTime() - Date.now())}</span>
                    ) : (
                      <span className="pill pill--deadline">Cierra {formatDeadlineCDMX(closesAt)}</span>
                    )}
                    <span className="pill">{pickType === "GROUP_OUTCOME" ? "Resultado a 90 min" : "Elige clasificado"}</span>
                  </div>

                  {/* ── Equipos ─────────────────────────── */}
                  <div>
                    <h2 className="teamsTitle">
                      <span>{teamFlagEmoji(homeTeam)} {homeTeam}</span>
                      <span>vs</span>
                      <span>{teamFlagEmoji(awayTeam)} {awayTeam}</span>
                    </h2>
                    <p className="matchVenue muted">{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</p>
                  </div>

                  {/* ── Resultado / marcador en vivo ────── */}
                  {(hasResult || isLive) && (match.homeGoals90 !== null && match.homeGoals90 !== undefined) ? (
                    <div className={`matchResultBadge${isLive ? " matchResultBadge--live" : isCorrect === true ? " matchResultBadge--correct" : isCorrect === false ? " matchResultBadge--wrong" : ""}`}>
                      <span className="matchResultLabel">{isLive ? "Marcador" : "Resultado final"}</span>
                      {match.winnerTeam
                        ? <span className="matchResultScore">{teamFlagEmoji(match.winnerTeam)} {teamDisplayName(match.winnerTeam)} <span className="matchResultLabel">avanza</span></span>
                        : <span className="matchResultScore">{match.homeGoals90} <span className="matchResultSep">-</span> {match.awayGoals90 ?? "?"}</span>
                      }
                      {!isLive && isCorrect === true && <span className="pickCorrectTag">✓ Acertaste</span>}
                      {!isLive && isCorrect === false && <span className="pickWrongTag">✗ No acertaste</span>}
                      {!isLive && (isCorrect === null || isCorrect === undefined) && <span className="matchResultLabel">Pendiente de calcular</span>}
                    </div>
                  ) : null}

                  {/* ── Botones de pick ─────────────────── */}
                  <div className="choiceGrid" role="group" aria-label={`Elección para ${homeTeam} vs ${awayTeam}`}>
                    {options.map((option) => (
                      <button
                        className={prediction?.pick === option.value ? "choiceButton active" : "choiceButton"}
                        disabled={closed || !teamsKnown || savingMatchId === match.id}
                        key={option.value}
                        onClick={() => submitPrediction(match, pickType, option.value)}
                        type="button"
                        title={!teamsKnown ? "Disponible cuando se confirmen los equipos" : undefined}
                      >
                        <span>{option.label}</span>
                        <strong>{option.caption}</strong>
                      </button>
                    ))}
                  </div>

                  {/* ── Footer: pick del usuario ─────────── */}
                  {closed ? (
                    prediction ? (
                      <div className={`pickResultRow${prediction.isCorrect === true ? " pickResultRow--correct" : prediction.isCorrect === false ? " pickResultRow--wrong" : ""}`}>
                        <span className="pickResultLabel">{labelPick(prediction, homeTeam, awayTeam)}</span>
                        {prediction.isCorrect === true && <span className="pickCorrectTag">✓ +1 acierto</span>}
                        {prediction.isCorrect === false && <span className="pickWrongTag">✗ sin acierto</span>}
                        {prediction.isCorrect === null && <span className="muted" style={{ fontSize: "0.8rem" }}>Resultado pendiente</span>}
                      </div>
                    ) : (
                      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>No registraste una elección antes del cierre.</p>
                    )
                  ) : !teamsKnown ? (
                    <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Los equipos se confirmarán después de la fase anterior.</p>
                  ) : (
                    <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                      {prediction ? `Guardado: ${labelPick(prediction, homeTeam, awayTeam)}` : "Pendiente de elegir."}
                    </p>
                  )}

                  {hasResult ? (
                    <Link className="button secondary" style={{ alignSelf: "flex-start", fontSize: "0.85rem", minHeight: 36, padding: "6px 14px" }} href={`/groups/${params.groupId}/ranking`}>Ver ranking</Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </main>
  );
}

function isVisibleForParticipants(_match: Match) {
  // Todas las fases son visibles siempre.
  // Las tarjetas TBD (teamsKnown=false) muestran botones deshabilitados
  // hasta que el admin confirme el bracket.
  return true;
}

// Orden canónico de fases para las pestañas
const PHASE_ORDER = [
  "Fase de grupos",
  "Ronda de 32",
  "Dieciseisavos de final",
  "Octavos de final",
  "Cuartos de final",
  "Semifinal",
  "Tercer lugar",
  "Final",
];

function getPickOptions(match: Match, pickType: PredictionPickType, homeTeam: string, awayTeam: string) {
  if (pickType === "ADVANCING_TEAM") {
    return [
      { value: match.resolvedHomeTeam || match.homeTeam, label: "Avanza", caption: `${teamFlagEmoji(homeTeam)} ${homeTeam}` },
      { value: match.resolvedAwayTeam || match.awayTeam, label: "Avanza", caption: `${teamFlagEmoji(awayTeam)} ${awayTeam}` },
    ];
  }
  return [
    { value: "HOME" satisfies GroupPick, label: "Gana", caption: `${teamFlagEmoji(homeTeam)} ${homeTeam}` },
    { value: "DRAW" satisfies GroupPick, label: "Empate", caption: "Igualan a 90 min" },
    { value: "AWAY" satisfies GroupPick, label: "Gana", caption: `${teamFlagEmoji(awayTeam)} ${awayTeam}` },
  ];
}

function labelPick(prediction: Prediction, homeTeam: string, awayTeam: string) {
  if (prediction.pickType === "ADVANCING_TEAM") return `avanza ${teamDisplayName(prediction.pick)}`;
  if (prediction.pick === "HOME") return `gana ${homeTeam}`;
  if (prediction.pick === "AWAY") return `gana ${awayTeam}`;
  if (prediction.pick === "DRAW") return "empate";
  return prediction.pick ?? "pendiente";
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "2h 14m" / "38m" — solo se muestra cuando faltan menos de 24h para el cierre
function formatCountdown(ms: number) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}m` : `${minutes}m`;
}

function formatDeadlineCDMX(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: CDMX_TIMEZONE,
  }).format(date) + " CDMX";
}
