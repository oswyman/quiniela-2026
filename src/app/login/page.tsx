"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail, registerWithEmail } from "@/lib/firebase/auth";
import { PageTitle } from "@/components/PageTitle";

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
    <main className="container">
      <PageTitle title={mode === "login" ? "Iniciar sesión" : "Crear cuenta"} />
      <form className="card stack" onSubmit={onSubmit}>
        {mode === "register" ? (
          <div className="field">
            <label htmlFor="displayName">Nombre</label>
            <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" disabled={loading} type="submit">
          {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarme"}
        </button>
        <button className="button secondary" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
        </button>
      </form>
    </main>
  );
}
