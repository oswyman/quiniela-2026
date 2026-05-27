import Link from "next/link";
import { BarChart3, Clock3, Lock, ShieldCheck, Trophy, Users, WalletCards } from "lucide-react";
import { LegalNotice } from "@/components/LegalNotice";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container stack-lg">
          <p className="eyebrow">La Cancha · Beta privada Mundial FIFA 2026</p>
          <h1>La mesa seria para tu quiniela mundialista.</h1>
          <p>
            Acceso por invitación, registro cerrado 90 minutos antes del primer partido del Mundial,
            pronósticos que cierran 90 minutos antes de cada kickoff y rankings entendibles para todos.
            Sin pagos en línea ni custodia de dinero.
          </p>
          <div className="cluster">
            <Link className="button gold" href="/login">Entrar con invitación</Link>
            <Link className="button secondary" href="/login">Iniciar sesión</Link>
          </div>
          <div className="heroStats">
            <p><strong>90 min</strong> Antes del kickoff cierra cada pronóstico</p>
            <p><strong>1</strong> Acierto por partido atinado</p>
            <p><strong>0</strong> Pagos o wallets</p>
          </div>
        </div>
      </section>
      <section className="container section stack-lg">
        <LegalNotice />
        <div className="grid">
          <article className="panel stack cardInteractive">
            <Users size={28} aria-hidden />
            <h2>1. Invitación privada</h2>
            <p className="muted">Solo pueden registrarse personas invitadas por correo por el administrador del grupo o superadmin.</p>
          </article>
          <article className="panel stack cardInteractive">
            <Clock3 size={28} aria-hidden />
            <h2>2. Registro antes del Mundial</h2>
            <p className="muted">Cada grupo debe quedar registrado 90 minutos antes del primer partido del Mundial.</p>
          </article>
          <article className="panel stack cardInteractive">
            <Lock size={28} aria-hidden />
            <h2>3. Pronóstico por partido</h2>
            <p className="muted">En grupos eliges local, empate o visitante. Desde ronda de 32 eliges quién avanza. El corte es 90 minutos antes de cada kickoff.</p>
          </article>
          <article className="panel stack cardInteractive">
            <BarChart3 size={28} aria-hidden />
            <h2>Ranking por aciertos</h2>
            <p className="muted">El ranking se ordena por aciertos totales. Los empates comparten posición y los premios estimados se dividen entre los empatados en zona de premio.</p>
          </article>
          <article className="panel stack cardInteractive">
            <ShieldCheck size={28} aria-hidden />
            <h2>Auditable</h2>
            <p className="muted">Invitaciones, resultados, cierre de registro y recalculos pasan por Cloud Functions y auditoría.</p>
          </article>
          <article className="panel stack cardInteractive">
            <Trophy size={28} aria-hidden />
            <h2>Resultados manuales/API</h2>
            <p className="muted">Modo manual oficial para beta y conexión opcional con API-Football si hay cuota suficiente.</p>
          </article>
          <article className="panel stack cardInteractive">
            <WalletCards size={28} aria-hidden />
            <h2>Sin pagos</h2>
            <p className="muted">No hay wallet, custodia ni procesadores. Solo administración privada.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
