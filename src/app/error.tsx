"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción esto llega a Sentry/monitoring vía error boundary
    console.error("[RouteError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="container shell">
      <div className="panel stack">
        <span className="pill">Error inesperado</span>
        <h1 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)" }}>Algo salió mal</h1>
        <p className="muted">
          Ocurrió un error al cargar esta sección. Puedes intentarlo de nuevo o volver al dashboard.
        </p>
        <div className="cluster">
          <button className="button" type="button" onClick={reset}>
            Intentar de nuevo
          </button>
          <Link className="button secondary" href="/dashboard">
            Ir al dashboard
          </Link>
        </div>
        {error.digest ? (
          <p className="fineprint">Referencia: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
