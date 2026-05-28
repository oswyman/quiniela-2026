"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { GroupNav } from "@/components/GroupNav";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { getGroup, listMatches, listPredictions } from "@/lib/firebase/firestore";
import { getMatchTitle } from "@/lib/matchDisplay";
import { teamFlagEmoji } from "@/lib/teamFlags";
import { toDate } from "@/lib/format";
import type { Group, Match, Prediction } from "@/types";

export default function ResultsPage() {
  return (
    <AuthGate>
      <ResultsContent />
    </AuthGate>
  );
}

function ResultsContent() {
  const { user } = useAuthUser();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
        setError(err instanceof Error ? err.message : "No se pudieron cargar los resultados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  const byMatch = useMemo(
    () => new Map(predictions.filter((p) => p.uid === user?.uid).map((p) => [p.matchId, p])),
    [predictions, user?.uid]
  );

  const finished = useMemo(
    () => matches.filter((m) => m.status === "finished").sort((a, b) => toDate(b.kickoffAt).getTime() - toDate(a.kickoffAt).getTime()),
    [matches]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return finished;
    return finished.filter((m) => {
      const title = getMatchTitle(m).toLowerCase();
      const date = formatDate(toDate(m.kickoffAt)).toLowerCase();
      return title.includes(q) || date.includes(q);
    });
  }, [finished, search]);

  const stats = useMemo(() => {
    const withPick = finished.filter((m) => byMatch.has(m.id));
    const correct = withPick.filter((m) => byMatch.get(m.id)?.isCorrect === true).length;
    return { total: finished.length, withPick: withPick.length, correct };
  }, [finished, byMatch]);

  if (loading) return (
    <main className="container shell">
      <div className="panel" role="status"><p className="muted" style={{ margin: 0 }}>Cargando resultados...</p></div>
    </main>
  );

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle
          title="Resultados"
          subtitle={`${stats.total} partido${stats.total !== 1 ? "s" : ""} terminado${stats.total !== 1 ? "s" : ""}`}
        />
        <GroupNav groupId={params.groupId} />
      </div>

      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {/* ── Stats row ─────────────────────────────────── */}
      {stats.total > 0 ? (
        <div className="resultsStatRow">
          <div className="resultsStat">
            <span className="resultsStatValue">{stats.correct}</span>
            <span className="resultsStatLabel">acertados</span>
          </div>
          <div className="resultsStatSep" />
          <div className="resultsStat">
            <span className="resultsStatValue">{stats.withPick - stats.correct}</span>
            <span className="resultsStatLabel">fallados</span>
          </div>
          <div className="resultsStatSep" />
          <div className="resultsStat">
            <span className="resultsStatValue">{stats.total - stats.withPick}</span>
            <span className="resultsStatLabel">sin pronóstico</span>
          </div>
          <div className="resultsStatSep" />
          <div className="resultsStat">
            <span className="resultsStatValue resultsStatValue--pct">
              {stats.withPick > 0 ? Math.round((stats.correct / stats.withPick) * 100) : 0}%
            </span>
            <span className="resultsStatLabel">efectividad</span>
          </div>
        </div>
      ) : null}

      {/* ── Buscador ──────────────────────────────────── */}
      <div className="searchBar">
        <Search size={16} className="searchIcon" aria-hidden />
        <input
          className="searchInput"
          type="search"
          placeholder="Buscar por equipo o fecha (ej. México, 11 jun)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Lista de resultados ───────────────────────── */}
      {finished.length === 0 ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p className="muted">Aún no hay partidos terminados.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p className="muted">Sin resultados para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="tableWrap panel resultsTableWrap">
            <table className="resultsTable">
              <thead>
                <tr>
                  <th>Partido</th>
                  <th className="cell-nowrap">Fecha</th>
                  <th>Resultado</th>
                  <th>Mi pronóstico</th>
                  <th style={{ textAlign: "center" }}>✓/✗</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((match) => {
                  const pred = byMatch.get(match.id);
                  return (
                    <tr key={match.id} className={pred?.isCorrect === true ? "resultRow--correct" : pred?.isCorrect === false ? "resultRow--wrong" : ""}>
                      <td>
                        <span className="resultRowPhase">{match.phase}</span>
                        <strong>{getMatchTitle(match)}</strong>
                      </td>
                      <td className="cell-nowrap muted" style={{ fontSize: "0.85rem" }}>{formatDate(toDate(match.kickoffAt))}</td>
                      <td className="cell-nowrap">
                        <ResultCell match={match} />
                      </td>
                      <td className="cell-nowrap" style={{ fontSize: "0.9rem" }}>
                        {pred ? labelPick(pred, match) : <span className="muted">—</span>}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "1.1rem" }}>
                        {pred?.isCorrect === true && <span className="pickCorrectTag">✓</span>}
                        {pred?.isCorrect === false && <span className="pickWrongTag">✗</span>}
                        {pred && pred.isCorrect === null && <span className="muted" style={{ fontSize: "0.75rem" }}>—</span>}
                        {!pred && <span className="muted" style={{ fontSize: "0.75rem" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="resultsCardList">
            {filtered.map((match) => {
              const pred = byMatch.get(match.id);
              const correct = pred?.isCorrect === true;
              const wrong = pred?.isCorrect === false;
              return (
                <div
                  key={match.id}
                  className={`resultMobileCard${correct ? " resultMobileCard--correct" : wrong ? " resultMobileCard--wrong" : ""}`}
                >
                  <div className="resultMobileCard__header">
                    <span className="resultRowPhase">{match.phase}</span>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>{formatDate(toDate(match.kickoffAt))}</span>
                  </div>
                  <div className="resultMobileCard__teams">
                    <strong>{getMatchTitle(match)}</strong>
                  </div>
                  <div className="resultMobileCard__row">
                    <div>
                      <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Resultado</span>
                      <div style={{ fontWeight: 700 }}><ResultCell match={match} /></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Mi pronóstico</span>
                      <div style={{ fontSize: "0.9rem" }}>
                        {pred ? labelPick(pred, match) : <span className="muted">sin pick</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "1.3rem", alignSelf: "center" }}>
                      {correct && <span className="pickCorrectTag">✓</span>}
                      {wrong && <span className="pickWrongTag">✗</span>}
                      {!pred && <span className="muted">—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function ResultCell({ match }: { match: Match }) {
  if (match.winnerTeam) {
    return <span>{teamFlagEmoji(match.winnerTeam)} {match.winnerTeam} avanza</span>;
  }
  if (match.homeGoals90 !== undefined && match.homeGoals90 !== null) {
    return <span style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>{match.homeGoals90} – {match.awayGoals90 ?? "?"}</span>;
  }
  return <span className="muted">—</span>;
}

function labelPick(pred: Prediction, match: Match) {
  if (pred.pickType === "ADVANCING_TEAM") return `${teamFlagEmoji(pred.pick ?? "")} ${pred.pick ?? "—"}`;
  if (pred.pick === "HOME") return `${teamFlagEmoji(match.homeTeam ?? "")} ${match.homeTeam ?? "Local"}`;
  if (pred.pick === "AWAY") return `${teamFlagEmoji(match.awayTeam ?? "")} ${match.awayTeam ?? "Visitante"}`;
  if (pred.pick === "DRAW") return "Empate";
  return pred.pick ?? "—";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "America/Mexico_City"
  }).format(date);
}
