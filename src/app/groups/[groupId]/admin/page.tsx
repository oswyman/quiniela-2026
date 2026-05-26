"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { GroupNav } from "@/components/GroupNav";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { createInvite, getGroup, getMyMember, getProviderStatus, listMembers, recalculateGroupScores, syncFixturesFromProvider, syncLiveResultsFromProvider, updatePaymentStatus } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/format";
import type { Group, Member, ProviderStatus } from "@/types";

export default function GroupAdminPage() {
  return (
    <AuthGate>
      <GroupAdminContent />
    </AuthGate>
  );
}

function GroupAdminContent() {
  const params = useParams<{ groupId: string }>();
  const { user } = useAuthUser();
  const [group, setGroup] = useState<Group | null>(null);
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    const [nextGroup, nextMember, nextMembers] = await Promise.all([
      getGroup(params.groupId),
      user ? getMyMember(params.groupId, user.uid) : Promise.resolve(null),
      listMembers(params.groupId)
    ]);
    setGroup(nextGroup);
    setMyMember(nextMember);
    setMembers(nextMembers);
    setProviderStatus(await getProviderStatus());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.groupId, user?.uid]);

  async function onCreateInvite() {
    setError("");
    setMessage("");
    try {
      const result = await createInvite(params.groupId);
      setMessage(`Invitación creada: ${window.location.origin}/join/${result.data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    }
  }

  async function onRecalculate() {
    if (!window.confirm("¿Recalcular puntos y premios del grupo?")) return;
    setError("");
    setMessage("");
    try {
      await recalculateGroupScores(params.groupId);
      setMessage("Recalculo solicitado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recalcular.");
    }
  }

  async function runSync(type: "fixtures" | "live") {
    setBusyAction(type);
    setError("");
    setMessage("");
    try {
      const result = type === "fixtures" ? await syncFixturesFromProvider() : await syncLiveResultsFromProvider();
      setMessage(`Sincronización completada: ${result.data.updated} registros actualizados.`);
      setProviderStatus(await getProviderStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar el proveedor.");
    } finally {
      setBusyAction("");
    }
  }

  async function onPaymentChange(uid: string, paymentStatus: Member["paymentStatus"]) {
    await updatePaymentStatus(params.groupId, uid, paymentStatus);
    await reload();
  }

  if (loading) return <main className="container"><div className="card">Cargando administración...</div></main>;
  if (!group) return <main className="container"><div className="card">Grupo no encontrado.</div></main>;
  if (myMember?.role !== "group_admin") return <main className="container"><StatusMessage type="error">Solo el administrador del grupo puede entrar aquí.</StatusMessage></main>;

  const paidMembers = members.filter((member) => member.paymentStatus === "paid").length;
  const pool = members.filter((member) => member.status === "active").length * Number(group.contributionAmount || 0);

  return (
    <main className="container stack-lg">
      <PageTitle title={`Administrar ${group.name}`} subtitle="Gestiona participantes, pagos manuales, invitaciones y recalculo." />
      <GroupNav groupId={params.groupId} />
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <div className="grid">
        <MetricCard label="Participantes" value={members.length} detail="Miembros registrados en el grupo" />
        <MetricCard label="Pagos manuales" value={`${paidMembers}/${members.length}`} detail="Sin procesar pagos en la plataforma" />
        <MetricCard label="Bolsa estimada" value={formatMoney(pool, group.currency)} detail="Solo registro administrativo" />
        <MetricCard label="Proveedor" value={providerStatus?.provider ?? "mock"} detail={providerStatus?.message ?? "Sin sync registrada"} />
      </div>
      <div className="cluster">
        <button className="button" onClick={onCreateInvite} type="button">Crear invitación</button>
        <button className="button secondary" onClick={onRecalculate} type="button">Recalcular puntos</button>
        <button className="button secondary" disabled={busyAction === "fixtures"} onClick={() => runSync("fixtures")} type="button">{busyAction === "fixtures" ? "Sincronizando..." : "Sync fixtures"}</button>
        <button className="button secondary" disabled={busyAction === "live"} onClick={() => runSync("live")} type="button">{busyAction === "live" ? "Sincronizando..." : "Sync resultados"}</button>
      </div>
      <section className="card tableWrap">
        <h2>Participantes</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Pago manual</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.uid}>
                <td>{member.displayName}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td>
                  <select value={member.paymentStatus} onChange={(event) => onPaymentChange(member.uid, event.target.value as Member["paymentStatus"])}>
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="not_applicable">No aplica</option>
                  </select>
                </td>
                <td>{member.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>Configuración</h2>
        <p>Moneda: {group.currency}</p>
        <p>Aportación: {group.contributionAmount}</p>
        <p>Responsable: {group.moneyResponsibleName} ({group.moneyResponsibleEmail})</p>
        <p>La edición avanzada debe pasar por Cloud Functions para mantener auditoría.</p>
      </section>
    </main>
  );
}
