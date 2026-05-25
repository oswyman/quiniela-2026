"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { useAuthUser } from "@/components/useAuthUser";
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

    const closed = isMatchClosed(toDate(match.kickoffAt));
    if (closed) {
      setError("Este partido ya cerró. No se puede crear ni editar el pronóstico.");
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
    }
  }

  if (loading) return <main className="container"><p>Cargando partidos...</p></main>;
  if (!group) return <main className="container"><div className="card">Grupo no encontrado.</div></main>;

  return (
    <main className="container stack">
      <PageTitle title="Pronósticos" subtitle="Puedes crear o editar pronósticos hasta el inicio del partido." />
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <div className="notice">Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</div>
      ) : null}
      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {matches.length === 0 ? <div className="card">No hay partidos cargados. Un administrador puede sincronizar datos mock desde Functions.</div> : null}
      <div className="stack">
        {matches.map((match) => {
          const prediction = byMatch.get(match.id);
          const closed = isMatchClosed(toDate(match.kickoffAt));
          return (
            <form className="card stack" key={match.id} onSubmit={(event) => submitPrediction(event, match)}>
              <div>
                <h2>{match.homeTeam} vs {match.awayTeam}</h2>
                <p className="muted">{formatDate(toDate(match.kickoffAt))} · {closed ? "Cerrado" : "Abierto"}</p>
              </div>
              <div className="grid">
                <div className="field">
                  <label htmlFor={`${match.id}-home`}>{match.homeTeam}</label>
                  <input id={`${match.id}-home`} name="homeGoals" type="number" min="0" defaultValue={prediction?.homeGoals ?? ""} disabled={closed} required />
                </div>
                <div className="field">
                  <label htmlFor={`${match.id}-away`}>{match.awayTeam}</label>
                  <input id={`${match.id}-away`} name="awayGoals" type="number" min="0" defaultValue={prediction?.awayGoals ?? ""} disabled={closed} required />
                </div>
              </div>
              <button className="button" disabled={closed} type="submit">{prediction ? "Actualizar pronóstico" : "Guardar pronóstico"}</button>
              {prediction ? <p className="muted">Guardado. Estado: {prediction.status}. Puntos: {prediction.points}.</p> : null}
            </form>
          );
        })}
      </div>
    </main>
  );
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  return new Date(String(value));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
