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
import { inferPickType } from "@/lib/scoring";
import { teamDisplayName } from "@/lib/teamNames";
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

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "live"),
    [matches]
  );

  const finished = useMemo(
    () => matches.filter((m) => m.status === "finished").sort((a, b) => toDate(b.kickoffAt).getTime() - toDate(a.kickoffAt).getTime()),
    [matches]
  );

  // Para el buscador solo aplica sobre terminados; live siempre arriba
  const filteredFinished = useMemo(() => {
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
    return { total: finished.length, live: liveMatches.length, withPick: withPick.length, correct };
  }, [finished, liveMatches, byMatch]);

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
          subtitle={[
            stats.live > 0 ? `${stats.live} en vivo` : "",
            `${stats.total} terminado${stats.total !== 1 ? "s" : ""}`,
          ].filter(Boolean).join(" · ")}
        />
        <GroupNav groupId={params.groupId} liveCount={liveMatches.length} />
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
          placeholder="Buscar por equipo o fecha (ej. México, 11 jun)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Lista de resultados ───────────────────────── */}
      {liveMatches.length === 0 && finished.length === 0 ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p className="muted">Aún no hay partidos en curso ni terminados.</p>
        </div>
      ) : filteredFinished.length === 0 && liveMatches.length === 0 && search ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p className="muted">Sin resultados para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <>
          {/* ── En vivo ──────────────────────────────── */}
          {liveMatches.length > 0 ? (
            <section className="stack" style={{ gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="liveBadge"><span className="liveDot" aria-hidden />EN VIVO</span>
              </h2>
              <div className="resultsCardList">
                {liveMatches.map((match) => {
                  const pred = byMatch.get(match.id);
                  return (
                    <div key={match.id} className="resultMobileCard resultMobileCard--live">
                      <div className="resultMobileCard__header">
                        <span className="resultRowPhase">{match.phase}</span>
                        <span className="liveBadge" style={{ fontSize: "0.7rem" }}><span className="liveDot" />EN VIVO</span>
                      </div>
                      <div className="resultMobileCard__teams"><strong>{getMatchTitle(match)}</strong></div>
                      <div className="resultMobileCard__row">
                        <div>
                          <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Marcador</span>
                          <div style={{ fontWeight: 700 }}><ResultCell match={match} live /></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Mi pronóstico</span>
                          <div style={{ fontSize: "0.9rem" }}>{pred ? labelPick(pred, match) : <span className="muted">sin pick</span>}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop live table */}
              <div className="tableWrap panel resultsTableWrap">
                <table className="resultsTable">
                  <thead><tr><th>Partido</th><th>Estado</th><th>Marcador</th><th>Mi pronóstico</th></tr></thead>
                  <tbody>
                    {liveMatches.map((match) => {
                      const pred = byMatch.get(match.id);
                      return (
                        <tr key={match.id} className="resultRow--live">
                          <td><span className="resultRowPhase">{match.phase}</span><strong>{getMatchTitle(match)}</strong></td>
                          <td><span className="liveBadge"><span className="liveDot" />EN VIVO</span></td>
                          <td><ResultCell match={match} live /></td>
                          <td>{pred ? labelPick(pred, match) : <span className="muted">-</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* ── Terminados ────────────────────────────── */}
          {filteredFinished.length > 0 ? (
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
                    {filteredFinished.map((match) => {
                      const pred = byMatch.get(match.id);
                      return (
                        <tr key={match.id} className={pred?.isCorrect === true ? "resultRow--correct" : pred?.isCorrect === false ? "resultRow--wrong" : ""}>
                          <td>
                            <span className="resultRowPhase">{match.phase}</span>
                            <strong>{getMatchTitle(match)}</strong>
                          </td>
                          <td className="cell-nowrap muted" style={{ fontSize: "0.85rem" }}>{formatDate(toDate(match.kickoffAt))}</td>
                          <td className="cell-nowrap"><ResultCell match={match} /></td>
                          <td className="cell-nowrap" style={{ fontSize: "0.9rem" }}>
                            {pred ? labelPick(pred, match) : <span className="muted">-</span>}
                          </td>
                          <td style={{ textAlign: "center", fontSize: "1.1rem" }}>
                            {pred?.isCorrect === true && <span className="pickCorrectTag">✓</span>}
                            {pred?.isCorrect === false && <span className="pickWrongTag">✗</span>}
                            {(!pred || pred.isCorrect === null || pred.isCorrect === undefined) && <span className="muted" style={{ fontSize: "0.75rem" }}>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="resultsCardList">
                {filteredFinished.map((match) => {
                  const pred = byMatch.get(match.id);
                  const correct = pred?.isCorrect === true;
                  const wrong = pred?.isCorrect === false;
                  return (
                    <div key={match.id} className={`resultMobileCard${correct ? " resultMobileCard--correct" : wrong ? " resultMobileCard--wrong" : ""}`}>
                      <div className="resultMobileCard__header">
                        <span className="resultRowPhase">{match.phase}</span>
                        <span className="muted" style={{ fontSize: "0.75rem" }}>{formatDate(toDate(match.kickoffAt))}</span>
                      </div>
                      <div className="resultMobileCard__teams"><strong>{getMatchTitle(match)}</strong></div>
                      <div className="resultMobileCard__row">
                        <div>
                          <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Resultado</span>
                          <div style={{ fontWeight: 700 }}><ResultCell match={match} /></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>Mi pronóstico</span>
                          <div style={{ fontSize: "0.9rem" }}>{pred ? labelPick(pred, match) : <span className="muted">sin pick</span>}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: "1.3rem", alignSelf: "center" }}>
                          {correct && <span className="pickCorrectTag">✓</span>}
                          {wrong && <span className="pickWrongTag">✗</span>}
                          {!pred && <span className="muted">-</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}

function ResultCell({ match, live }: { match: Match; live?: boolean }) {
  if (!live && match.winnerTeam && inferPickType(match) === "ADVANCING_TEAM") {
    return <span>{teamFlagEmoji(match.winnerTeam)} {teamDisplayName(match.winnerTeam)} avanza</span>;
  }
  if (match.homeGoals90 !== undefined && match.homeGoals90 !== null) {
    return (
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
        {match.homeGoals90} - {match.awayGoals90 ?? "?"}
        {live ? <span className="muted" style={{ fontFamily: "inherit", fontSize: "0.8em", marginLeft: 4 }}>(en curso)</span> : null}
      </span>
    );
  }
  return <span className="muted">{live ? "0 - 0" : "-"}</span>;
}

function labelPick(pred: Prediction, match: Match) {
  if (pred.pickType === "ADVANCING_TEAM") return `${teamFlagEmoji(pred.pick ?? "")} ${pred.pick ? teamDisplayName(pred.pick) : "-"}`;
  if (pred.pick === "HOME") return `${teamFlagEmoji(match.homeTeam ?? "")} ${match.homeTeam ? teamDisplayName(match.homeTeam) : "Local"}`;
  if (pred.pick === "AWAY") return `${teamFlagEmoji(match.awayTeam ?? "")} ${match.awayTeam ? teamDisplayName(match.awayTeam) : "Visitante"}`;
  if (pred.pick === "DRAW") return "Empate";
  return pred.pick ?? "-";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "America/Mexico_City"
  }).format(date);
}
