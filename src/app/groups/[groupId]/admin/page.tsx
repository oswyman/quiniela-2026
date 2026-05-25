"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { useAuthUser } from "@/components/useAuthUser";
import { createInvite, getGroup, getMyMember, listMembers, recalculateGroupScores, updatePaymentStatus } from "@/lib/firebase/firestore";
import type { Group, Member } from "@/types";

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

  async function onPaymentChange(uid: string, paymentStatus: Member["paymentStatus"]) {
    await updatePaymentStatus(params.groupId, uid, paymentStatus);
    await reload();
  }

  if (loading) return <main className="container"><p>Cargando administración...</p></main>;
  if (!group) return <main className="container"><div className="card">Grupo no encontrado.</div></main>;
  if (myMember?.role !== "group_admin") return <main className="container"><div className="error">Solo el administrador del grupo puede entrar aquí.</div></main>;

  return (
    <main className="container stack">
      <PageTitle title={`Administrar ${group.name}`} subtitle="Gestiona participantes, pagos manuales, invitaciones y recalculo." />
      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="button" onClick={onCreateInvite} type="button">Crear invitación</button>
        <button className="button secondary" onClick={onRecalculate} type="button">Recalcular puntos</button>
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
