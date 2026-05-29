import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="siteFooter" aria-label="Pie de página">
      <div className="container siteFooterInner">
        <span className="siteFooterCopy">© 2026 La Cancha</span>
        <nav className="siteFooterLinks" aria-label="Enlaces legales">
          <Link href="/privacidad">Aviso de Privacidad</Link>
          <Link href="/terminos">Términos y Condiciones</Link>
          <a href="mailto:osvaldo.bautista@gmail.com">Contacto ARCO</a>
        </nav>
      </div>
    </footer>
  );
}
