import Link from "next/link";
import { ShieldCheck, Users, WalletCards } from "lucide-react";
import { LegalNotice } from "@/components/LegalNotice";
import { PageTitle } from "@/components/PageTitle";

export default function HomePage() {
  return (
    <main>
      <section className="container">
        <PageTitle
          title="Quinielas privadas del Mundial 2026"
          subtitle="Crea grupos, invita participantes, captura pronósticos, calcula rankings y documenta premios sugeridos sin procesar pagos ni custodiar dinero."
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <Link className="button" href="/login">Iniciar sesión</Link>
          <Link className="button secondary" href="/groups/new">Crear grupo</Link>
        </div>
        <LegalNotice />
        <div className="grid" style={{ marginTop: 20 }}>
          <article className="card">
            <Users size={26} aria-hidden />
            <h2>Grupos privados</h2>
            <p className="muted">Cada grupo configura aportación, moneda, reglas, responsable del dinero y visibilidad de pronósticos.</p>
          </article>
          <article className="card">
            <ShieldCheck size={26} aria-hidden />
            <h2>Reglas claras</h2>
            <p className="muted">Los pronósticos cierran al kickoff, los puntos se calculan automáticamente y las acciones sensibles van a auditoría.</p>
          </article>
          <article className="card">
            <WalletCards size={26} aria-hidden />
            <h2>Sin pagos</h2>
            <p className="muted">El MVP registra estados administrativos y premios estimados. No hay Stripe, wallet, custodia ni procesador de pagos.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
