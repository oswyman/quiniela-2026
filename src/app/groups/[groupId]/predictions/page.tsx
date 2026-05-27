"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { shortCountdown, toDate } from "@/lib/format";
import { getGroup, listMatches, listPredictions, savePrediction } from "@/lib/firebase/firestore";
import { getDisplayTeam, getMatchTitle } from "@/lib/matchDisplay";
import { formatMatchTime, matchTimeLabel, type MatchTimeMode } from "@/lib/matchTime";
import { inferPickType, isMatchClosed, type GroupPick, type PredictionPickType } from "@/lib/scoring";
import { getUserTimeZone } from "@/lib/timezone";
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeMode, setTimeMode] = useState<MatchTimeMode>("cdmx");
  const [userTimeZone, setUserTimeZone] = useState("America/Mexico_City");

  useEffect(() => {
    setUserTimeZone(getUserTimeZone());
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

  const byMatch = useMemo(() => new Map(predictions.map((prediction) => [prediction.matchId, prediction])), [predictions]);
  const visibleMatches = useMemo(() => matches.filter(isVisibleForParticipants), [matches]);
  const groupStageCount = visibleMatches.filter((match) => inferPickType(match) === "GROUP_OUTCOME").length;
  const knockoutCount = visibleMatches.length - groupStageCount;

  async function submitPrediction(match: Match, pickType: PredictionPickType, pick: string) {
    if (!user) return;
    setError("");
    setMessage("");
    setSavingMatchId(match.id);

    if (isMatchClosed(toDate(match.kickoffAt))) {
      setError("Este partido ya cerró. No se puede crear ni editar el pronóstico.");
      setSavingMatchId("");
      return;
    }

    try {
      await savePrediction(params.groupId, match.id, pickType, pick);
      setMessage(`Elección guardada para ${getMatchTitle(match)}.`);
      setPredictions(await listPredictions(params.groupId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el pronóstico.");
    } finally {
      setSavingMatchId("");
    }
  }

  if (loading) return <main className="container shell"><div className="panel">Cargando partidos y pronósticos...</div></main>;
  if (!group) return <main className="container shell"><EmptyState title="Grupo no encontrado" body="Vuelve al dashboard para seleccionar un grupo activo." href="/dashboard" action="Dashboard" /></main>;

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title="Pronósticos" subtitle="Elige quién gana o empata en grupos. Desde ronda de 32 elegirás quién avanza." />
        <GroupNav groupId={params.groupId} />
      </div>
      <StatusMessage>Nuevo formato: cada partido atinado suma 1 acierto. Ya no se capturan marcadores por participante.</StatusMessage>
      <StatusMessage>La fase de grupos se evalúa a 90 minutos. La eliminación directa se evalúa por equipo que avanza.</StatusMessage>
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <StatusMessage>Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</StatusMessage>
      ) : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <section className="metricsGrid">
        <div className="stat"><strong>{groupStageCount}</strong><span>partidos de grupos visibles</span></div>
        <div className="stat"><strong>{knockoutCount}</strong><span>partidos de eliminación publicados</span></div>
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
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures manuales o sincronizar un proveedor opcional." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}

      {matches.length > 0 && visibleMatches.length === 0 ? (
        <EmptyState title="Aún no hay partidos disponibles" body="La fase de grupos debe estar cargada o el superadmin debe publicar la ronda de 32 tras revisar cruces, horarios y sedes." />
      ) : null}

      <div className="grid">
        {visibleMatches.map((match) => {
          const prediction = byMatch.get(match.id);
          const closed = isMatchClosed(toDate(match.kickoffAt));
          const pickType = inferPickType(match);
          const homeTeam = getDisplayTeam(match, "home");
          const awayTeam = getDisplayTeam(match, "away");
          const options = getPickOptions(match, pickType, homeTeam, awayTeam);
          return (
            <article className="panel stack matchCard" key={match.id}>
              <div className="cluster">
                <span className="pill">{match.phase}</span>
                <span className="pill">{pickType === "GROUP_OUTCOME" ? "Elige resultado" : "Elige clasificado"}</span>
                <span className="pill">{closed ? "Cerrado" : `Cierra en ${shortCountdown(match.kickoffAt)}`}</span>
              </div>
              <div>
                <h2>{homeTeam} vs {awayTeam}</h2>
                <p className="muted">{formatMatchTime(match, timeMode, userTimeZone)} · {match.venue ?? "Sede por confirmar"}</p>
                <p className="fineprint">CDMX: {formatMatchTime(match, "cdmx", userTimeZone)} · Tu hora: {formatMatchTime(match, "local", userTimeZone)}</p>
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
              {prediction ? (
                <p className="muted">Guardado: {labelPick(prediction, homeTeam, awayTeam)} · {prediction.scoringReason ?? "Pendiente de resultado"}</p>
              ) : (
                <p className="muted">Pendiente de elegir.</p>
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
      { value: match.resolvedHomeTeam || match.homeTeam, label: "Avanza", caption: homeTeam },
      { value: match.resolvedAwayTeam || match.awayTeam, label: "Avanza", caption: awayTeam }
    ];
  }
  return [
    { value: "HOME" satisfies GroupPick, label: "Gana", caption: homeTeam },
    { value: "DRAW" satisfies GroupPick, label: "Empate", caption: "Igualan en 90 min" },
    { value: "AWAY" satisfies GroupPick, label: "Gana", caption: awayTeam }
  ];
}

function labelPick(prediction: Prediction, homeTeam: string, awayTeam: string) {
  if (prediction.pickType === "ADVANCING_TEAM") return `avanza ${prediction.pick}`;
  if (prediction.pick === "HOME") return `gana ${homeTeam}`;
  if (prediction.pick === "AWAY") return `gana ${awayTeam}`;
  if (prediction.pick === "DRAW") return "empate";
  return prediction.pick ?? "pendiente";
}
