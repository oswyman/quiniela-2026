"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AuthGate } from "@/components/AuthGate";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { EmptyState } from "@/components/EmptyState";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { getUserProfile, listMyGroups } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/format";
import { canCreateGroup } from "@/lib/permissions";
import type { Group, UserProfile } from "@/types";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { user } = useAuthUser();
  const reduce = useReducedMotion();
  const [groups, setGroups] = useState<Array<Group & { memberRole: string }>>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setProfile(await getUserProfile(user.uid));
        const nextGroups = await listMyGroups(user.uid);
        setGroups(nextGroups.filter((group) => group.status !== "cancelled"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar tus grupos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const totalPool = groups.reduce((sum, group) => sum + Number(group.contributionAmount || 0), 0);
  const canCreate = canCreateGroup(profile);
  const nextGroup = groups[0];

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title={`Hola, ${profile?.displayName || user?.displayName || user?.email || "participante"}`} subtitle="Tus grupos privados, roles y estado operativo de cada quiniela." />
        <div className="cluster">
          {nextGroup ? <Link className="button gold" href={`/groups/${nextGroup.id}/predictions`}>Pronosticar ahora</Link> : null}
          {canCreate ? <Link className="button secondary" href="/groups/new">Crear grupo</Link> : null}
          {profile?.roleGlobal === "platform_admin" ? <Link className="button secondary" href="/admin">Admin plataforma</Link> : null}
        </div>
      </div>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <div className="grid">
        <MetricCard label="Grupos activos" value={loading ? "..." : groups.length} detail="Donde participas o administras" />
        <MetricCard label="Aportaciones base" value={formatMoney(totalPool || 0, "MXN")} detail="Suma administrativa visible para ti" />
        <MetricCard label="Cierre por partido" value="90 min antes" detail="Así cierra cada pronóstico - no al kickoff" />
      </div>
      {loading ? <DashboardSkeleton /> : null}
      {!loading && groups.length === 0 ? (
        <EmptyState
          title="Todavía no hay grupos"
          body={canCreate ? "Crea tu primer grupo e invita participantes por correo." : "Abre tu liga de invitación con el correo invitado para entrar a una quiniela."}
          href={canCreate ? "/groups/new" : undefined}
          action={canCreate ? "Crear grupo" : undefined}
        />
      ) : null}
      <div className="grid">
        {groups.map((group, index) => (
          <motion.article
            className="panel stack cardInteractive"
            key={group.id}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cluster">
              <span className={`pill ${group.memberRole === "group_admin" ? "pill--admin" : ""}`}>
                {group.memberRole === "group_admin" ? "Admin" : "Participante"}
              </span>
              <span className={`pill ${group.status === "active" ? "pill--active" : group.status === "draft" ? "pill--draft" : group.status === "closed" ? "pill--closed" : group.status === "cancelled" ? "pill--cancelled" : ""}`}>
                {group.status === "active" ? "Activo" : group.status === "draft" ? "Borrador" : group.status === "closed" ? "Cerrado" : group.status === "cancelled" ? "Cancelado" : group.status}
              </span>
            </div>
            <h2>{group.name}</h2>
            <p className="muted">Visibilidad: {group.predictionVisibility === "AFTER_CLOSE" ? "Después del cierre" : "Antes del cierre"}</p>
            <p>{formatMoney(group.contributionAmount, group.currency)} por participante</p>
            <div className="cluster">
              <Link className="button gold" href={`/groups/${group.id}/predictions`}>Pronosticar</Link>
              <Link className="button secondary" href={`/groups/${group.id}`}>Ver grupo</Link>
            </div>
          </motion.article>
        ))}
      </div>
    </main>
  );
}
