"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { getUserProfile, listMyGroups } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/format";
import type { Group } from "@/types";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { user } = useAuthUser();
  const [groups, setGroups] = useState<Array<Group & { memberRole: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        await getUserProfile(user.uid);
        setGroups(await listMyGroups(user.uid));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar tus grupos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const totalPool = groups.reduce((sum, group) => sum + Number(group.contributionAmount || 0), 0);

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title="Dashboard" subtitle="Tus grupos privados, roles y estado operativo de cada quiniela." />
        <div className="cluster">
          <Link className="button gold" href="/groups/new">Crear grupo</Link>
          <Link className="button secondary" href="/admin">Admin plataforma</Link>
        </div>
      </div>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <div className="grid">
        <MetricCard label="Grupos activos" value={loading ? "..." : groups.length} detail="Donde participas o administras" />
        <MetricCard label="Aportaciones base" value={formatMoney(totalPool || 0, "MXN")} detail="Suma administrativa visible para ti" />
        <MetricCard label="Modo recomendado" value="Después del cierre" detail="Reduce copia estratégica de pronósticos" />
      </div>
      {loading ? <div className="panel">Cargando tus grupos...</div> : null}
      {!loading && groups.length === 0 ? (
        <EmptyState title="Todavía no hay grupos" body="Crea tu primera quiniela privada o únete con una invitación." href="/groups/new" action="Crear grupo" />
      ) : null}
      <div className="grid">
        {groups.map((group) => (
          <Link className="panel stack cardInteractive" href={`/groups/${group.id}`} key={group.id}>
            <span className="pill">{group.memberRole === "group_admin" ? "Admin" : "Participante"}</span>
            <h2>{group.name}</h2>
            <p className="muted">Estado: {group.status} · Visibilidad: {group.predictionVisibility === "AFTER_CLOSE" ? "Después del cierre" : "Antes del cierre"}</p>
            <p>{formatMoney(group.contributionAmount, group.currency)} por participante</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
