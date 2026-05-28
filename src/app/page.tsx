import Link from "next/link";
import { LegalNotice } from "@/components/LegalNotice";

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container stack-lg">
          <p className="eyebrow">Mundial FIFA 2026</p>
          <h1>La mesa seria para tu quiniela mundialista.</h1>
          <p>
            Grupo privado. Pronósticos sellados 90 minutos antes del kickoff.
            El pozo lo administran ustedes, no nosotros.
          </p>
          <div>
            <Link className="button gold" href="/login">Entrar a La Cancha</Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="container section">
        <div className="landingSteps">
          <div className="landingStep">
            <span className="stepNum">01</span>
            <div>
              <strong>El admin crea el grupo e invita por correo</strong>
              <p className="muted">Nadie entra sin invitación directa. Sin registro público, sin extraños.</p>
            </div>
          </div>
          <div className="landingStep">
            <span className="stepNum">02</span>
            <div>
              <strong>Cada quien pronostica antes del cierre</strong>
              <p className="muted">90 minutos antes del kickoff, el pronóstico se sella. Sin cambios posibles después.</p>
            </div>
          </div>
          <div className="landingStep">
            <span className="stepNum">03</span>
            <div>
              <strong>El ranking decide quién gana el pozo</strong>
              <p className="muted">Aciertos totales. Empates comparten posición y premios. Sin interpretaciones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principios */}
      <section className="container section">
        <div className="landingPrinciples">
          <div className="landingPrinciple">
            <h2>El pozo es de tu grupo.</h2>
            <p className="muted">Sin wallet, procesador ni custodia de fondos. La plataforma lleva el marcador — el dinero lo administra quien confíen entre ustedes.</p>
          </div>
          <div className="landingPrinciple">
            <h2>Solo tus invitados entran.</h2>
            <p className="muted">El administrador invita por correo, uno a uno. Sin registro abierto ni acceso de terceros. La Cancha no es pública.</p>
          </div>
          <div className="landingPrinciple">
            <h2>Auditable desde el inicio.</h2>
            <p className="muted">Invitaciones, cierres, resultados y recálculos quedan registrados. Si alguien pregunta cómo se calculó el ranking, hay respuesta.</p>
          </div>
        </div>
      </section>

      {/* Legal */}
      <section className="container" style={{ paddingBottom: 56 }}>
        <LegalNotice />
      </section>
    </main>
  );
}
