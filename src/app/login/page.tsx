"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail, registerWithEmail } from "@/lib/firebase/auth";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!displayName.trim()) throw new Error("Ingresa tu nombre.");
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container shell twoCol">
      <section>
        <PageTitle title={mode === "login" ? "Entrar a tu quiniela" : "Crear cuenta"} subtitle="Accede a tus grupos privados, pronósticos y rankings en un solo lugar." />
        <form className="panel stack" onSubmit={onSubmit}>
          {mode === "register" ? (
            <div className="field">
              <label htmlFor="displayName">Nombre</label>
              <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          <button className="button" disabled={loading} type="submit">
            {loading ? "Validando acceso..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
          <button className="button secondary" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
          </button>
        </form>
      </section>
      <aside className="panel stack">
        <span className="pill">Club privado</span>
        <h2>Una quiniela que se siente seria desde el primer clic</h2>
        <p className="muted">Tu cuenta conecta Firebase Auth con tus grupos, invitaciones, pronósticos y rankings. Sin pagos, sin wallets, sin custodia.</p>
        <div className="grid">
          <div className="card"><strong>Reglas claras</strong><p className="fineprint">Visibilidad, resultado válido y premios sugeridos por grupo.</p></div>
          <div className="card"><strong>Operación limpia</strong><p className="fineprint">Estados de pago manual y auditoría básica para admins.</p></div>
        </div>
      </aside>
    </main>
  );
}
