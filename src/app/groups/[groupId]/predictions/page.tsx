"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { formatDate, shortCountdown, toDate } from "@/lib/format";
import { getGroup, listMatches, listPredictions, savePrediction } from "@/lib/firebase/firestore";
import { isMatchClosed } from "@/lib/scoring";
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

  async function submitPrediction(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");
    setSavingMatchId(match.id);

    const closed = isMatchClosed(toDate(match.kickoffAt));
    if (closed) {
      setError("Este partido ya cerró. No se puede crear ni editar el pronóstico.");
      setSavingMatchId("");
      return;
    }

    const form = new FormData(event.currentTarget);
    const homeGoals = Number(form.get("homeGoals"));
    const awayGoals = Number(form.get("awayGoals"));

    try {
      await savePrediction(params.groupId, user.uid, match.id, homeGoals, awayGoals);
      setMessage(`Pronóstico guardado para ${match.homeTeam} vs ${match.awayTeam}.`);
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
        <PageTitle title="Pronósticos" subtitle="Captura tus marcadores antes del kickoff. El backend valida el cierre con hora confiable." />
        <GroupNav groupId={params.groupId} />
      </div>
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <StatusMessage>Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</StatusMessage>
      ) : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {matches.length === 0 ? (
        <EmptyState title="No hay partidos cargados" body="Un superadmin debe cargar fixtures manuales o sincronizar un proveedor opcional." href={`/groups/${params.groupId}/admin`} action="Ir a administración" />
      ) : null}
      <div className="grid">
        {matches.map((match) => {
          const prediction = byMatch.get(match.id);
          const closed = isMatchClosed(toDate(match.kickoffAt));
          return (
            <form className="panel stack matchCard" key={match.id} onSubmit={(event) => submitPrediction(event, match)}>
              <div className="cluster">
                <span className="pill">{match.phase}</span>
                <span className="pill">{closed ? "Cerrado" : `Cierra en ${shortCountdown(match.kickoffAt)}`}</span>
              </div>
              <div>
                <h2>{match.homeTeam} vs {match.awayTeam}</h2>
                <p className="muted">{formatDate(match.kickoffAt)} · {match.venue ?? "Sede por confirmar"}</p>
              </div>
              <div className="scoreInputs">
                <div className="field">
                  <label htmlFor={`${match.id}-home`}>{match.homeTeam}</label>
                  <input id={`${match.id}-home`} name="homeGoals" type="number" min="0" defaultValue={prediction?.homeGoals ?? ""} disabled={closed || savingMatchId === match.id} required />
                </div>
                <div className="field">
                  <label htmlFor={`${match.id}-away`}>{match.awayTeam}</label>
                  <input id={`${match.id}-away`} name="awayGoals" type="number" min="0" defaultValue={prediction?.awayGoals ?? ""} disabled={closed || savingMatchId === match.id} required />
                </div>
              </div>
              <button className="button" disabled={closed || savingMatchId === match.id} type="submit">
                {savingMatchId === match.id ? "Guardando..." : prediction ? "Actualizar pronóstico" : "Guardar pronóstico"}
              </button>
              {prediction ? <p className="muted">Guardado · {prediction.points} pts · {prediction.scoringReason}</p> : <p className="muted">Pendiente de capturar.</p>}
              {closed ? <Link href={`/groups/${params.groupId}/ranking`}>Ver ranking</Link> : null}
            </form>
          );
        })}
      </div>
    </main>
  );
}
