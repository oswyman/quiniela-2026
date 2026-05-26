"use client";

import { FormEvent, useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { AuthGate } from "@/components/AuthGate";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { db } from "@/lib/firebase/client";
import { createAdminInvite, getProviderStatus, getTournamentConfig, getUserProfile, listAllGroups, listAllUsers, listMatches, recalculateGroupScores, syncFixturesFromProvider, syncLiveResultsFromProvider, updateTournamentConfig, upsertManualMatch, upsertManualResult } from "@/lib/firebase/firestore";
import { formatDate } from "@/lib/format";
import type { AuditLog, Group, Match, ProviderStatus, TournamentConfig, UserProfile } from "@/types";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const nextProfile = await getUserProfile(user.uid);
    setProfile(nextProfile);
    if (nextProfile?.roleGlobal === "platform_admin") {
      const [nextGroups, nextUsers, logsSnap, nextMatches, nextProvider, nextTournament] = await Promise.all([
        listAllGroups(),
        listAllUsers(),
        getDocs(query(collection(db, "auditLogs"), limit(50))),
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

  async function onUpsertMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("match");
    setError("");
    setMessage("");
    try {
      await upsertManualMatch({
        matchId: String(form.get("matchId") || ""),
        matchNumber: Number(form.get("matchNumber") || 0) || undefined,
        phase: String(form.get("phase") || "Mundial 2026"),
        fifaGroup: String(form.get("fifaGroup") || ""),
        homeTeam: String(form.get("homeTeam") || ""),
        awayTeam: String(form.get("awayTeam") || ""),
        kickoffAt: String(form.get("kickoffAt") || ""),
        venue: String(form.get("venue") || ""),
        status: "scheduled"
      });
      setMessage("Partido manual guardado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el partido.");
    } finally {
      setBusy("");
    }
  }

  async function onResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("result");
    setError("");
    setMessage("");
    try {
      await upsertManualResult({
        matchId: String(form.get("matchId") || ""),
        status: "finished",
        homeGoals90: Number(form.get("homeGoals90")),
        awayGoals90: Number(form.get("awayGoals90")),
        finalHomeGoals: Number(form.get("finalHomeGoals") || form.get("homeGoals90")),
        finalAwayGoals: Number(form.get("finalAwayGoals") || form.get("awayGoals90")),
        winnerTeam: String(form.get("winnerTeam") || "")
      });
      setMessage("Resultado manual guardado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el resultado.");
    } finally {
      setBusy("");
    }
  }

  async function runProviderSync(type: "fixtures" | "live") {
    setBusy(type);
    setError("");
    setMessage("");
    try {
      const result = type === "fixtures" ? await syncFixturesFromProvider() : await syncLiveResultsFromProvider();
      setMessage(`Sync completado: ${result.data.updated} registros.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar.");
    } finally {
      setBusy("");
    }
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

  if (loading) return <main className="container shell"><div className="panel">Cargando admin...</div></main>;
  if (profile?.roleGlobal !== "platform_admin") return <main className="container shell"><div className="error">Solo platform_admin puede ver esta pantalla.</div></main>;

  return (
    <main className="container shell stack-lg">
      <PageTitle title="Superadmin comercial" subtitle="Opera admins, grupos, resultados manuales y sincronización opcional de proveedor." />
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <div className="grid">
        <MetricCard label="Grupos" value={groups.length} detail="Activos, cerrados o cancelados" />
        <MetricCard label="Usuarios" value={users.length} detail="Incluye admins invitados" />
        <MetricCard label="Resultados" value={providerStatus?.provider ?? tournament?.resultsMode ?? "manual"} detail={providerStatus?.message ?? "Modo manual recomendado"} />
        <MetricCard label="Primer kickoff" value={formatDate(tournament?.firstKickoffAt ?? groups[0]?.firstTournamentKickoffAt)} detail="Registro cierra 90 min antes" />
      </div>

      <section className="panel stack">
        <h2>Invitar administrador de grupo</h2>
        <form className="formGrid" onSubmit={onCreateAdminInvite}>
          <div className="field"><label htmlFor="displayName">Nombre</label><input id="displayName" name="displayName" required /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <button className="button" disabled={busy === "adminInvite"} type="submit">Crear invitación admin</button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Configuración del torneo</h2>
        <p className="muted">Define el primer kickoff oficial y el modo de resultados. Esta fecha calcula el cierre de registro: 90 minutos antes del primer partido.</p>
        <form className="formGrid" onSubmit={onTournamentConfig}>
          <div className="field">
            <label htmlFor="firstKickoffAt">Primer kickoff</label>
            <input id="firstKickoffAt" name="firstKickoffAt" type="datetime-local" defaultValue={toDateTimeLocal(tournament?.firstKickoffAt)} required />
          </div>
          <div className="field">
            <label htmlFor="registrationCutoffMinutes">Cierre de registro (min)</label>
            <input id="registrationCutoffMinutes" name="registrationCutoffMinutes" type="number" min="1" defaultValue={tournament?.registrationCutoffMinutes ?? 90} required />
          </div>
          <div className="field">
            <label htmlFor="resultsMode">Modo de resultados</label>
            <select id="resultsMode" name="resultsMode" defaultValue={tournament?.resultsMode ?? "manual"}>
              <option value="manual">Manual oficial</option>
              <option value="api-football">API-Football opcional</option>
              <option value="mock">Mock pruebas</option>
              <option value="sportmonks">Sportmonks legado</option>
            </select>
          </div>
          <button className="button" disabled={busy === "tournament"} type="submit">Guardar configuración</button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Resultados manuales</h2>
        <p className="muted">Modo oficial recomendado para beta. API-Football puede usarse solo como apoyo si hay cuota/token suficiente.</p>
        <form className="formGrid" onSubmit={onUpsertMatch}>
          <div className="field"><label htmlFor="matchId">ID opcional</label><input id="matchId" name="matchId" /></div>
          <div className="field"><label htmlFor="matchNumber">Número</label><input id="matchNumber" name="matchNumber" type="number" /></div>
          <div className="field"><label htmlFor="phase">Fase</label><input id="phase" name="phase" defaultValue="Fase de grupos" required /></div>
          <div className="field"><label htmlFor="fifaGroup">Grupo FIFA</label><input id="fifaGroup" name="fifaGroup" /></div>
          <div className="field"><label htmlFor="homeTeam">Local</label><input id="homeTeam" name="homeTeam" required /></div>
          <div className="field"><label htmlFor="awayTeam">Visitante</label><input id="awayTeam" name="awayTeam" required /></div>
          <div className="field"><label htmlFor="kickoffAt">Kickoff</label><input id="kickoffAt" name="kickoffAt" type="datetime-local" required /></div>
          <div className="field"><label htmlFor="venue">Sede</label><input id="venue" name="venue" /></div>
          <button className="button" disabled={busy === "match"} type="submit">Guardar partido</button>
        </form>
        <form className="formGrid" onSubmit={onResult}>
          <div className="field">
            <label htmlFor="resultMatch">Partido</label>
            <select id="resultMatch" name="matchId" required>
              <option value="">Selecciona partido</option>
              {matches.map((match) => <option key={match.id} value={match.id}>{match.homeTeam} vs {match.awayTeam}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="homeGoals90">Local 90</label><input id="homeGoals90" name="homeGoals90" type="number" min="0" required /></div>
          <div className="field"><label htmlFor="awayGoals90">Visitante 90</label><input id="awayGoals90" name="awayGoals90" type="number" min="0" required /></div>
          <div className="field"><label htmlFor="finalHomeGoals">Local final</label><input id="finalHomeGoals" name="finalHomeGoals" type="number" min="0" /></div>
          <div className="field"><label htmlFor="finalAwayGoals">Visitante final</label><input id="finalAwayGoals" name="finalAwayGoals" type="number" min="0" /></div>
          <div className="field"><label htmlFor="winnerTeam">Ganador</label><input id="winnerTeam" name="winnerTeam" /></div>
          <button className="button" disabled={busy === "result"} type="submit">Guardar resultado</button>
        </form>
        <div className="cluster">
          <button className="button secondary" disabled={busy === "fixtures"} onClick={() => runProviderSync("fixtures")} type="button">Sync fixtures opcional</button>
          <button className="button secondary" disabled={busy === "live"} onClick={() => runProviderSync("live")} type="button">Sync resultados opcional</button>
        </div>
      </section>

      <section className="panel tableWrap">
        <h2>Grupos</h2>
        <table>
          <thead><tr><th>Grupo</th><th>Estado</th><th>Cierre registro</th><th>Acciones</th></tr></thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td>{group.name}</td>
                <td>{group.status}</td>
                <td>{formatDate(group.registrationDeadlineAt)}</td>
                <td><button className="button secondary" disabled={busy === group.id} onClick={() => recalculate(group.id)} type="button">Recalcular</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Usuarios</h2>
          {users.map((item) => <p key={item.uid}>{item.email} · {item.roleGlobal}</p>)}
        </article>
        <article className="panel">
          <h2>Auditoría</h2>
          {logs.map((log) => <p key={log.id}>{log.action} · {log.entityType}</p>)}
        </article>
      </section>
    </main>
  );
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
