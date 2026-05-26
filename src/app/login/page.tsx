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
    <main className="container twoCol" style={{ paddingBottom: 48 }}>
      <section>
        <PageTitle title={mode === "login" ? "Entrar a tu quiniela" : "Crear cuenta"} subtitle="Accede a tus grupos privados, pronósticos y rankings en un solo lugar." />
        <form className="card stack" onSubmit={onSubmit}>
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
      <aside className="card stack" style={{ alignSelf: "start", marginTop: 140 }}>
        <span className="pill">Beta vendible</span>
        <h2>Lista para grupos privados</h2>
        <p className="muted">El registro crea tu perfil en Firebase Auth y Firestore. Después podrás crear grupos, invitar jugadores y administrar premios sugeridos.</p>
      </aside>
    </main>
  );
}
