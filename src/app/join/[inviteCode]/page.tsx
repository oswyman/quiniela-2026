"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { acceptInvite } from "@/lib/firebase/firestore";

export default function JoinPage() {
  return (
    <AuthGate>
      <JoinContent />
    </AuthGate>
  );
}

function JoinContent() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    setError("");
    try {
      const result = await acceptInvite(params.inviteCode);
      router.push(`/groups/${result.data.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la invitación.");
      setLoading(false);
    }
  }

  return (
    <main className="container shell stack-lg">
      <PageTitle title="Unirse a grupo" subtitle={`Código de invitación: ${params.inviteCode}`} />
      {error ? <div className="error">{error}</div> : null}
      <div className="panel stack">
        <p>Al unirte aceptas las reglas privadas del grupo. La plataforma no procesa pagos ni custodia dinero.</p>
        <button className="button" disabled={loading} onClick={join} type="button">{loading ? "Uniendo..." : "Aceptar invitación"}</button>
        <Link href="/dashboard">Volver al dashboard</Link>
      </div>
    </main>
  );
}
