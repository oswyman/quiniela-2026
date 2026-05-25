import type { Group } from "@/types";
import { LegalNotice } from "./LegalNotice";

export function RulesPanel({ group }: { group: Group }) {
  return (
    <section className="card stack">
      <h2>Reglas del grupo</h2>
      <LegalNotice />
      <ul>
        <li>Marcador exacto: 3 puntos.</li>
        <li>Diferencia de goles correcta: 2 puntos.</li>
        <li>Ganador correcto o empate correcto: 1 punto.</li>
        <li>Pronóstico tardío: 0 puntos.</li>
        <li>Los pronósticos cierran cuando inicia el partido.</li>
        <li>Resultado válido: {labelResultMode(group.validResultMode)}.</li>
        <li>Visibilidad de pronósticos: {labelVisibility(group.predictionVisibility)}.</li>
        <li>La plataforma no procesa pagos, no custodia dinero y no incluye wallet.</li>
      </ul>
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <div className="notice">Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</div>
      ) : null}
    </section>
  );
}

function labelResultMode(value: Group["validResultMode"]) {
  return {
    NINETY: "marcador a los 90 minutos",
    EXTRA_TIME: "marcador después de tiempos extra",
    FINAL_WITH_PENALTIES: "resultado final incluyendo penales"
  }[value];
}

function labelVisibility(value: Group["predictionVisibility"]) {
  return value === "AFTER_CLOSE" ? "visibles solo después del cierre" : "visibles antes del cierre";
}
