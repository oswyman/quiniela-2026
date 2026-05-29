import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones | La Cancha",
  description: "Términos y condiciones de uso de La Cancha."
};

export default function TerminosPage() {
  return (
    <main className="container shell">
      <div className="legalDoc">
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Última actualización: 28 de mayo de 2026
        </p>

        <h1>Términos y Condiciones de Uso</h1>

        <section>
          <h2>1. Descripción del servicio</h2>
          <p>
            <strong>La Cancha</strong> es una plataforma digital que permite a grupos privados
            organizar quinielas deportivas relacionadas con el Mundial FIFA 2026. El servicio
            incluye: creación de grupos por invitación, registro de pronósticos, cálculo
            automático de puntuaciones y visualización de rankings.
          </p>
          <p>
            La Cancha es una herramienta administrativa. <strong>No custodia, recibe,
            administra ni distribuye dinero</strong>. Cualquier aportación económica entre
            los participantes de un grupo es responsabilidad exclusiva de dichos participantes
            y del administrador del grupo, sin intervención de La Cancha.
          </p>
        </section>

        <section>
          <h2>2. Acceso al servicio</h2>
          <p>
            El acceso a La Cancha es exclusivo por invitación. Para utilizar el servicio debe:
          </p>
          <ul>
            <li>Recibir una invitación directa del administrador de un grupo.</li>
            <li>Crear o vincular una cuenta mediante correo electrónico o cuenta de Google.</li>
            <li>Aceptar estos Términos y Condiciones y el Aviso de Privacidad.</li>
          </ul>
          <p>
            Al acceder al servicio, usted declara ser mayor de 18 años o contar con autorización
            de su tutor legal.
          </p>
        </section>

        <section>
          <h2>3. Uso aceptable</h2>
          <p>Usted se compromete a:</p>
          <ul>
            <li>Usar el servicio únicamente para los fines descritos en estos términos.</li>
            <li>No intentar acceder a cuentas, grupos o datos de otros usuarios sin autorización.</li>
            <li>No realizar ingeniería inversa, scraping ni automatización no autorizada del servicio.</li>
            <li>No usar el servicio para actividades ilegales, incluyendo la operación de apuestas comerciales no autorizadas por la ley mexicana.</li>
            <li>Proporcionar información veraz al registrarse.</li>
          </ul>
        </section>

        <section>
          <h2>4. Pronósticos y cierres</h2>
          <p>
            Los pronósticos se cierran automáticamente <strong>90 minutos antes</strong> del
            inicio de cada partido. Una vez cerrado el período, no es posible modificar ni
            registrar pronósticos para ese partido, sin excepción. El Responsable no interviene
            en ajustes manuales de pronósticos fuera del sistema.
          </p>
        </section>

        <section>
          <h2>5. Limitación de responsabilidad</h2>
          <p>
            La Cancha se proporciona &ldquo;tal como está&rdquo;. En la máxima medida permitida por la ley,
            el Responsable no será liable por:
          </p>
          <ul>
            <li>Pérdidas económicas derivadas del uso de la plataforma.</li>
            <li>Disputas entre participantes de un grupo sobre dinero, premios o resultados.</li>
            <li>Interrupciones del servicio por causas fuera de nuestro control (fallas de terceros, caso fortuito, fuerza mayor).</li>
            <li>Errores en resultados de partidos proporcionados por fuentes externas.</li>
          </ul>
          <p>
            La responsabilidad máxima del Responsable ante usted, por cualquier causa, se limita
            a cero pesos, dado que el servicio se presta de forma gratuita.
          </p>
        </section>

        <section>
          <h2>6. Propiedad intelectual</h2>
          <p>
            El código, diseño, marca y contenidos de La Cancha son propiedad del Responsable.
            Los datos que usted genera (pronósticos, nombre de usuario) son suyos. Al usar el
            servicio, nos otorga una licencia limitada, no exclusiva y revocable para mostrar
            esos datos dentro de la plataforma a los miembros autorizados de su grupo.
          </p>
        </section>

        <section>
          <h2>7. Cancelación de cuenta</h2>
          <p>
            Puede solicitar la eliminación de su cuenta en cualquier momento escribiendo a{" "}
            <a href="mailto:osvaldo.bautista@gmail.com">osvaldo.bautista@gmail.com</a>. El Responsable
            puede suspender o eliminar cuentas que violen estos términos, previa notificación
            cuando sea practicable.
          </p>
        </section>

        <section>
          <h2>8. Modificaciones al servicio y a estos términos</h2>
          <p>
            El Responsable puede modificar el servicio o estos términos en cualquier momento.
            Cambios sustanciales se notificarán por correo electrónico con al menos 15 días de
            anticipación. El uso continuado del servicio después de la fecha efectiva constituye
            aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2>9. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>.
            Para cualquier controversia, las partes se someten a la jurisdicción de los
            tribunales competentes de la <strong>Ciudad de México</strong>, renunciando
            expresamente a cualquier otro fuero que pudiera corresponderles por razón de su
            domicilio presente o futuro.
          </p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>
            Para cualquier pregunta sobre estos términos, escríbanos a:{" "}
            <a href="mailto:osvaldo.bautista@gmail.com">osvaldo.bautista@gmail.com</a>
          </p>
        </section>

        <div className="legalDocFooter">
          <Link href="/">← Volver al inicio</Link>
          <Link href="/privacidad">Ver Aviso de Privacidad</Link>
        </div>
      </div>
    </main>
  );
}
