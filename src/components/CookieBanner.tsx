"use client";

import { useEffect, useState } from "react";

export type ConsentState = "accepted" | "rejected" | null;

const STORAGE_KEY = "la_cancha_cookie_consent";

export function CookieBanner({ onConsent }: { onConsent: (state: "accepted" | "rejected") => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function respond(state: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, state);
    setVisible(false);
    onConsent(state);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      aria-live="polite"
      style={{
        alignItems: "center",
        background: "rgba(6, 23, 17, 0.96)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(212, 166, 66, 0.28)",
        bottom: 0,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28)",
        color: "rgba(255, 253, 247, 0.9)",
        display: "flex",
        flexWrap: "wrap",
        fontSize: "0.88rem",
        gap: "12px 24px",
        justifyContent: "space-between",
        left: 0,
        padding: "16px 24px",
        position: "fixed",
        right: 0,
        zIndex: 100,
      }}
    >
      <p style={{ flex: "1 1 280px", lineHeight: 1.5, margin: 0 }}>
        La Cancha usa análisis de tráfico anónimo (Vercel Analytics) para entender cómo se usa la
        plataforma y mejorarla. No se comparten datos con terceros ni se usan para publicidad.{" "}
        <a
          href="/privacidad"
          style={{ color: "rgba(246, 223, 156, 0.9)", textDecoration: "underline" }}
        >
          Aviso de privacidad
        </a>
      </p>
      <div style={{ display: "flex", flexShrink: 0, gap: 10 }}>
        <button
          type="button"
          onClick={() => respond("rejected")}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,253,247,0.28)",
            borderRadius: 999,
            color: "rgba(255,253,247,0.78)",
            cursor: "pointer",
            font: "inherit",
            fontSize: "0.85rem",
            fontWeight: 700,
            padding: "8px 18px",
            minHeight: 44,
          }}
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={() => respond("accepted")}
          style={{
            background: "var(--gold-500, #d4a642)",
            border: "none",
            borderRadius: 999,
            color: "#211704",
            cursor: "pointer",
            font: "inherit",
            fontSize: "0.85rem",
            fontWeight: 800,
            padding: "8px 18px",
            minHeight: 44,
          }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

export function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}
