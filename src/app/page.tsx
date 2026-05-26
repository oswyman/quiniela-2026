import Link from "next/link";
import { BarChart3, Lock, ShieldCheck, Trophy, Users, WalletCards } from "lucide-react";
import { LegalNotice } from "@/components/LegalNotice";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container stack-lg">
          <p className="eyebrow">Beta privada · Mundial FIFA 2026</p>
          <h1>Quinielas privadas con control, reglas y ranking automático.</h1>
          <p>
            Organiza grupos comerciales sin custodiar dinero: invitaciones privadas, pronósticos bloqueados por kickoff,
            auditoría, premios sugeridos y resultados listos para sincronizar con Sportmonks.
          </p>
          <div className="cluster">
            <Link className="button gold" href="/groups/new">Crear mi grupo</Link>
            <Link className="button secondary" href="/login">Iniciar sesión</Link>
          </div>
        </div>
      </section>
      <section className="container stack-lg" style={{ padding: "28px 0 48px" }}>
        <LegalNotice />
        <div className="grid">
          <article className="card stack">
            <Users size={28} aria-hidden />
            <h2>Grupos privados</h2>
            <p className="muted">Moneda, aportación, visibilidad, reglas de resultado y responsable del dinero por grupo.</p>
          </article>
          <article className="card stack">
            <Lock size={28} aria-hidden />
            <h2>Bloqueo justo</h2>
            <p className="muted">El backend valida el cierre por kickoff para evitar pronósticos editados tarde.</p>
          </article>
          <article className="card stack">
            <BarChart3 size={28} aria-hidden />
            <h2>Ranking claro</h2>
            <p className="muted">Puntos, desempates, premios estimados y explicación de empates en zona de premio.</p>
          </article>
          <article className="card stack">
            <ShieldCheck size={28} aria-hidden />
            <h2>Auditable</h2>
            <p className="muted">Acciones sensibles pasan por Cloud Functions y generan logs administrativos.</p>
          </article>
          <article className="card stack">
            <Trophy size={28} aria-hidden />
            <h2>Datos del Mundial</h2>
            <p className="muted">Capa preparada para Sportmonks: fixtures, live scores y resultados normalizados.</p>
          </article>
          <article className="card stack">
            <WalletCards size={28} aria-hidden />
            <h2>Sin pagos</h2>
            <p className="muted">No hay wallet, custodia ni procesadores. Solo administración privada.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
