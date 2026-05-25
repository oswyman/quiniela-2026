"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { LEGAL_DISCLAIMER, LegalNotice } from "@/components/LegalNotice";
import { PageTitle } from "@/components/PageTitle";
import { useAuthUser } from "@/components/useAuthUser";
import { createGroup, getUserProfile } from "@/lib/firebase/firestore";
import type { PredictionVisibility, ValidResultMode } from "@/types";

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
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [contributionAmount, setContributionAmount] = useState("0");
  const [moneyResponsibleName, setMoneyResponsibleName] = useState("");
  const [moneyResponsibleEmail, setMoneyResponsibleEmail] = useState("");
  const [validResultMode, setValidResultMode] = useState<ValidResultMode>("NINETY");
  const [predictionVisibility, setPredictionVisibility] = useState<PredictionVisibility>("AFTER_CLOSE");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    try {
      if (!accepted) throw new Error("Debes aceptar la advertencia legal para crear el grupo.");
      const profile = await getUserProfile(user.uid);
      if (!profile) throw new Error("No se encontró tu perfil de usuario.");
      const groupId = await createGroup(
        {
          name,
          currency,
          contributionAmount: Number(contributionAmount),
          moneyResponsibleName,
          moneyResponsibleEmail,
          validResultMode,
          predictionVisibility,
          legalDisclaimerAccepted: accepted
        },
        profile
      );
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <PageTitle title="Crear grupo" subtitle="Configura las reglas principales antes de invitar participantes." />
      <form className="card stack" onSubmit={onSubmit}>
        <LegalNotice />
        <div className="grid">
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
            <label htmlFor="resultMode">Resultado válido</label>
            <select id="resultMode" value={validResultMode} onChange={(event) => setValidResultMode(event.target.value as ValidResultMode)}>
              <option value="NINETY">Marcador a los 90 minutos</option>
              <option value="EXTRA_TIME">Después de tiempos extra</option>
              <option value="FINAL_WITH_PENALTIES">Final incluyendo penales</option>
            </select>
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
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
          <span>{LEGAL_DISCLAIMER}</span>
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" disabled={loading} type="submit">{loading ? "Creando..." : "Crear grupo"}</button>
      </form>
    </main>
  );
}
