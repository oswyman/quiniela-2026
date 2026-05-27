"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { useAuthUser } from "@/components/useAuthUser";
import { db } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/firestore";
import type { AuditLog, Group, UserProfile } from "@/types";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const nextProfile = await getUserProfile(user.uid);
      setProfile(nextProfile);
      if (nextProfile?.roleGlobal === "platform_admin") {
        const [groupsSnap, usersSnap, logsSnap] = await Promise.all([
          getDocs(query(collection(db, "groups"), limit(50))),
          getDocs(query(collection(db, "users"), limit(50))),
          getDocs(query(collection(db, "auditLogs"), limit(50)))
        ]);
        setGroups(groupsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as Group));
        setUsers(usersSnap.docs.map((item) => item.data() as UserProfile));
        setLogs(logsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog));
      }
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <main className="container shell"><div className="panel">Cargando admin...</div></main>;
  if (profile?.roleGlobal !== "platform_admin") return <main className="container shell"><div className="error">Solo platform_admin puede ver esta pantalla.</div></main>;

  return (
    <main className="container shell stack-lg">
      <PageTitle title="Admin plataforma" subtitle="Vista básica de grupos, usuarios y auditoría." />
      <div className="grid">
        <section className="panel">
          <h2>Grupos</h2>
          {groups.map((group) => <p key={group.id}>{group.name} · {group.status}</p>)}
        </section>
        <section className="panel">
          <h2>Usuarios</h2>
          {users.map((item) => <p key={item.uid}>{item.email} · {item.roleGlobal}</p>)}
        </section>
        <section className="panel">
          <h2>Auditoría</h2>
          {logs.map((log) => <p key={log.id}>{log.action} · {log.entityType}</p>)}
        </section>
      </div>
    </main>
  );
}
