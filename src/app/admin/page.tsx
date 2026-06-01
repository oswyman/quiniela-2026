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
import { bulkUpsertManualMatches, confirmRoundOf32Resolution, createAdminInvite, deleteGroup, getProviderStatus, getTournamentConfig, getUserProfile, listAllGroups, listAllUsers, listMatches, listMembers, listPredictions, listPrizes, listScores, migrateLegacyScorePredictions, previewRoundOf32Resolution, recalculateGroupScores, resolveKnockoutMatches, updateTournamentConfig, upsertManualResult } from "@/lib/firebase/firestore";
import { parseFixtureCsv, type FixtureCsvRow } from "@/lib/fixtureCsv";
import { formatDate } from "@/lib/format";
import { getMatchTitle } from "@/lib/matchDisplay";
import { generateResultsCsv } from "@/lib/resultsExport";
import { formatInTimeZone, getUserTimeZone, CDMX_TIMEZONE } from "@/lib/timezone";
import type { AuditLog, Group, Match, ProviderStatus, RoundOf32Assignment, TeamStanding, TournamentConfig, UserProfile } from "@/types";

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
  const [filters, setFilters] = useState({ query: "", phase: "", group: "", status: "" });
  const [standings, setStandings] = useState<{ groups: Record<string, TeamStanding[]>; bestThirds: TeamStanding[]; needsReview: boolean; reviewReasons: string[] } | null>(null);
  const [assignments, setAssignments] = useState<RoundOf32Assignment[]>([]);

  const calendarLoaded = matches.length >= 104;
  const finishedMatches = matches.filter((match) => match.status === "finished").length;
  const unresolvedKnockouts = matches.filter((match) => Number(match.matchNumber ?? 0) >= 73 && !match.isResolved).length;
  const filteredMatches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return matches.filter((match) => {
      if (filters.phase && match.phase !== filters.phase) return false;
      if (filters.group && (match.fifaGroup ?? "") !== filters.group) return false;
      if (filters.status && match.status !== filters.status) return false;
      if (!q) return true;
      return [match.matchNumber, getMatchTitle(match), match.venue, match.city].join(" ").toLowerCase().includes(q);
    });
  }, [filters, matches]);

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
    const form = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setBusy("adminInvite");
    try {
      const result = await createAdminInvite(String(form.get("email") ?? ""), String(form.get("displayName") ?? ""));
      setMessage(`Invitación de admin creada: ${window.location.origin}/join/${result.data.code}`);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    } finally {
      setBusy("");
    }
  }

  async function onResult(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const confirmed = window.confirm(`Vas a guardar resultado oficial para ${getMatchTitle(match)} y recalcular rankings. ¿Continuar?`);
    if (!confirmed) return;
    setBusy(`result-${match.id}`);
    setError("");
    setMessage("");
    try {
      await upsertManualResult({
        matchId: match.id,
        status: String(form.get("status") || "finished") as Match["status"],
        homeGoals90: optionalNumber(form.get("homeGoals90")),
        awayGoals90: optionalNumber(form.get("awayGoals90")),
        homeGoalsExtraTime: optionalNumber(form.get("homeGoalsExtraTime")),
        awayGoalsExtraTime: optionalNumber(form.get("awayGoalsExtraTime")),
        homePenaltyGoals: optionalNumber(form.get("homePenaltyGoals")),
        awayPenaltyGoals: optionalNumber(form.get("awayPenaltyGoals")),
        winnerTeam: String(form.get("winnerTeam") || "")
      });
      await Promise.all(groups.map((group) => recalculateGroupScores(group.id).catch(() => null)));
      pushToast({ type: "success", title: "Resultado guardado", body: `${getMatchTitle(match)}. Rankings recalculados.` });
      setMessage("Resultado guardado, llaves actualizadas y rankings recalculados.");
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
        sourceName: "FIFA schedule manual",
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
      setMessage(result.data.standings.needsReview ? "Propuesta generada con criterios que requieren revisión FIFA adicional." : "Propuesta de ronda de 32 generada.");
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
        <PageTitle title="Centro de control" subtitle={`Hola ${profile.displayName || profile.email}. Operación del Mundial 2026, resultados, llaves y auditoría.`} />
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
          <div className="toolbar">
            <div>
              <h2>Capturar resultados</h2>
              <p className="muted">En fase de grupos solo capturas 90 minutos. En eliminación directa puedes capturar extra, penales y ganador oficial.</p>
            </div>
            <MatchFilters matches={matches} filters={filters} setFilters={setFilters} />
          </div>
          <ResultSections matches={filteredMatches} busy={busy} onResult={onResult} />
        </section>
      ) : null}

      {activeTab === "bracket" ? (
        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h2>Llaves y clasificados</h2>
              <p className="muted">La app propone top 2 por grupo y ocho mejores terceros. Si hay empates no resolubles por puntos, diferencia y goles, pedirá revisión FIFA adicional.</p>
            </div>
            <div className="cluster">
              <button className="button secondary" disabled={busy === "previewBracket"} onClick={onPreviewBracket} type="button">Generar propuesta</button>
              <button className="button" disabled={!assignments.length || busy === "confirmRound32" || Boolean(standings?.needsReview)} onClick={onConfirmRoundOf32} type="button">Confirmar ronda de 32</button>
              <button className="button secondary" disabled={busy === "resolveKnockout"} onClick={onResolveKnockout} type="button">Resolver 89-104</button>
            </div>
          </div>
          {standings ? <StandingsPanel standings={standings} /> : <EmptyState title="Sin propuesta generada" body="Genera una propuesta cuando terminen los partidos de fase de grupos." />}
          {assignments.length ? <AssignmentsTable assignments={assignments} /> : null}
        </section>
      ) : null}

      {activeTab === "groups" ? (
        <section className="panel tableWrap">
          <h2>Grupos comerciales</h2>
          <table>
            <thead><tr><th>Grupo</th><th className="cell-nowrap">Estado</th><th className="cell-nowrap">Cierre registro</th><th className="cell-nowrap">Aportación</th><th>Acciones</th></tr></thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td className="cell-nowrap">{group.status}</td>
                  <td className="cell-nowrap">{formatDate(group.registrationDeadlineAt)}</td>
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
              <button className="button" disabled={busy === "adminInvite"} type="submit">Crear invitación admin</button>
            </form>
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
      {props.calendarLoaded ? <StatusMessage>El calendario ya está cargado. Reimporta solo si FIFA actualiza horarios o detectas un error en la fuente.</StatusMessage> : null}
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
        <div className="field"><label htmlFor="registrationCutoffMinutes">Cierre de registro (min)</label><input id="registrationCutoffMinutes" name="registrationCutoffMinutes" type="number" min="1" defaultValue={tournament?.registrationCutoffMinutes ?? 90} required /></div>
        <div className="field"><label htmlFor="resultsMode">Modo resultados</label><select id="resultsMode" name="resultsMode" defaultValue={tournament?.resultsMode ?? "manual"}><option value="manual">Manual oficial</option><option value="api-football">API-Football opcional</option><option value="mock">Mock pruebas</option><option value="sportmonks">Sportmonks legado</option></select></div>
        <button className="button" disabled={busy === "tournament"} type="submit">Guardar</button>
      </form>
    </article>
  );
}

function MatchFilters({ matches, filters, setFilters }: { matches: Match[]; filters: { query: string; phase: string; group: string; status: string }; setFilters: (filters: { query: string; phase: string; group: string; status: string }) => void }) {
  const phases = unique(matches.map((match) => match.phase));
  const groups = unique(matches.map((match) => match.fifaGroup ?? "").filter(Boolean));
  return (
    <div className="filterBar">
      <div className="field searchField"><label htmlFor="matchSearch"><Search size={14} aria-hidden /> Buscar</label><input id="matchSearch" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Equipo, sede o #" /></div>
      <div className="field"><label htmlFor="phaseFilter">Fase</label><select id="phaseFilter" value={filters.phase} onChange={(event) => setFilters({ ...filters, phase: event.target.value })}><option value="">Todas</option>{phases.map((phase) => <option key={phase}>{phase}</option>)}</select></div>
      <div className="field"><label htmlFor="groupFilter">Grupo</label><select id="groupFilter" value={filters.group} onChange={(event) => setFilters({ ...filters, group: event.target.value })}><option value="">Todos</option>{groups.map((group) => <option key={group}>{group}</option>)}</select></div>
      <div className="field"><label htmlFor="statusFilter">Estado</label><select id="statusFilter" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option><option value="scheduled">Pendiente</option><option value="live">En vivo</option><option value="finished">Finalizado</option><option value="cancelled">Cancelado</option></select></div>
    </div>
  );
}

function ResultSections({ matches, busy, onResult }: { matches: Match[]; busy: string; onResult: (event: FormEvent<HTMLFormElement>, match: Match) => void }) {
  const groupMatches = matches.filter(isGroupStage);
  const knockoutMatches = matches.filter((match) => !isGroupStage(match));
  return (
    <div className="stack-lg">
      <section className="stack">
        <div>
          <h3>Fase de grupos</h3>
          <p className="muted">Solo marcador a 90 minutos. No hay tiempos extra ni penales.</p>
        </div>
        <div className="resultGrid">
          {groupMatches.map((match) => <ResultCard key={match.id} match={match} busy={busy} onResult={onResult} />)}
        </div>
      </section>
      <section className="stack">
        <div>
          <h3>Eliminación directa</h3>
          <p className="muted">Captura extra, penales o ganador oficial cuando sea necesario.</p>
        </div>
        <div className="resultGrid">
          {knockoutMatches.map((match) => <ResultCard key={match.id} match={match} busy={busy} onResult={onResult} />)}
        </div>
      </section>
    </div>
  );
}

function ResultCard({ match, busy, onResult }: { match: Match; busy: string; onResult: (event: FormEvent<HTMLFormElement>, match: Match) => void }) {
  const isKnockout = !isGroupStage(match);
  return (
    <form className="panel stack resultCard" onSubmit={(event) => onResult(event, match)}>
      <div className="toolbar">
        <div><span className="pill">#{match.matchNumber ?? "?"} · {match.phase}</span><h3>{getMatchTitle(match)}</h3><p className="muted">{match.venue ?? "Sede por confirmar"} · {match.status}</p></div>
        {match.status === "finished" ? <span className="pill successPill">Resultado guardado</span> : <span className="pill">Pendiente</span>}
      </div>
      <div className="scoreInputs">
        <div className="field"><label>90 min local</label><input name="homeGoals90" type="number" min="0" defaultValue={match.homeGoals90 ?? ""} required /></div>
        <div className="field"><label>90 min visitante</label><input name="awayGoals90" type="number" min="0" defaultValue={match.awayGoals90 ?? ""} required /></div>
        {isKnockout ? (
          <>
            <div className="field"><label>Extra local</label><input name="homeGoalsExtraTime" type="number" min="0" defaultValue={match.homeGoalsExtraTime ?? ""} placeholder="Si aplica" /></div>
            <div className="field"><label>Extra visitante</label><input name="awayGoalsExtraTime" type="number" min="0" defaultValue={match.awayGoalsExtraTime ?? ""} placeholder="Si aplica" /></div>
            <div className="field"><label>Penales local</label><input name="homePenaltyGoals" type="number" min="0" defaultValue={match.homePenaltyGoals ?? ""} placeholder="Si aplica" /></div>
            <div className="field"><label>Penales visitante</label><input name="awayPenaltyGoals" type="number" min="0" defaultValue={match.awayPenaltyGoals ?? ""} placeholder="Si aplica" /></div>
          </>
        ) : null}
      </div>
      <div className={isKnockout ? "formGrid" : "formGrid compactResultGrid"}>
        {isKnockout ? <div className="field"><label>Ganador oficial</label><select name="winnerTeam" defaultValue={match.winnerTeam ?? ""}><option value="">Calcular si no hay empate</option><option value={match.resolvedHomeTeam || match.homeTeam}>{match.resolvedHomeTeam || match.homeTeam}</option><option value={match.resolvedAwayTeam || match.awayTeam}>{match.resolvedAwayTeam || match.awayTeam}</option></select></div> : <input name="winnerTeam" type="hidden" value="" />}
        <div className="field"><label>Estado</label><select name="status" defaultValue={match.status}><option value="scheduled">Pendiente</option><option value="live">En vivo</option><option value="finished">Finalizado</option><option value="cancelled">Cancelado</option></select></div>
      </div>
      {isKnockout ? <p className="fineprint">Eliminación directa: si el marcador queda empatado, captura penales o ganador oficial.</p> : <p className="fineprint">Grupo: la app calcula local, empate o visitante con el marcador a 90 minutos.</p>}
      <button className="button" disabled={busy === `result-${match.id}`} type="submit">{busy === `result-${match.id}` ? "Guardando..." : "Guardar resultado oficial"}</button>
    </form>
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
  return (
    <div className="tableWrap">
      <table>
        <thead><tr><th>Partido</th><th>Seed local</th><th>Equipo local</th><th>Seed visitante</th><th>Equipo visitante</th><th>Estado</th></tr></thead>
        <tbody>
          {assignments.map((item) => <tr key={item.matchId}><td>#{item.matchNumber}</td><td>{item.homeSeedLabel}</td><td>{item.homeTeam ?? "Pendiente"}</td><td>{item.awaySeedLabel}</td><td>{item.awayTeam ?? "Pendiente"}</td><td>{item.needsReview ? "Revisión" : "Listo"}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  if (!text) return null;
  const next = Number(text);
  return Number.isFinite(next) ? next : null;
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
