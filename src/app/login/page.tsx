"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginWithEmail } from "@/lib/firebase/auth";
import { PageTitle } from "@/components/PageTitle";
import { StatusMessage } from "@/components/StatusMessage";

export default function LoginPage() {
  const router = useRouter();
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
        <PageTitle title="Entrar a La Cancha" subtitle="El acceso es privado: necesitas una invitación por correo para crear cuenta o unirte a un grupo." />
        <form className="panel stack" onSubmit={onSubmit}>
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
          <p className="fineprint">¿Tienes invitación? Abre el enlace que te mandó el administrador o pega el código en la ruta <code>/join/CODIGO</code>.</p>
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
