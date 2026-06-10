"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "auto" | "light" | "dark";

const STORAGE_KEY = "la_cancha_theme";
const ORDER: ThemePreference[] = ["auto", "light", "dark"];

const LABELS: Record<ThemePreference, string> = {
  auto: "Tema: automático (sigue al sistema)",
  light: "Tema: claro",
  dark: "Tema: oscuro",
};

function applyTheme(pref: ThemePreference) {
  if (pref === "auto") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.dataset.theme = pref;
    localStorage.setItem(STORAGE_KEY, pref);
  }
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  const val = localStorage.getItem(STORAGE_KEY);
  return val === "light" || val === "dark" ? val : "auto";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    setPref(getStoredTheme());
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    applyTheme(next);
  }

  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;

  return (
    <button
      aria-label={`${LABELS[pref]}. Cambiar tema`}
      className={className}
      onClick={cycle}
      title={LABELS[pref]}
      type="button"
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}
