"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { CalendarDays, FileWarning, KeyRound, ListChecks, Search, ShieldCheck, Users } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { Toast, createToastId, type ToastItem } from "@/components/Toast";
import { useAuthUser } from "@/components/useAuthUser";
import { generateWorldCupIcs } from "@/lib/calendar";
import { db } from "@/lib/firebase/client";
import { bulkUpsertManualMatches, confirmRoundOf32Resolution, createAdminInvite, deleteGroup, getProviderStatus, getTournamentConfig, getUserProfile, listAllGroups, listAllUsers, listMatches, listMembers, listPredictions, listPrizes, listScores, migrateLegacyScorePredictions, previewRoundOf32Resolution, publishFullKnockoutBracket, recalculateGroupScores, resolveKnockoutMatches, updateTournamentConfig, upsertManualResult } from "@/lib/firebase/firestore";
import { parseFixtureCsv, type FixtureCsvRow } from "@/lib/fixtureCsv";
import { formatDate } from "@/lib/format";
import { getDisplayTeam, getMatchTitle } from "@/lib/matchDisplay";
import { teamFlagEmoji } from "@/lib/teamFlags";
import { teamDisplayName } from "@/lib/teamNames";
import { generateResultsCsv } from "@/lib/resultsExport";
import { formatInTimeZone, getUserTimeZone, CDMX_TIMEZONE } from "@/lib/timezone";
import type { AuditLog, Group, Match, ProviderStatus, RoundOf32Assignment, RoundOf32Readiness, TeamStanding, TournamentConfig, UserProfile } from "@/types";

type AdminTab = "operation" | "results" | "bracket" | "groups" | "users" | "audit";

export default function PlatformAdminPage() {
  return (
    <AuthGate>
      <PlatformAdminContent />
    </AuthGate>
  );
}

function PlatformAdminContent() {
  const { user } = useAuthUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [tournament, setTournament] = useState<TournamentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("operation");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminInviteLink, setAdminInviteLink] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  function pushToast(item: Omit<ToastItem, "id">) { setToasts((prev) => [...prev, { ...item, id: createToastId() }]); }
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<FixtureCsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [userTimeZone, setUserTimeZone] = useState(CDMX_TIMEZONE);
  const [resultQuery, setResultQuery] = useState("");
  const [resultPhase, setResultPhase] = useState("");
  const [resultSegment, setResultSegment] = useState<ResultSegment>("capture");
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [standings, setStandings] = useState<{ groups: Record<string, TeamStanding[]>; bestThirds: TeamStanding[]; needsReview: boolean; reviewReasons: string[] } | null>(null);
  const [assignments, setAssignments] = useState<RoundOf32Assignment[]>([]);
  const [roundOf32Readiness, setRoundOf32Readiness] = useState<RoundOf32Readiness | null>(null);

  const calendarLoaded = matches.length >= 104;
  const finishedMatches = matches.filter((match) => match.status === "finished").length;
  const unresolvedKnockouts = matches.filter((match) => Number(match.matchNumber ?? 0) >= 73 && !match.isResolved).length;
  const resultBuckets = useMemo(() => {
    const q = resultQuery.trim().toLowerCase();
    const base = matches.filter((match) => {
      if (resultPhase && match.phase !== resultPhase) return false;
      if (!q) return true;
      return [match.matchNumber, getMatchTitle(match), match.venue, match.city, match.fifaGroup ? `grupo ${match.fifaGroup}` : ""].join(" ").toLowerCase().includes(q);
    });
    const nowMs = Date.now();
    const kickoffMs = (match: Match) => {
      const ms = toKickoffDate(match.kickoffAt).getTime();
      return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
    };
    const isClosed = (match: Match) => match.status === "finished" || match.status === "cancelled";
    const chronological = [...base].sort((a, b) => kickoffMs(a) - kickoffMs(b));
    return {
      capture: chronological.filter((match) => !isClosed(match) && kickoffMs(match) <= nowMs),
      upcoming: chronological.filter((match) => !isClosed(match) && kickoffMs(match) > nowMs),
      finished: [...chronological].reverse().filter(isClosed),
      all: chronological
    };
  }, [matches, resultQuery, resultPhase]);

  useEffect(() => setUserTimeZone(getUserTimeZone()), []);

  async function load() {
    if (!user) return;
    const nextProfile = await getUserProfile(user.uid);
    setProfile(nextProfile);
    if (nextProfile?.roleGlobal === "platform_admin") {
      const [nextGroups, nextUsers, logsSnap, nextMatches, nextProvider, nextTournament] = await Promise.all([
        listAllGroups(),
        listAllUsers(),
        getDocs(query(collection(db, "auditLogs"), limit(80))),
        listMatches(),
        getProviderStatus(),
        getTournamentConfig()
      ]);
      setGroups(nextGroups);
      setUsers(nextUsers);
      setLogs(logsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog));
      setMatches(nextMatches);
      setProviderStatus(nextProvider);
      setTournament(nextTournament);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function onCreateAdminInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetForm = event.currentTarget;
    const form = new FormData(targetForm);
    setError("");
    setMessage("");
    setAdminInviteLink("");
    setBusy("adminInvite");
    try {
      const result = await createAdminInvite(String(form.get("email") ?? ""), String(form.get("displayName") ?? ""));
      const link = `${window.location.origin}/join/${result.data.code}`;
      setAdminInviteLink(link);
      targetForm.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    } finally {
      setBusy("");
    }
  }

  async function onSaveResult(match: Match, payload: ResultPayload) {
    if (match.status === "finished" && !window.confirm(`${getMatchTitle(match)} ya tiene resultado oficial. ¿Sobrescribirlo y recalcular rankings?`)) return;
    setBusy(`result-${match.id}`);
    setError("");
    setMessage("");
    try {
      const result = await upsertManualResult({ matchId: match.id, ...payload });
      await Promise.all(groups.map((group) => recalculateGroupScores(group.id).catch(() => null)));
      const nextRoundOf32 = result.data.roundOf32 ?? null;
      setRoundOf32Readiness(nextRoundOf32);
      if (nextRoundOf32?.isReadyForConfirmation) {
        const preview = await previewRoundOf32Resolution();
        setStandings(preview.data.standings);
        setAssignments(preview.data.assignments);
        setRoundOf32Readiness(preview.data.readiness);
      }
      const bracketCopy = nextRoundOf32?.isReadyForConfirmation
        ? " Ronda de 32 lista para confirmar en Llaves."
        : result.data.knockoutResolved > 0
          ? ` ${result.data.knockoutResolved} cruce${result.data.knockoutResolved === 1 ? "" : "s"} publicado${result.data.knockoutResolved === 1 ? "" : "s"}.`
          : "";
      pushToast({
        type: "success",
        title: payload.status === "finished" ? "Resultado guardado" : "Partido actualizado",
        body: `${getMatchTitle(match)}. Rankings recalculados.${bracketCopy}`
      });
      setEditingResultId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el resultado.");
    } finally {
      setBusy("");
    }
  }

  function onPreviewCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = parseFixtureCsv(csvText);
    setCsvRows(parsed.rows);
    setCsvErrors(parsed.errors);
    if (parsed.errors.length) setError("Corrige los errores del CSV antes de importar.");
    if (parsed.rows.length) setMessage(`${parsed.rows.length} partidos listos para importar.`);
  }

  async function onImportCsv() {
    if (!csvRows.length) return;
    const warning = calendarLoaded ? "Esto reemplazará/actualizará el calendario ya cargado. Es una acción de mantenimiento." : `Vas a importar o actualizar ${csvRows.length} partidos.`;
    if (!window.confirm(`${warning} ¿Continuar?`)) return;
    setBusy("bulkMatches");
    setError("");
    setMessage("");
    try {
      const result = await bulkUpsertManualMatches({
        sourceName: "Calendario oficial manual",
        sourceUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums",
        matches: csvRows.map((row) => ({ ...row, status: "scheduled" }))
      });
      pushToast({ type: "success", title: `${result.data.imported} partidos importados`, body: "El calendario está listo para participantes." });
      setMessage(`${result.data.imported} partidos importados.`);
      setCsvRows([]);
      setCsvErrors([]);
      setShowMaintenance(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el CSV.");
    } finally {
      setBusy("");
    }
  }

  async function onCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
    setCsvRows([]);
    setCsvErrors([]);
  }

  async function onPreviewBracket() {
    setBusy("previewBracket");
    setError("");
    setMessage("");
    try {
      const result = await previewRoundOf32Resolution();
      setStandings(result.data.standings);
      setAssignments(result.data.assignments);
      setRoundOf32Readiness(result.data.readiness);
      setMessage(result.data.readiness.isReadyForConfirmation ? "Propuesta de ronda de 32 lista para confirmación." : "Propuesta generada. Revisa pendientes antes de confirmar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la propuesta de llaves.");
    } finally {
      setBusy("");
    }
  }

  async function onConfirmRoundOf32() {
    if (!window.confirm("Confirmar escribirá equipos en partidos 73-88 y quedará auditado. ¿Continuar?")) return;
    setBusy("confirmRound32");
    setError("");
    setMessage("");
    try {
      const result = await confirmRoundOf32Resolution();
      pushToast({ type: "success", title: "Ronda de 32 confirmada", body: `${result.data.updated} partidos actualizados.` });
      setMessage(`Ronda de 32 confirmada: ${result.data.updated} partidos actualizados.`);
      await load();
      await onPreviewBracket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar la ronda de 32.");
    } finally {
      setBusy("");
    }
  }

  async function onPublishFullKnockoutBracket() {
    if (!window.confirm("Esto cargará partidos 73-104 con horarios, sedes y cruces automáticos. Los partidos 73-88 quedarán abiertos para pronósticos y 89-104 se publicarán conforme avancen equipos. ¿Continuar?")) return;
    setBusy("publishFullBracket");
    setError("");
    setMessage("");
    try {
      const result = await publishFullKnockoutBracket();
      pushToast({
        type: "success",
        title: "Llave publicada",
        body: `${result.data.published} partidos abiertos y ${result.data.sourced} cruces automáticos programados.`
      });
      setMessage(`Llave cargada: ${result.data.total} partidos. Nuevos: ${result.data.created}. Actualizados: ${result.data.updated}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar la llave completa.");
    } finally {
      setBusy("");
    }
  }

  async function onResolveKnockout() {
    if (!window.confirm("Esto actualizará equipos de eliminación directa usando resultados cargados. ¿Continuar?")) return;
    setBusy("resolveKnockout");
    setError("");
    setMessage("");
    try {
      const result = await resolveKnockoutMatches();
      pushToast({ type: "success", title: "Llaves actualizadas", body: `${result.data.updated} partidos resueltos.` });
      setMessage(`Llaves actualizadas: ${result.data.updated} partidos.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron resolver las llaves.");
    } finally {
      setBusy("");
    }
  }

  async function onMigrateLegacyPredictions() {
    if (!window.confirm("Esto convertirá pronósticos antiguos de marcador a elección HOME/DRAW/AWAY sin borrar los marcadores legacy. ¿Continuar?")) return;
    setBusy("migrateLegacy");
    setError("");
    setMessage("");
    try {
      const result = await migrateLegacyScorePredictions();
      setMessage(`Migración terminada: ${result.data.migrated} pronósticos convertidos, ${result.data.skipped} sin cambios.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron migrar pronósticos legacy.");
    } finally {
      setBusy("");
    }
  }

  function onDownloadCalendar() {
    if (!matches.length) {
      setError("Carga partidos antes de descargar el calendario.");
      return;
    }
    const ics = generateWorldCupIcs(matches);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mundial-2026-la-cancha.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Calendario .ics generado. Puedes importarlo en Google Calendar.");
  }

  async function onTournamentConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("tournament");
    setError("");
    setMessage("");
    try {
      await updateTournamentConfig({
        firstKickoffAt: String(form.get("firstKickoffAt") || ""),
        registrationCutoffMinutes: Number(form.get("registrationCutoffMinutes") || 90),
        resultsMode: String(form.get("resultsMode") || "manual") as TournamentConfig["resultsMode"]
      });
      setMessage("Configuración del torneo guardada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally {
      setBusy("");
    }
  }

  async function recalculate(groupId: string) {
    if (!window.confirm("Esto recalculará scores y premios del grupo. ¿Continuar?")) return;
    setBusy(groupId);
    try {
      await recalculateGroupScores(groupId);
      setMessage("Ranking recalculado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recalcular.");
    } finally {
      setBusy("");
    }
  }

  async function onCancelGroup(group: Group) {
    if (!window.confirm(`Cancelar "${group.name}" lo ocultará como grupo activo y conservará auditoría. ¿Continuar?`)) return;
    setBusy(`cancel-${group.id}`);
    setError("");
    setMessage("");
    try {
      await deleteGroup(group.id);
      setMessage(`Grupo cancelado: ${group.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el grupo.");
    } finally {
      setBusy("");
    }
  }

  async function onDownloadResultsCsv() {
    setBusy("resultsCsv");
    setError("");
    setMessage("");
    try {
      const groupDetails = await Promise.all(groups.map(async (group) => {
        const [members, predictions, scores, prizes] = await Promise.all([
          listMembers(group.id),
          listPredictions(group.id),
          listScores(group.id),
          listPrizes(group.id)
        ]);
        return { group, members, predictions, scores, prizes: prizes as never };
      }));
      const csv = generateResultsCsv(matches, groupDetails);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "la-cancha-resultados-detalle.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("CSV de resultados generado. Puedes abrirlo en Excel, Numbers o Google Sheets.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el CSV.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <main className="container shell"><div className="panel">Verificando sesión y permisos...</div></main>;
  if (profile?.roleGlobal !== "platform_admin") return <main className="container shell"><div className="error">Acceso denegado. Esta pantalla es solo para platform_admin.</div></main>;

  return (
    <main className="container shell stack-lg">
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <div className="toolbar">
        <PageTitle title="Centro de control" subtitle={`Hola ${profile.displayName || profile.email}. Operación del Torneo 2026, resultados, llaves y auditoría.`} />
        <span className="pill"><ShieldCheck size={15} aria-hidden /> Superadmin</span>
      </div>
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <div className="grid">
        <MetricCard label="Calendario" value={calendarLoaded ? "Cargado" : `${matches.length}/104`} detail={calendarLoaded ? "Carga CSV oculta en mantenimiento" : "Importa fixtures para operar"} />
        <MetricCard label="Resultados" value={`${finishedMatches}/${matches.length || 104}`} detail="Partidos con marcador oficial" />
        <MetricCard label="Llaves pendientes" value={unresolvedKnockouts} detail="Equipos por resolver en eliminación directa" />
        <MetricCard label="Modo" value={providerStatus?.provider ?? tournament?.resultsMode ?? "manual"} detail={providerStatus?.message ?? "Manual recomendado"} />
      </div>

      <div className="tabs adminTabs" aria-label="Secciones de superadmin">
        {ADMIN_TABS.map((tab, i) => (
          "separator" in tab
            ? <span className="tabSeparator" key={i} aria-hidden />
            : <button className={activeTab === tab.id ? "tabButton active" : "tabButton"} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button">{tab.label}</button>
        ))}
      </div>

      {activeTab === "operation" ? (
        <section className="grid">
          <article className="panel stack">
            <CalendarDays size={26} aria-hidden />
            <h2>Estado operativo</h2>
            <p className="muted">{calendarLoaded ? "El calendario base ya está cargado. La operación diaria debe enfocarse en resultados y llaves." : "Aún falta cargar el calendario completo para que participantes puedan pronosticar."}</p>
            <div className="cluster">
              <button className="button secondary" onClick={onDownloadCalendar} type="button">Descargar .ics</button>
              <button className="button secondary" disabled={busy === "resultsCsv"} onClick={onDownloadResultsCsv} type="button">{busy === "resultsCsv" ? "Generando..." : "Descargar Excel CSV"}</button>
              <button className="button secondary" onClick={() => setShowMaintenance((value) => !value)} type="button">{calendarLoaded ? "Mantenimiento de calendario" : "Cargar calendario"}</button>
            </div>
          </article>
          <article className="panel stack">
            <ListChecks size={26} aria-hidden />
            <h2>Próximas acciones</h2>
            <p>1. Captura resultados de grupos solo a 90 minutos.</p>
            <p>2. Genera propuesta de ronda de 32 al terminar grupos.</p>
            <p>3. Confirma llaves y recalcula rankings.</p>
            <button className="button secondary" disabled={busy === "migrateLegacy"} onClick={onMigrateLegacyPredictions} type="button">
              {busy === "migrateLegacy" ? "Migrando..." : "Migrar pronósticos anteriores"}
            </button>
          </article>
          <TournamentConfigForm tournament={tournament} busy={busy} onSubmit={onTournamentConfig} />
          {showMaintenance || !calendarLoaded ? <CalendarMaintenance csvText={csvText} setCsvText={setCsvText} onPreviewCsv={onPreviewCsv} onCsvFile={onCsvFile} onImportCsv={onImportCsv} csvRows={csvRows} csvErrors={csvErrors} busy={busy} userTimeZone={userTimeZone} calendarLoaded={calendarLoaded} /> : null}
        </section>
      ) : null}

      {activeTab === "results" ? (
        <section className="panel stack">
          <div>
            <h2>Capturar resultados</h2>
            <p className="muted">Los partidos que ya se jugaron aparecen primero, en orden cronológico. Captura el marcador a 90 minutos y guarda: el ganador y el estado se calculan solos. En eliminación directa la tarjeta pide tiempo extra o penales únicamente si hay empate.</p>
          </div>
          <div className="tabs" aria-label="Filtrar partidos por estado de captura">
            {RESULT_SEGMENTS.map((segment) => (
              <button className={resultSegment === segment.id ? "tabButton active" : "tabButton"} key={segment.id} onClick={() => setResultSegment(segment.id)} type="button">
                {segment.label} ({resultBuckets[segment.id].length})
              </button>
            ))}
          </div>
          <div className="captureFilters">
            <div className="field searchField"><label htmlFor="matchSearch"><Search size={14} aria-hidden /> Buscar</label><input id="matchSearch" onChange={(event) => setResultQuery(event.target.value)} placeholder="Equipo, sede, grupo o #" value={resultQuery} /></div>
            <div className="field"><label htmlFor="phaseFilter">Fase</label><select id="phaseFilter" onChange={(event) => setResultPhase(event.target.value)} value={resultPhase}><option value="">Todas</option>{unique(matches.map((match) => match.phase)).map((phase) => <option key={phase}>{phase}</option>)}</select></div>
          </div>
          {resultBuckets[resultSegment].length ? (
            <div className="captureList">
              {groupMatchesByDay(resultBuckets[resultSegment]).map((day) => (
                <div className="stack" key={`${day.label}-${day.items[0].id}`}>
                  <p className="captureDay">{day.label}</p>
                  {day.items.map((match) => (
                    <CaptureCard
                      busy={busy}
                      editing={editingResultId === match.id}
                      key={match.id}
                      match={match}
                      onCancelEdit={() => setEditingResultId(null)}
                      onEdit={() => setEditingResultId(match.id)}
                      onSave={onSaveResult}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={RESULT_EMPTY_COPY[resultSegment].title} body={RESULT_EMPTY_COPY[resultSegment].body} />
          )}
        </section>
      ) : null}

      {activeTab === "bracket" ? (
        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h2>Llaves y clasificados</h2>
              <p className="muted">La app propone top 2 por grupo y ocho mejores terceros. Si hay empates no resolubles por puntos, diferencia y goles, pedirá revisión del reglamento oficial.</p>
            </div>
            <div className="cluster">
              <button className="button secondary" disabled={busy === "publishFullBracket"} onClick={onPublishFullKnockoutBracket} type="button">Publicar llave completa</button>
              <button className="button secondary" disabled={busy === "previewBracket"} onClick={onPreviewBracket} type="button">Generar propuesta</button>
              <button className="button" disabled={!assignments.length || busy === "confirmRound32" || !roundOf32Readiness?.isReadyForConfirmation} onClick={onConfirmRoundOf32} type="button">Confirmar ronda de 32</button>
              <button className="button secondary" disabled={busy === "resolveKnockout"} onClick={onResolveKnockout} type="button">Resolver 89-104</button>
            </div>
          </div>
          {roundOf32Readiness ? <RoundOf32ReadinessPanel readiness={roundOf32Readiness} /> : null}
          {standings ? <StandingsPanel standings={standings} /> : <EmptyState title="Sin propuesta generada" body="Genera una propuesta cuando terminen los partidos de fase de grupos." />}
          {assignments.length ? <AssignmentsTable assignments={assignments} /> : null}
        </section>
      ) : null}

      {activeTab === "groups" ? (
        <section className="panel tableWrap">
          <h2>Grupos comerciales</h2>
          <table>
            <thead><tr><th>Grupo</th><th className="cell-nowrap">Estado</th><th className="cell-nowrap">Ingreso</th><th className="cell-nowrap">Aportación</th><th>Acciones</th></tr></thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td className="cell-nowrap">{group.status}</td>
                  <td className="cell-nowrap">Abierto durante torneo</td>
                  <td className="cell-nowrap">{group.currency} {group.contributionAmount}</td>
                  <td>
                    <div className="cluster">
                      <button className="button secondary" disabled={busy === group.id} onClick={() => recalculate(group.id)} type="button">Recalcular</button>
                      <button className="button danger" disabled={busy === `cancel-${group.id}` || group.status === "cancelled"} onClick={() => onCancelGroup(group)} type="button">Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {activeTab === "users" ? (
        <section className="grid">
          <article className="panel stack">
            <Users size={26} aria-hidden />
            <h2>Invitar administrador de grupo</h2>
            <form className="formGrid" onSubmit={onCreateAdminInvite}>
              <div className="field"><label htmlFor="displayName">Nombre</label><input id="displayName" name="displayName" required /></div>
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
              <button className="button" disabled={busy === "adminInvite"} type="submit">{busy === "adminInvite" ? "Creando…" : "Crear invitación admin"}</button>
            </form>
            {adminInviteLink ? (
              <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "var(--surface-2, #f4f4f4)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>Link de invitación generado</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <code style={{ flex: 1, fontSize: "0.75rem", wordBreak: "break-all", background: "var(--surface-1, #fff)", padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border, #ddd)" }}>{adminInviteLink}</code>
                  <button
                    className="button secondary"
                    type="button"
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(adminInviteLink);
                      pushToast({ type: "success", title: "Link copiado", body: "El link de invitación está en tu portapapeles." });
                    }}
                  >
                    Copiar link
                  </button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-2, #666)", margin: 0 }}>Válido por 14 días · Envíalo al nuevo administrador</p>
              </div>
            ) : null}
          </article>
          <article className="panel stack">
            <h2>Usuarios</h2>
            {users.map((item) => <p key={item.uid}>{item.displayName || item.email} · <span className="muted">{item.roleGlobal}</span></p>)}
          </article>
        </section>
      ) : null}

      {activeTab === "audit" ? (
        <section className="panel stack">
          <div className="toolbar">
            <h2>Auditoría</h2>
            <span className="pill"><FileWarning size={14} aria-hidden /> Últimos {logs.length}</span>
          </div>
          <div className="tableWrap">
            <table>
              <thead><tr><th className="cell-nowrap">Acción</th><th>Entidad</th><th className="cell-nowrap">Actor</th><th className="cell-nowrap">Fecha</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="cell-nowrap">{log.action}</td>
                    <td style={{ wordBreak: "break-all", maxWidth: 220 }}>{log.entityType} · {log.entityId}</td>
                    <td className="cell-truncate" title={log.actorUid}>{log.actorUid}</td>
                    <td className="cell-nowrap">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

type AdminTabItem = { id: AdminTab; label: string } | { separator: true };

const ADMIN_TABS: AdminTabItem[] = [
  { id: "operation", label: "Operación" },
  { id: "results", label: "Resultados" },
  { id: "bracket", label: "Llaves" },
  { separator: true },
  { id: "groups", label: "Grupos" },
  { id: "users", label: "Usuarios/Admins" },
  { id: "audit", label: "Auditoría" }
];

function CalendarMaintenance(props: {
  csvText: string;
  setCsvText: (value: string) => void;
  onPreviewCsv: (event: FormEvent<HTMLFormElement>) => void;
  onCsvFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportCsv: () => void;
  csvRows: FixtureCsvRow[];
  csvErrors: string[];
  busy: string;
  userTimeZone: string;
  calendarLoaded: boolean;
}) {
  return (
    <article className="panel stack fullSpan">
      <h2>{props.calendarLoaded ? "Mantenimiento de calendario" : "Carga masiva de partidos"}</h2>
      {props.calendarLoaded ? <StatusMessage>El calendario ya está cargado. Reimporta solo si el organizador actualiza horarios o detectas un error en la fuente.</StatusMessage> : null}
      <form className="stack" onSubmit={props.onPreviewCsv}>
        <div className="field">
          <label htmlFor="fixturesFile">Subir CSV de partidos</label>
          <input id="fixturesFile" accept=".csv,text/csv" type="file" onChange={props.onCsvFile} />
        </div>
        <div className="field">
          <label htmlFor="fixturesCsv">O pegar CSV</label>
          <textarea id="fixturesCsv" value={props.csvText} onChange={(event) => props.setCsvText(event.target.value)} rows={7} placeholder="numero_partido,fase,grupo,equipo_1,equipo_2..." />
        </div>
        <div className="cluster">
          <button className="button secondary" type="submit">Previsualizar CSV</button>
          <button className="button" disabled={!props.csvRows.length || props.busy === "bulkMatches"} onClick={props.onImportCsv} type="button">
            {props.busy === "bulkMatches" ? "Importando..." : props.calendarLoaded ? "Reimportar calendario" : "Confirmar importación"}
          </button>
        </div>
      </form>
      {props.csvErrors.length ? <div className="error">{props.csvErrors.slice(0, 8).map((item) => <p key={item}>{item}</p>)}</div> : null}
      {props.csvRows.length ? (
        <div className="tableWrap">
          <table>
            <thead><tr><th>#</th><th>Partido</th><th>Sede</th><th>Hora sede</th><th>Hora CDMX</th><th>Tu hora</th></tr></thead>
            <tbody>
              {props.csvRows.slice(0, 12).map((row) => (
                <tr key={row.matchNumber}><td>{row.matchNumber}</td><td>{row.homeTeam} vs {row.awayTeam}</td><td>{row.venue}</td><td>{formatInTimeZone(row.kickoffAtIso, row.timezone)}</td><td>{formatInTimeZone(row.kickoffAtIso, CDMX_TIMEZONE)}</td><td>{formatInTimeZone(row.kickoffAtIso, props.userTimeZone)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}

function TournamentConfigForm({ tournament, busy, onSubmit }: { tournament: TournamentConfig | null; busy: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <article className="panel stack">
      <KeyRound size={26} aria-hidden />
      <h2>Configuración del torneo</h2>
      <form className="formGrid" onSubmit={onSubmit}>
        <div className="field"><label htmlFor="firstKickoffAt">Primer kickoff</label><input id="firstKickoffAt" name="firstKickoffAt" type="datetime-local" defaultValue={toDateTimeLocal(tournament?.firstKickoffAt)} required /></div>
        <div className="field"><label htmlFor="registrationCutoffMinutes">Corte legacy (min)</label><input id="registrationCutoffMinutes" name="registrationCutoffMinutes" type="number" min="1" defaultValue={tournament?.registrationCutoffMinutes ?? 90} required /></div>
        <div className="field"><label htmlFor="resultsMode">Modo resultados</label><select id="resultsMode" name="resultsMode" defaultValue={tournament?.resultsMode ?? "manual"}><option value="manual">Manual oficial</option><option value="api-football">API-Football opcional</option><option value="mock">Mock pruebas</option><option value="sportmonks">Sportmonks legado</option></select></div>
        <button className="button" disabled={busy === "tournament"} type="submit">Guardar</button>
      </form>
    </article>
  );
}

type ResultSegment = "capture" | "upcoming" | "finished" | "all";

const RESULT_SEGMENTS: Array<{ id: ResultSegment; label: string }> = [
  { id: "capture", label: "Por capturar" },
  { id: "upcoming", label: "Próximos" },
  { id: "finished", label: "Finalizados" },
  { id: "all", label: "Todos" }
];

const RESULT_EMPTY_COPY: Record<ResultSegment, { title: string; body: string }> = {
  capture: { title: "Nada por capturar", body: "Cuando un partido llegue a su hora de inicio aparecerá aquí, listo para registrar el marcador." },
  upcoming: { title: "Sin partidos próximos", body: "Ajusta la búsqueda o revisa la pestaña Todos." },
  finished: { title: "Aún no hay resultados guardados", body: "Los partidos con marcador oficial aparecerán aquí." },
  all: { title: "Sin partidos", body: "Carga el calendario en Operación o ajusta la búsqueda." }
};

type ResultPayload = {
  status: Match["status"];
  homeGoals90: number | null;
  awayGoals90: number | null;
  homeGoalsExtraTime: number | null;
  awayGoalsExtraTime: number | null;
  homePenaltyGoals: number | null;
  awayPenaltyGoals: number | null;
  winnerTeam: string;
};

function CaptureCard({ match, busy, editing, onEdit, onCancelEdit, onSave }: {
  match: Match;
  busy: string;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (match: Match, payload: ResultPayload) => void;
}) {
  const isKnockout = !isGroupStage(match);
  const unresolved = isKnockout && !match.isResolved;
  const closed = match.status === "finished" || match.status === "cancelled";
  const kickedOff = toKickoffDate(match.kickoffAt).getTime() <= Date.now();
  return (
    <article className="panel stack captureCard">
      <div className="captureMeta">
        <div className="captureMetaInfo">
          <span className="pill">#{match.matchNumber ?? "?"} · {match.phase}</span>
          <span className="muted">{cdmxTimeLabel(match.kickoffAt)} · {match.venue ?? "Sede por confirmar"}</span>
        </div>
        <MatchStatusPill kickedOff={kickedOff} status={match.status} />
      </div>
      {unresolved ? (
        <>
          <p className="captureSummaryScore">{getDisplayTeam(match, "home")} <span className="captureDash">vs</span> {getDisplayTeam(match, "away")}</p>
          <p className="fineprint">Equipos por definir. Resuélvelos en la pestaña Llaves antes de capturar el resultado.</p>
        </>
      ) : closed && !editing ? (
        <FinishedSummary match={match} onEdit={onEdit} />
      ) : (
        <CaptureForm busy={busy} isEditing={editing} match={match} onCancelEdit={onCancelEdit} onSave={onSave} />
      )}
    </article>
  );
}

function MatchStatusPill({ status, kickedOff }: { status: Match["status"]; kickedOff: boolean }) {
  if (status === "finished") return <span className="pill successPill">Finalizado</span>;
  if (status === "live") return <span className="pill">En vivo</span>;
  if (status === "cancelled") return <span className="pill">Cancelado</span>;
  return <span className="pill">{kickedOff ? "Por capturar" : "Programado"}</span>;
}

function FinishedSummary({ match, onEdit }: { match: Match; onEdit: () => void }) {
  const displayHome = match.homeGoalsExtraTime ?? match.homeGoals90;
  const displayAway = match.awayGoalsExtraTime ?? match.awayGoals90;
  const hasScore = typeof displayHome === "number" && typeof displayAway === "number";
  const hasPens = typeof match.homePenaltyGoals === "number" && typeof match.awayPenaltyGoals === "number";
  const hasExtra = typeof match.homeGoalsExtraTime === "number" || typeof match.awayGoalsExtraTime === "number";
  return (
    <>
      {hasScore ? (
        <div className="captureSummaryScore">
          <span className="captureFlag">{teamFlagEmoji(match.resolvedHomeTeam || match.homeTeam)}</span>
          <span>{getDisplayTeam(match, "home")}</span>
          <span>{displayHome} - {displayAway}</span>
          <span>{getDisplayTeam(match, "away")}</span>
          <span className="captureFlag">{teamFlagEmoji(match.resolvedAwayTeam || match.awayTeam)}</span>
        </div>
      ) : (
        <p className="muted">Sin marcador registrado.</p>
      )}
      {hasPens ? (
        <p className="fineprint">Penales: {match.homePenaltyGoals} - {match.awayPenaltyGoals}{match.winnerTeam ? ` · Ganó ${teamDisplayName(match.winnerTeam)}` : ""}{hasExtra ? " · Con tiempo extra" : ""}</p>
      ) : hasExtra ? (
        <p className="fineprint">Definido en tiempo extra.</p>
      ) : null}
      <div className="cluster">
        <button className="button secondary" onClick={onEdit} type="button">Editar resultado</button>
      </div>
    </>
  );
}

function CaptureForm({ match, busy, isEditing, onCancelEdit, onSave }: {
  match: Match;
  busy: string;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSave: (match: Match, payload: ResultPayload) => void;
}) {
  const isKnockout = !isGroupStage(match);
  const homeName = getDisplayTeam(match, "home");
  const awayName = getDisplayTeam(match, "away");
  const homeRaw = match.resolvedHomeTeam || match.homeTeam;
  const awayRaw = match.resolvedAwayTeam || match.awayTeam;
  const [home90, setHome90] = useState(scoreText(match.homeGoals90));
  const [away90, setAway90] = useState(scoreText(match.awayGoals90));
  const [homeExtra, setHomeExtra] = useState(scoreText(match.homeGoalsExtraTime));
  const [awayExtra, setAwayExtra] = useState(scoreText(match.awayGoalsExtraTime));
  const [homePens, setHomePens] = useState(scoreText(match.homePenaltyGoals));
  const [awayPens, setAwayPens] = useState(scoreText(match.awayPenaltyGoals));
  const [winnerTeam, setWinnerTeam] = useState(match.winnerTeam ?? "");
  const [saveStatus, setSaveStatus] = useState<Match["status"]>("finished");

  const h90 = parseScore(home90);
  const a90 = parseScore(away90);
  const tied90 = h90 !== null && a90 !== null && h90 === a90;
  const showDefinition = isKnockout && tied90;
  const hx = showDefinition ? parseScore(homeExtra) : null;
  const ax = showDefinition ? parseScore(awayExtra) : null;
  const hp = showDefinition ? parseScore(homePens) : null;
  const ap = showDefinition ? parseScore(awayPens) : null;
  const stillTied = (hx ?? h90) !== null && (hx ?? h90) === (ax ?? a90);
  const penaltiesDecided = hp !== null && ap !== null && hp !== ap;
  const needsWinner = showDefinition && saveStatus === "finished" && stillTied && !penaltiesDecided && !winnerTeam;
  const scoreMissing = h90 === null || a90 === null;
  const saving = busy === `result-${match.id}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scoreMissing || needsWinner) return;
    onSave(match, {
      status: saveStatus,
      homeGoals90: h90,
      awayGoals90: a90,
      homeGoalsExtraTime: hx,
      awayGoalsExtraTime: ax,
      homePenaltyGoals: hp,
      awayPenaltyGoals: ap,
      winnerTeam: showDefinition ? winnerTeam : ""
    });
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="captureScoreRow">
        <div className="captureTeam">
          <span className="captureFlag">{teamFlagEmoji(homeRaw)}</span>
          <strong>{homeName}</strong>
        </div>
        <div className="captureScoreBox">
          <input aria-label={`Goles de ${homeName} a 90 minutos`} inputMode="numeric" min={0} onChange={(event) => setHome90(event.target.value)} type="number" value={home90} />
          <span className="captureDash">-</span>
          <input aria-label={`Goles de ${awayName} a 90 minutos`} inputMode="numeric" min={0} onChange={(event) => setAway90(event.target.value)} type="number" value={away90} />
        </div>
        <div className="captureTeam away">
          <span className="captureFlag">{teamFlagEmoji(awayRaw)}</span>
          <strong>{awayName}</strong>
        </div>
      </div>
      {showDefinition ? (
        <div className="captureDefinition">
          <p className="fineprint"><strong>Empate a 90 minutos.</strong> Si hubo tiempo extra captura el marcador global a 120 minutos; si hubo penales, captura la tanda completa.</p>
          <div className="captureDefGrid">
            <div className="field"><label htmlFor={`hx-${match.id}`}>120 min {homeName}</label><input id={`hx-${match.id}`} inputMode="numeric" min={0} onChange={(event) => setHomeExtra(event.target.value)} placeholder="Si aplica" type="number" value={homeExtra} /></div>
            <div className="field"><label htmlFor={`ax-${match.id}`}>120 min {awayName}</label><input id={`ax-${match.id}`} inputMode="numeric" min={0} onChange={(event) => setAwayExtra(event.target.value)} placeholder="Si aplica" type="number" value={awayExtra} /></div>
            <div className="field"><label htmlFor={`hp-${match.id}`}>Penales {homeName}</label><input id={`hp-${match.id}`} inputMode="numeric" min={0} onChange={(event) => setHomePens(event.target.value)} placeholder="Si aplica" type="number" value={homePens} /></div>
            <div className="field"><label htmlFor={`ap-${match.id}`}>Penales {awayName}</label><input id={`ap-${match.id}`} inputMode="numeric" min={0} onChange={(event) => setAwayPens(event.target.value)} placeholder="Si aplica" type="number" value={awayPens} /></div>
          </div>
          {penaltiesDecided ? (
            <p className="fineprint">Gana {(hp as number) > (ap as number) ? homeName : awayName} por penales.</p>
          ) : stillTied ? (
            <div className="field">
              <label htmlFor={`winner-${match.id}`}>Ganador oficial (si no capturas penales)</label>
              <select id={`winner-${match.id}`} onChange={(event) => setWinnerTeam(event.target.value)} value={winnerTeam}>
                <option value="">Elegir equipo</option>
                <option value={homeRaw}>{homeName}</option>
                <option value={awayRaw}>{awayName}</option>
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
      <details className="captureAdvanced">
        <summary>Más opciones</summary>
        <div className="field">
          <label htmlFor={`saveStatus-${match.id}`}>Estado al guardar</label>
          <select id={`saveStatus-${match.id}`} onChange={(event) => setSaveStatus(event.target.value as Match["status"])} value={saveStatus}>
            <option value="finished">Finalizado (resultado oficial)</option>
            <option value="live">En vivo (marcador parcial)</option>
            <option value="scheduled">Pendiente</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </details>
      <div className="captureFooter">
        {needsWinner ? <p className="fineprint">Sigue empatado: captura penales o elige al ganador oficial.</p> : <span aria-hidden />}
        <div className="cluster">
          {isEditing ? <button className="button secondary" onClick={onCancelEdit} type="button">Cancelar</button> : null}
          <button className="button" disabled={saving || scoreMissing || needsWinner} type="submit">{saving ? "Guardando..." : saveStatus === "finished" ? "Guardar resultado oficial" : "Guardar cambios"}</button>
        </div>
      </div>
    </form>
  );
}

function RoundOf32ReadinessPanel({ readiness }: { readiness: RoundOf32Readiness }) {
  if (readiness.isReadyForConfirmation) {
    return <StatusMessage type="success">La fase de grupos está completa. Revisa la propuesta y confirma la Ronda de 32 para abrir pronósticos.</StatusMessage>;
  }
  if (readiness.requiresManualReview) {
    return (
      <StatusMessage type="error">
        La propuesta requiere revisión manual: {readiness.reviewReasons.slice(0, 3).join(" · ") || "hay cruces sin resolver."}
      </StatusMessage>
    );
  }
  const pending = readiness.pendingGroupMatches.slice(0, 12).join(", ");
  return (
    <StatusMessage>
      Faltan resultados de fase de grupos: {readiness.groupMatchesFinished}/{Math.max(72, readiness.groupMatchesTotal)} capturados{pending ? `. Pendientes: ${pending}${readiness.pendingGroupMatches.length > 12 ? "..." : ""}` : "."}
    </StatusMessage>
  );
}

function StandingsPanel({ standings }: { standings: { groups: Record<string, TeamStanding[]>; bestThirds: TeamStanding[]; needsReview: boolean; reviewReasons: string[] } }) {
  return (
    <div className="stack">
      {standings.needsReview ? <StatusMessage type="error">{standings.reviewReasons.slice(0, 3).join(" · ")}</StatusMessage> : <StatusMessage type="success">No hay empates críticos en puntos, diferencia y goles anotados.</StatusMessage>}
      <div className="grid">
        {Object.entries(standings.groups).map(([group, rows]) => (
          <article className="card stack" key={group}>
            <h3>Grupo {group}</h3>
            {rows.map((row) => <p key={row.team}>{row.position}. {row.team} · {row.points} pts · DG {row.goalDifference} · GF {row.goalsFor}{row.needsReview ? " · revisar" : ""}</p>)}
          </article>
        ))}
      </div>
      <article className="panel stack">
        <h3>Ocho mejores terceros propuestos</h3>
        {standings.bestThirds.map((row) => <p key={`${row.group}-${row.team}`}>{row.position}. {row.team} Grupo {row.group} · {row.points} pts · DG {row.goalDifference} · GF {row.goalsFor}</p>)}
      </article>
    </div>
  );
}

function AssignmentsTable({ assignments }: { assignments: RoundOf32Assignment[] }) {
  const hasPending = assignments.some((item) => !item.homeTeam || !item.awayTeam);
  const hasReview = assignments.some((item) => item.needsReview);
  return (
    <div className="stack">
      <div className="tableWrap">
        <table>
          <thead><tr><th>Partido</th><th>Seed local</th><th>Equipo local</th><th>Seed visitante</th><th>Equipo visitante</th><th>Estado</th></tr></thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.matchId}>
                <td>#{item.matchNumber}</td>
                <td>{item.homeSeedLabel}</td>
                <td>{item.homeTeam ?? "Pendiente"}</td>
                <td>{item.awaySeedLabel}</td>
                <td>{item.awayTeam ?? "Pendiente"}</td>
                <td>
                  {item.needsReview
                    ? <span className="pill" style={{ color: "var(--warn)", borderColor: "var(--warn-border)" }}>Requiere revisión manual</span>
                    : <span className="pill successPill">Confirmado</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(hasPending || hasReview) ? (
        <p className="muted">Los cruces con &ldquo;Pendiente&rdquo; se resuelven cargando el resultado del partido anterior en la pestaña Resultados, que actualiza los equipos clasificados automáticamente.</p>
      ) : null}
    </div>
  );
}

function parseScore(value: string) {
  if (value.trim() === "") return null;
  const next = Number(value);
  return Number.isInteger(next) && next >= 0 ? next : null;
}

function scoreText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function toKickoffDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(String(value ?? ""));
}

function cdmxDayLabel(value: unknown) {
  const date = toKickoffDate(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: CDMX_TIMEZONE, weekday: "long" }).format(date);
}

function cdmxTimeLabel(value: unknown) {
  const date = toKickoffDate(value);
  if (Number.isNaN(date.getTime())) return "Hora por confirmar";
  return `${new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: CDMX_TIMEZONE }).format(date)} CDMX`;
}

function groupMatchesByDay(items: Match[]) {
  const days: Array<{ label: string; items: Match[] }> = [];
  for (const match of items) {
    const label = cdmxDayLabel(match.kickoffAt);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(match);
    else days.push({ label, items: [match] });
  }
  return days;
}

function unique(items: string[]) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function isGroupStage(match: Match) {
  return Boolean(match.fifaGroup) || Number(match.matchNumber ?? 0) <= 72;
}

function toDateTimeLocal(value: unknown) {
  const date = value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
    ? value.toDate() as Date
    : value instanceof Date
      ? value
      : new Date("2026-06-11T19:00:00-06:00");
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
