"use client";

import Link from "next/link";
import { useAuthUser } from "./useAuthUser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <div className="container card">Cargando sesión...</div>;
  }

  if (!user) {
    return (
      <div className="container card">
        <p>Necesitas iniciar sesión para continuar.</p>
        <Link className="button" href="/login">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
