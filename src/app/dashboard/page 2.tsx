"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { useAuthUser } from "@/components/useAuthUser";
import { getUserProfile } from "@/lib/firebase/firestore";
import { listMyGroups } from "@/lib/firebase/firestore";
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

  return (
    <main className="container">
      <PageTitle title="Dashboard" subtitle="Tus grupos privados y el estado de cada quiniela." />
      <Link className="button" href="/groups/new">Crear grupo</Link>
      {loading ? <p>Cargando grupos...</p> : null}
      {error ? <div className="error">{error}</div> : null}
      {!loading && groups.length === 0 ? <div className="card">Todavía no participas en ningún grupo.</div> : null}
      <div className="grid" style={{ marginTop: 18 }}>
        {groups.map((group) => (
          <Link className="card stack" href={`/groups/${group.id}`} key={group.id}>
            <h2>{group.name}</h2>
            <p className="muted">Estado: {group.status} · Rol: {group.memberRole}</p>
            <p>{group.currency} {group.contributionAmount.toLocaleString("es-MX")} por participante</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
