"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { EmptyState } from "@/components/EmptyState";
import { LEGAL_DISCLAIMER, LegalNotice } from "@/components/LegalNotice";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import { createGroup, getUserProfile } from "@/lib/firebase/firestore";
import { canCreateGroup } from "@/lib/permissions";
import type { PredictionVisibility, UserProfile } from "@/types";

export default function NewGroupPage() {
  return (
    <AuthGate>
      <NewGroupForm />
    </AuthGate>
  );
}

function NewGroupForm() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [contributionAmount, setContributionAmount] = useState("0");
  const [moneyResponsibleName, setMoneyResponsibleName] = useState("");
  const [moneyResponsibleEmail, setMoneyResponsibleEmail] = useState("");
  const [predictionVisibility, setPredictionVisibility] = useState<PredictionVisibility>("AFTER_CLOSE");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then(setProfile)
      .finally(() => setProfileLoading(false));
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!accepted) throw new Error("Debes aceptar la advertencia legal para crear el grupo.");
      const groupId = await createGroup({
        name,
        currency,
        contributionAmount: Number(contributionAmount),
        moneyResponsibleName,
        moneyResponsibleEmail,
        validResultMode: "NINETY",
        predictionVisibility,
        legalDisclaimerAccepted: accepted
      });
      setSuccess("Grupo creado. Te estamos llevando al panel del grupo...");
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container shell stack-lg">
      <PageTitle title="Crear grupo" subtitle="Configura una quiniela privada con reglas claras, responsable administrativo y pronósticos protegidos." />
      {profileLoading ? <div className="panel">Validando permisos...</div> : null}
      {!profileLoading && !canCreateGroup(profile) ? (
        <EmptyState title="Necesitas invitación de administrador" body="Solo un superadmin puede invitar administradores de grupo. Si recibiste una liga, abre /join/CODIGO con el correo invitado." href="/dashboard" action="Volver al dashboard" />
      ) : null}
      {!profileLoading && canCreateGroup(profile) ? (
      <form className="panel stack" onSubmit={onSubmit}>
        <LegalNotice />
        <div className="formGrid">
          <div className="field">
            <label htmlFor="name">Nombre del grupo</label>
            <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="currency">Moneda</label>
            <input id="currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} required />
          </div>
          <div className="field">
            <label htmlFor="contribution">Aportación</label>
            <input id="contribution" type="number" min="0" step="0.01" value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="responsible">Responsable del dinero</label>
            <input id="responsible" value={moneyResponsibleName} onChange={(event) => setMoneyResponsibleName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="responsibleEmail">Email del responsable</label>
            <input id="responsibleEmail" type="email" value={moneyResponsibleEmail} onChange={(event) => setMoneyResponsibleEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="visibility">Visibilidad de pronósticos</label>
            <select id="visibility" value={predictionVisibility} onChange={(event) => setPredictionVisibility(event.target.value as PredictionVisibility)}>
              <option value="AFTER_CLOSE">Visibles solo después del cierre (recomendado)</option>
              <option value="BEFORE_CLOSE">Visibles antes del cierre</option>
            </select>
          </div>
        </div>
        {predictionVisibility === "BEFORE_CLOSE" ? (
          <div className="notice">Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</div>
        ) : null}
        <label className="checkRow">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
          <span>{LEGAL_DISCLAIMER}</span>
        </label>
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <button className="button" disabled={loading} type="submit">{loading ? "Creando grupo y membresía..." : "Crear grupo"}</button>
      </form>
      ) : null}
      <section className="grid">
        <article className="panel">
          <h2>Checklist de beta</h2>
          <p className="muted">Después de crear el grupo, invita participantes, sincroniza partidos y valida que todos entiendan las reglas.</p>
        </article>
        <article className="panel">
          <h2>Sin custodia</h2>
          <p className="muted">La app solo registra información administrativa. El responsable del dinero se define por grupo.</p>
        </article>
      </section>
    </main>
  );
}
