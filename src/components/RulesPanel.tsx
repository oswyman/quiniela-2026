import type { Group } from "@/types";
import { LegalNotice } from "./LegalNotice";

export function RulesPanel({ group }: { group: Group }) {
  return (
    <section className="card stack">
      <h2>Reglas del grupo</h2>
      <LegalNotice />
      <ul>
        <li><strong>1 acierto por partido.</strong> No hay puntos extra por marcador exacto.</li>
        <li><strong>Fase de grupos:</strong> elige local gana, empate o visitante gana. Se evalúa el resultado a 90 minutos.</li>
        <li><strong>Eliminación directa (desde ronda de 32):</strong> elige el equipo que avanza al siguiente round.</li>
        <li><strong>Cierre de pronósticos:</strong> 90 minutos antes del kickoff de cada partido. Después de ese límite no puedes cambiar ni registrar tu elección.</li>
        <li><strong>Elección fuera de tiempo:</strong> si tu pronóstico queda registrado después del corte, vale 0 aciertos.</li>
        <li>Visibilidad de pronósticos: {labelVisibility(group.predictionVisibility)}.</li>
      </ul>
      <div>
        <strong>Premios estimados</strong>
        <ul>
          <li>2 participantes activos: 1.° lugar 100 %.</li>
          <li>3 participantes activos: 1.° 70 %, 2.° 30 %.</li>
          <li>4 o más participantes activos: 1.° 60 %, 2.° 30 %, 3.° 10 %.</li>
          <li>Empates en zona de premio: se suman y dividen entre los empatados.</li>
          <li>La plataforma no procesa pagos ni custodia dinero. Los premios son una guía administrativa.</li>
        </ul>
      </div>
      {group.predictionVisibility === "BEFORE_CLOSE" ? (
        <div className="notice">Visibilidad antes del cierre: otros participantes pueden ver tus elecciones antes de que el partido inicie, lo que puede generar ventaja estratégica.</div>
      ) : null}
    </section>
  );
}

function labelVisibility(value: Group["predictionVisibility"]) {
  return value === "AFTER_CLOSE" ? "visibles solo después del cierre" : "visibles antes del cierre";
}
