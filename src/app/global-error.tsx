"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fffdf7", color: "#151917" }}>
        <main style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>Error crítico</h1>
          <p style={{ color: "#6e7772", lineHeight: 1.6, marginBottom: 24 }}>
            Ocurrió un error inesperado en La Cancha. Por favor recarga la página.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#10392d",
              border: "none",
              borderRadius: 999,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              minHeight: 48,
              padding: "12px 24px",
            }}
          >
            Recargar
          </button>
        </main>
      </body>
    </html>
  );
}
