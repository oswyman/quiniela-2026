import type { Group } from "@/types";
import { LegalNotice } from "./LegalNotice";

export function RulesPanel({ group }: { group: Group }) {
  return (
    <section className="card stack">
      <h2>Reglas del grupo</h2>
      <LegalNotice />
      <ul>
        <li>Cada partido atinado suma 1 acierto.</li>
        <li>En fase de grupos se elige: local gana, empate o visitante gana.</li>
        <li>Desde ronda de 32 se elige qué equipo avanza.</li>
        <li>No se capturan marcadores en los pronósticos de participantes.</li>
        <li>Pronóstico tardío: 0 aciertos.</li>
        <li>Los pronósticos cierran cuando inicia el partido.</li>
        <li>La fase de grupos se evalúa a 90 minutos. La eliminación directa se evalúa por equipo que avanza.</li>
        <li>Visibilidad de pronósticos: {labelVisibility(group.predictionVisibility)}.</li>
        <li>La plataforma no procesa pagos, no custodia dinero y no incluye wallet.</li>
      </ul>
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <div className="notice">Este modo puede generar ventaja estratégica porque otros participantes podrían copiar pronósticos.</div>
      ) : null}
    </section>
  );
}

function labelVisibility(value: Group["predictionVisibility"]) {
  return value === "AFTER_CLOSE" ? "visibles solo después del cierre" : "visibles antes del cierre";
}
