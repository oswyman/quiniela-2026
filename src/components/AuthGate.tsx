"use client";

import Link from "next/link";
import { useAuthUser } from "./useAuthUser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <main className="container shell"><div className="panel stack"><span className="pill">Verificando acceso</span><p>Cargando sesión segura...</p></div></main>;
  }

  if (!user) {
    return (
      <main className="container shell">
      <div className="panel stack">
        <span className="pill">Sesión requerida</span>
        <h1>Necesitas iniciar sesión</h1>
        <p className="muted">La Cancha funciona por invitación. Entra con el correo autorizado para ver tus grupos y pronósticos.</p>
        <Link className="button" href="/login">
          Iniciar sesión
        </Link>
      </div>
      </main>
    );
  }

  return <>{children}</>;
}
