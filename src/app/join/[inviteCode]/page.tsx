"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { registerWithInvite } from "@/lib/firebase/auth";
import { acceptInvite, previewInvite } from "@/lib/firebase/firestore";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";
import { useAuthUser } from "@/components/useAuthUser";
import type { Invite } from "@/types";

export default function JoinPage() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await previewInvite(params.inviteCode);
        setInvite(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invitación no encontrada.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.inviteCode]);

  async function accept() {
    setError("");
    setMessage("");
    const result = await acceptInvite(params.inviteCode);
    setMessage("Invitación aceptada.");
    router.push(result.data.groupId ? `/groups/${result.data.groupId}` : "/dashboard");
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (!invite?.inviteeEmail) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await registerWithInvite(invite.inviteeEmail, password, displayName);
      await accept();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la invitación.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptExisting() {
    setLoading(true);
    try {
      await accept();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aceptar la invitación.");
    } finally {
      setLoading(false);
    }
  }

  if (loading || authLoading) return <main className="container shell"><div className="panel">Validando invitación...</div></main>;

  return (
    <main className="container shell twoCol">
      <section className="stack-lg">
        <PageTitle title="Aceptar invitación" subtitle="El registro en La Cancha es privado y está ligado al correo invitado." />
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
        {invite ? (
          <div className="panel stack">
            <span className="pill">{invite.type === "group_admin" ? "Administrador de grupo" : "Participante"}</span>
            <h2>{invite.inviteeEmail}</h2>
            <p className="muted">Esta invitación solo puede usarse con este correo. Si ya tienes cuenta, inicia sesión con ese correo y vuelve a esta liga.</p>
            {user ? (
              <button className="button" disabled={loading} onClick={acceptExisting} type="button">
                {loading ? "Aceptando..." : "Aceptar invitación"}
              </button>
            ) : (
              <form className="stack" onSubmit={createAccount}>
                <div className="field">
                  <label htmlFor="displayName">Nombre</label>
                  <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="password">Contraseña</label>
                  <div className="inputGroup">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="inputSuffix"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button className="button" disabled={loading} type="submit">{loading ? "Creando cuenta..." : "Crear cuenta y aceptar"}</button>
                <Link href="/login">Ya tengo cuenta</Link>
              </form>
            )}
          </div>
        ) : null}
      </section>
      <aside className="panel stack">
        <h2>Regla comercial</h2>
        <p className="muted">Los grupos cierran registro 90 minutos antes del primer partido del Mundial. Los pronósticos cierran antes del kickoff de cada partido.</p>
      </aside>
    </main>
  );
}
