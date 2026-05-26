"use client";

import Link from "next/link";
import { useAuthUser } from "./useAuthUser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <main className="container shell"><div className="panel">Cargando sesión...</div></main>;
  }

  if (!user) {
    return (
      <main className="container shell">
      <div className="panel stack">
        <p>Necesitas iniciar sesión para continuar.</p>
        <Link className="button" href="/login">
          Iniciar sesión
        </Link>
      </div>
      </main>
    );
  }

  return <>{children}</>;
}
