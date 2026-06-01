"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { toDate } from "@/lib/format";
import { getGroup, listMatches, listMembers, listPredictions } from "@/lib/firebase/firestore";
import { getDisplayTeam } from "@/lib/matchDisplay";
import { inferPickType, isMatchClosed } from "@/lib/scoring";
import { teamFlagEmoji } from "@/lib/teamFlags";
import { generateGroupPredictionsCsv } from "@/lib/resultsExport";
import type { Group, Match, Member, Prediction } from "@/types";

export default function GroupPredictionsPage() {
  return (
    <AuthGate>
      <GroupPredictionsContent />
    </AuthGate>
  );
}

function GroupPredictionsContent() {
  const { user } = useAuthUser();
  const params = useParams<{ groupId: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextMatches, nextMembers, nextPredictions] = await Promise.all([
          getGroup(params.groupId),
          listMatches(),
          listMembers(params.groupId),
          listPredictions(params.groupId),
        ]);
        setGroup(nextGroup);
        setMatches(nextMatches);
        setMembers(nextMembers);
        setPredictions(nextPredictions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los pronósticos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  // Solo partidos visibles para participantes
  const visibleMatches = useMemo(
    () => matches.filter((m) => inferPickType(m) === "GROUP_OUTCOME" || Boolean(m.isPublishedToParticipants && m.isResolved)),
    [matches],
  );

  // Índice: matchId → uid → prediction
  const predictionIndex = useMemo(() => {
    const idx = new Map<string, Map<string, Prediction>>();
    for (const p of predictions) {
      if (!idx.has(p.matchId)) idx.set(p.matchId, new Map());
      idx.get(p.matchId)!.set(p.uid, p);
    }
    // DEBUG TEMPORAL — eliminar después
    console.log("[DEBUG] predictions cargadas:", predictions.length, predictions.map(p => ({ uid: p.uid, matchId: p.matchId, pick: p.pick })));
    console.log("[DEBUG] members:", members.map(m => ({ uid: m.uid, name: m.displayName })));
    console.log("[DEBUG] user.uid:", user?.uid);
    return idx;
  }, [predictions, members, user]);

  function isCellVisible(match: Match, memberUid: string): boolean {
    if (memberUid === user?.uid) return true; // propio siempre visible
    const closed = isMatchClosed(toDate(match.kickoffAt));
    if (group?.predictionVisibility === "BEFORE_CLOSE") return true;
    return closed; // AFTER_CLOSE: solo si ya cerró
  }

  function pickLabel(prediction: Prediction | undefined, match: Match): string {
    if (!prediction?.pick) return "—";
    const home = getDisplayTeam(match, "home");
    const away = getDisplayTeam(match, "away");
    if (prediction.pick === "HOME") return `${teamFlagEmoji(home)} ${home}`;
    if (prediction.pick === "DRAW") return "Empate";
    if (prediction.pick === "AWAY") return `${teamFlagEmoji(away)} ${away}`;
    // ADVANCING_TEAM — el pick es el nombre del equipo
    return `${teamFlagEmoji(prediction.pick)} ${prediction.pick}`;
  }

  function correctnessIcon(prediction: Prediction | undefined, match: Match): string {
    if (match.status !== "finished") return "";
    if (!prediction) return "";
    if (prediction.isCorrect === true) return " ✓";
    if (prediction.isCorrect === false) return " ✗";
    return "";
  }

  function matchResult(match: Match): string {
    if (match.status !== "finished") return "";
    const home = getDisplayTeam(match, "home");
    const away = getDisplayTeam(match, "away");
    if (match.winnerTeam) {
      return `Avanza: ${match.winnerTeam}`;
    }
    if (typeof match.homeGoals90 === "number" && typeof match.awayGoals90 === "number") {
      return `${home} ${match.homeGoals90} – ${match.awayGoals90} ${away}`;
    }
    return "Resultado cargado";
  }

  function downloadCsv() {
    if (!group) return;
    const csv = generateGroupPredictionsCsv(visibleMatches, members, predictions, group);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pronosticos-grupo-${group.slug ?? group.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <main className="container shell"><div className="panel">Cargando pronósticos del grupo...</div></main>;
  if (!group) return <main className="container shell"><EmptyState title="Grupo no encontrado" body="Vuelve al dashboard para seleccionar un grupo activo." href="/dashboard" action="Dashboard" /></main>;

  const afterClose = group.predictionVisibility === "AFTER_CLOSE";

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle
          title="Pronósticos del grupo"
          subtitle={
            afterClose
              ? "Los pronósticos ajenos se revelan cuando el partido cierra (90 min antes del kickoff)."
              : "Todos los pronósticos son visibles antes del cierre."
          }
        />
        <GroupNav groupId={params.groupId} />
      </div>

      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {visibleMatches.length === 0 ? (
        <EmptyState title="No hay partidos disponibles" body="Aún no hay partidos publicados para este grupo." />
      ) : (
        <>
          {/* ── Tabla desktop ─────────────────────────────── */}
          <div className="tableWrap panel groupPredictionsTable">
            <table className="rankingTable">
              <thead>
                <tr>
                  <th className="cell-nowrap">Partido</th>
                  <th>Fase</th>
                  <th>Resultado</th>
                  {members.map((m) => (
                    <th key={m.uid} className="cell-nowrap" title={m.displayName}>
                      {m.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleMatches.map((match) => {
                  const home = getDisplayTeam(match, "home");
                  const away = getDisplayTeam(match, "away");
                  const closed = isMatchClosed(toDate(match.kickoffAt));
                  const byUid = predictionIndex.get(match.id);
                  const result = matchResult(match);

                  return (
                    <tr key={match.id} className={closed ? "" : "rankingRow"}>
                      <td className="cell-nowrap" style={{ fontWeight: 600 }}>
                        {teamFlagEmoji(home)} {home}
                        <span style={{ color: "var(--muted)", fontWeight: 400, margin: "0 4px" }}>vs</span>
                        {teamFlagEmoji(away)} {away}
                      </td>
                      <td className="cell-nowrap">
                        <span className="pill" style={{ fontSize: "0.72rem" }}>{match.phase}</span>
                      </td>
                      <td className="cell-nowrap">
                        {result
                          ? <span style={{ color: "var(--stadium-700)", fontWeight: 500 }}>{result}</span>
                          : <span className="muted">—</span>}
                      </td>
                      {members.map((m) => {
                        const pred = byUid?.get(m.uid);
                        const visible = isCellVisible(match, m.uid);
                        const isOwn = m.uid === user?.uid;
                        const correct = correctnessIcon(pred, match);

                        return (
                          <td
                            key={m.uid}
                            className="cell-nowrap"
                            style={{
                              color: correct === " ✓" ? "var(--success)" : correct === " ✗" ? "var(--danger)" : undefined,
                              fontWeight: isOwn ? 600 : undefined,
                            }}
                          >
                            {visible
                              ? pred?.pick
                                ? <>{pickLabel(pred, match)}{correct}</>
                                : <span className="muted">—</span>
                              : <span className="muted" title="Se revela al cierre">···</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Cards mobile ──────────────────────────────── */}
          <div className="groupPredictionsCards">
            {visibleMatches.map((match) => {
              const home = getDisplayTeam(match, "home");
              const away = getDisplayTeam(match, "away");
              const closed = isMatchClosed(toDate(match.kickoffAt));
              const byUid = predictionIndex.get(match.id);
              const result = matchResult(match);

              return (
                <div key={match.id} className="panel stack" style={{ gap: 10 }}>
                  <div className="cluster">
                    <span className="pill" style={{ fontSize: "0.72rem" }}>{match.phase}</span>
                    {closed && !result && <span className="pill pill--closed" style={{ fontSize: "0.72rem" }}>Cerrado</span>}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>
                    {teamFlagEmoji(home)} {home} <span className="muted" style={{ fontWeight: 400 }}>vs</span> {teamFlagEmoji(away)} {away}
                  </p>
                  {result && (
                    <p style={{ color: "var(--stadium-700)", fontWeight: 500, margin: 0, fontSize: "0.85rem" }}>
                      {result}
                    </p>
                  )}
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {members.map((m) => {
                      const pred = byUid?.get(m.uid);
                      const visible = isCellVisible(match, m.uid);
                      const isOwn = m.uid === user?.uid;
                      const correct = correctnessIcon(pred, match);

                      return (
                        <li key={m.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                          <span style={{ fontWeight: isOwn ? 700 : 400, color: "var(--stadium-800)" }}>
                            {m.displayName}{isOwn ? " (tú)" : ""}
                          </span>
                          <span
                            style={{
                              color: correct === " ✓" ? "var(--success)" : correct === " ✗" ? "var(--danger)" : "var(--stadium-600)",
                              fontWeight: isOwn ? 600 : 400,
                            }}
                          >
                            {visible
                              ? pred?.pick
                                ? <>{pickLabel(pred, match)}{correct}</>
                                : <span className="muted">—</span>
                              : <span className="muted">···</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* ── Descarga CSV ──────────────────────────────── */}
          <section className="panel stack">
            <div className="cluster">
              <button className="button secondary" onClick={downloadCsv} type="button">
                <Download size={16} aria-hidden />
                Descargar pronósticos CSV
              </button>
            </div>
            <p className="fineprint">
              {afterClose
                ? "El CSV incluye solo los pronósticos de partidos ya cerrados."
                : "El CSV incluye todos los pronósticos del grupo."}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
