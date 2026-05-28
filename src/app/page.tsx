import Link from "next/link";
import { BarChart3, Lock, ShieldCheck, Trophy, Users, WalletCards } from "lucide-react";
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
            Solo invitados. Pronósticos cerrados 90 minutos antes de cada partido.
            Rankings claros, sin wallet ni custodia de dinero.
          </p>
          <div className="cluster">
            <Link className="button gold" href="/login">Entrar a La Cancha</Link>
            <Link className="button secondary" href="/login">Iniciar sesión</Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="container section">
        <div className="statsStrip">
          <p>
            <strong>90 min</strong>
            <span>antes del kickoff cierra cada pronóstico</span>
          </p>
          <p>
            <strong>1</strong>
            <span>acierto por partido atinado, fase de grupos y eliminatorias</span>
          </p>
          <p>
            <strong>0</strong>
            <span>pagos en línea, wallets ni custodia de fondos</span>
          </p>
        </div>
      </section>

      {/* Features bento */}
      <section className="container section stack-lg">
        <LegalNotice />

        {/* Fila 1: 2 cards anchas */}
        <div className="bentoGrid">
          <article className="panel stack cardInteractive bentoWide featureCard--dark">
            <Users size={28} aria-hidden />
            <h2>Invitación privada</h2>
            <p className="muted">Solo pueden registrarse personas invitadas por correo por el administrador del grupo. Sin registro público abierto.</p>
          </article>
          <article className="panel stack cardInteractive bentoWide">
            <Lock size={28} aria-hidden />
            <h2>Pronóstico por partido</h2>
            <p className="muted">Fase de grupos: local gana, empate o visitante. Desde ronda de 32, elige quién avanza. El corte es 90 minutos antes de cada kickoff.</p>
          </article>
        </div>

        {/* Fila 2: 3 cards medianas */}
        <div className="bentoGrid">
          <article className="panel stack cardInteractive bentoMid">
            <Trophy size={28} aria-hidden />
            <h2>Ranking por aciertos</h2>
            <p className="muted">Ordenado por aciertos totales. Empates comparten posición y los premios estimados se dividen entre ellos.</p>
          </article>
          <article className="panel stack cardInteractive bentoMid">
            <WalletCards size={28} aria-hidden />
            <h2>Sin pagos</h2>
            <p className="muted">No hay wallet, custodia ni procesadores. Solo administración privada del pozo entre los participantes.</p>
          </article>
          <article className="panel stack cardInteractive bentoMid">
            <ShieldCheck size={28} aria-hidden />
            <h2>Auditable</h2>
            <p className="muted">Invitaciones, resultados, cierre de registro y recálculos pasan por Cloud Functions con log de auditoría.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
