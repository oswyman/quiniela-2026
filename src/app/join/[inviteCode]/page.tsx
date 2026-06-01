"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { loginWithGoogle, registerWithInvite } from "@/lib/firebase/auth";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const isOpen = invite?.type === "open";

  useEffect(() => {
    async function load() {
      try {
        const result = await previewInvite(params.inviteCode);
        setInvite(result.data);
        // Pre-fill email for email-locked invites
        if (result.data.inviteeEmail) setEmail(result.data.inviteeEmail);
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
    if (!isOpen && !invite?.inviteeEmail) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const accountEmail = isOpen ? email : (invite?.inviteeEmail ?? email);
      await registerWithInvite(accountEmail, password, displayName);
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

  async function onGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      // After Google sign-in the user is authenticated — accept the invite
      await accept();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed")) {
        setError(msg || "No se pudo continuar con Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading || authLoading) return <main className="container shell"><div className="panel">Validando invitación...</div></main>;

  return (
    <main className="container shell twoCol">
      <section className="stack-lg">
        <PageTitle
          title={isOpen ? "Unirte al grupo" : "Aceptar invitación"}
          subtitle={isOpen
            ? "Crea tu cuenta o inicia sesión con Google para unirte al grupo."
            : "El registro está ligado al correo invitado."
          }
        />
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

        {invite ? (
          <div className="panel stack">
            {!isOpen && (
              <>
                <span className="pill">{invite.type === "group_admin" ? "Administrador de grupo" : "Participante"}</span>
                <h2>{invite.inviteeEmail}</h2>
                <p className="muted">Esta invitación solo puede usarse con este correo. Si ya tienes cuenta, inicia sesión con ese correo y vuelve a esta liga.</p>
              </>
            )}

            {user ? (
              // Already logged in — just accept
              <button className="button" disabled={loading} onClick={acceptExisting} type="button">
                {loading ? "Aceptando..." : "Aceptar invitación"}
              </button>
            ) : (
              <div className="stack">
                {/* Google Sign-In — available for open invites; also for email invites when user has a Google account */}
                <button
                  className="button googleButton"
                  disabled={loading}
                  onClick={onGoogleSignIn}
                  type="button"
                >
                  <GoogleIcon />
                  Continuar con Google
                </button>
                <div className="orDivider"><span>o</span></div>

                <form className="stack" onSubmit={createAccount}>
                  <div className="field">
                    <label htmlFor="displayName">Nombre</label>
                    <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  </div>
                  {isOpen && (
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="password">Contraseña</label>
                    <div className="inputGroup">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                  <button className="button" disabled={loading} type="submit">
                    {loading ? "Creando cuenta..." : "Crear cuenta y unirte"}
                  </button>
                  <Link href={`/login?redirect=/join/${params.inviteCode}`}>Ya tengo cuenta. Iniciar sesión</Link>
                </form>
              </div>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}
