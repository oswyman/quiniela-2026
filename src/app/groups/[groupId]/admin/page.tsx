"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { GroupNav } from "@/components/GroupNav";
import { MetricCard } from "@/components/MetricCard";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { createInvite, deleteGroup, getGroup, getMyMember, getProviderStatus, listMembers, recalculateGroupScores, syncFixturesFromProvider, syncLiveResultsFromProvider, updateGroup, updatePaymentStatus } from "@/lib/firebase/firestore";
import { formatDate, formatMoney } from "@/lib/format";
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
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

  async function onCreateInvite(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await createInvite(params.groupId, inviteEmail);
      setInviteEmail("");
      setMessage(`Invitación creada para ${result.data.inviteeEmail}: ${window.location.origin}/join/${result.data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    }
  }

  async function onUpdateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group) return;
    const form = new FormData(event.currentTarget);
    setSavingConfig(true);
    setError("");
    setMessage("");
    try {
      await updateGroup(params.groupId, {
        name: String(form.get("name") ?? group.name),
        currency: String(form.get("currency") ?? group.currency),
        contributionAmount: Number(form.get("contributionAmount") ?? group.contributionAmount),
        moneyResponsibleName: String(form.get("moneyResponsibleName") ?? group.moneyResponsibleName),
        moneyResponsibleEmail: String(form.get("moneyResponsibleEmail") ?? group.moneyResponsibleEmail),
        predictionVisibility: form.get("predictionVisibility") as Group["predictionVisibility"],
        validResultMode: form.get("validResultMode") as Group["validResultMode"]
      });
      setMessage("Configuración actualizada.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el grupo.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function onDeleteGroup() {
    if (!window.confirm("¿Cancelar este grupo? Solo es posible antes del primer partido del Mundial.")) return;
    setError("");
    setMessage("");
    try {
      await deleteGroup(params.groupId);
      setMessage("Grupo cancelado correctamente.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el grupo.");
    }
  }

  async function onRecalculate() {
    if (!window.confirm("¿Recalcular aciertos y premios del grupo?")) return;
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

  if (loading) return <main className="container shell"><div className="panel">Cargando administración...</div></main>;
  if (!group) return <main className="container shell"><div className="panel">Grupo no encontrado.</div></main>;
  if (myMember?.role !== "group_admin") return <main className="container shell"><StatusMessage type="error">Solo el administrador del grupo puede entrar aquí.</StatusMessage></main>;

  const paidMembers = members.filter((member) => member.paymentStatus === "paid").length;
  const pool = members.filter((member) => member.status === "active").length * Number(group.contributionAmount || 0);

  return (
    <main className="container shell stack-lg">
      <div className="toolbar">
        <PageTitle title={`Administrar ${group.name}`} subtitle="Gestiona participantes, pagos manuales, invitaciones y recalculo de aciertos." />
        <GroupNav groupId={params.groupId} />
      </div>
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      <div className="grid">
        <MetricCard label="Participantes" value={members.length} detail="Miembros registrados en el grupo" />
        <MetricCard label="Pagos manuales" value={`${paidMembers}/${members.length}`} detail="Sin procesar pagos en la plataforma" />
        <MetricCard label="Bolsa estimada" value={formatMoney(pool, group.currency)} detail="Solo registro administrativo" />
        <MetricCard label="Cierre registro" value={formatDate(group.registrationDeadlineAt)} detail="90 min antes del primer partido" />
        <MetricCard label="Proveedor" value={providerStatus?.provider ?? "manual"} detail={providerStatus?.message ?? "Sin sync registrada"} />
      </div>
      <div className="toolbar panel">
        <button className="button secondary" onClick={onRecalculate} type="button">Recalcular aciertos</button>
        <button className="button secondary" disabled={busyAction === "fixtures"} onClick={() => runSync("fixtures")} type="button">{busyAction === "fixtures" ? "Sincronizando..." : "Sync fixtures"}</button>
        <button className="button secondary" disabled={busyAction === "live"} onClick={() => runSync("live")} type="button">{busyAction === "live" ? "Sincronizando..." : "Sync resultados"}</button>
      </div>
      <section className="panel stack">
        <h2>Invitar participante</h2>
        <p className="muted">Solo se puede registrar con invitación por correo antes del cierre del grupo.</p>
        <form className="cluster" onSubmit={onCreateInvite}>
          <div className="field growField">
            <label htmlFor="inviteEmail">Email del participante</label>
            <input id="inviteEmail" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
          </div>
          <button className="button" type="submit">Crear invitación</button>
        </form>
      </section>
      <section className="panel tableWrap">
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
      <section className="panel stack">
        <h2>Configuración</h2>
        <form className="formGrid" onSubmit={onUpdateGroup}>
          <div className="field"><label htmlFor="groupName">Nombre</label><input id="groupName" name="name" defaultValue={group.name} required /></div>
          <div className="field"><label htmlFor="currency">Moneda</label><input id="currency" name="currency" defaultValue={group.currency} maxLength={3} required /></div>
          <div className="field"><label htmlFor="contributionAmount">Aportación</label><input id="contributionAmount" name="contributionAmount" type="number" min="0" step="0.01" defaultValue={group.contributionAmount} required /></div>
          <div className="field"><label htmlFor="moneyResponsibleName">Responsable</label><input id="moneyResponsibleName" name="moneyResponsibleName" defaultValue={group.moneyResponsibleName} required /></div>
          <div className="field"><label htmlFor="moneyResponsibleEmail">Email responsable</label><input id="moneyResponsibleEmail" name="moneyResponsibleEmail" type="email" defaultValue={group.moneyResponsibleEmail} required /></div>
          <div className="field">
            <label htmlFor="validResultMode">Resultado válido</label>
            <select id="validResultMode" name="validResultMode" defaultValue={group.validResultMode}>
              <option value="NINETY">90 minutos</option>
              <option value="EXTRA_TIME">Tiempos extra</option>
              <option value="FINAL_WITH_PENALTIES">Final con penales</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="predictionVisibility">Visibilidad</label>
            <select id="predictionVisibility" name="predictionVisibility" defaultValue={group.predictionVisibility}>
              <option value="AFTER_CLOSE">Después del cierre</option>
              <option value="BEFORE_CLOSE">Antes del cierre</option>
            </select>
          </div>
          <div className="cluster">
            <button className="button" disabled={savingConfig} type="submit">{savingConfig ? "Guardando..." : "Guardar cambios"}</button>
            <button className="button danger" onClick={onDeleteGroup} type="button">Cancelar grupo</button>
          </div>
        </form>
      </section>
    </main>
  );
}
