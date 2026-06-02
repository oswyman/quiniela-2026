"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginWithEmail, loginWithGoogle } from "@/lib/firebase/auth";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push(redirect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed")) {
        setError(msg || "No se pudo iniciar sesión con Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container shell twoCol">
      <section>
        <PageTitle title="Entrar a La Cancha" subtitle="Inicia sesión con tu cuenta o abre el link de invitación que te compartió el administrador." />
        <form className="panel stack" onSubmit={onSubmit}>
          <button
            className="googleButton"
            disabled={loading}
            onClick={onGoogleSignIn}
            type="button"
          >
            <GoogleIcon />
            Continuar con Google
          </button>
          <div className="orDivider"><span>o</span></div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="inputGroup">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          <button className="button" disabled={loading} type="submit">
            {loading ? "Validando acceso..." : "Entrar"}
          </button>
          <p className="fineprint">¿Tienes invitación? Abre el enlace que te compartió el administrador.</p>
        </form>
      </section>
      <aside className="panel stack">
        <span className="pill">Club privado</span>
        <h2>Una quiniela que se siente seria desde el primer clic</h2>
        <p className="muted">Tu cuenta conecta Firebase Auth con tus grupos, invitaciones, pronósticos y rankings. Sin pagos, sin wallets, sin custodia.</p>
        <Link className="button secondary" href="/">Ver cómo funciona</Link>
        <div className="grid">
          <div className="card"><strong>Reglas claras</strong><p className="fineprint">Visibilidad, resultado válido y premios sugeridos por grupo.</p></div>
          <div className="card"><strong>Operación limpia</strong><p className="fineprint">Estados de pago manual y auditoría básica para admins.</p></div>
        </div>
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
