import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | La Cancha",
  description: "Aviso de privacidad de La Cancha conforme a la LFPDPPP."
};

export default function PrivacidadPage() {
  return (
    <main className="container shell">
      <div className="legalDoc">
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Última actualización: 28 de mayo de 2026
        </p>

        <h1>Aviso de Privacidad</h1>

        <section>
          <h2>1. Responsable del tratamiento</h2>
          <p>
            <strong>La Cancha</strong> (en adelante, &ldquo;el Responsable&rdquo;) es el responsable del
            tratamiento de sus datos personales. Para cualquier asunto relacionado con este
            aviso o con el ejercicio de sus derechos, puede contactarnos en:
          </p>
          <p>
            Correo electrónico:{" "}
            <a href="mailto:osvaldo.bautista@gmail.com">osvaldo.bautista@gmail.com</a>
          </p>
        </section>

        <section>
          <h2>2. Datos personales que recabamos</h2>
          <p>Para operar la plataforma, recabamos y tratamos los siguientes datos personales:</p>
          <ul>
            <li><strong>Identificación:</strong> nombre completo o nombre de usuario, dirección de correo electrónico.</li>
            <li><strong>Participación:</strong> pronósticos registrados, puntuaciones, posición en el ranking.</li>
            <li><strong>Operación:</strong> registros de invitaciones aceptadas, fecha y hora de acceso, estado de aportación económica (pagado / pendiente) cuando el administrador del grupo lo registra manualmente.</li>
            <li><strong>Técnicos:</strong> datos de sesión gestionados por Firebase Authentication (Google LLC).</li>
          </ul>
          <p>
            No recabamos datos sensibles en los términos del artículo 3, fracción VI, de la LFPDPPP
            (datos de salud, origen étnico, vida sexual, creencias religiosas, etc.).
          </p>
        </section>

        <section>
          <h2>3. Finalidades del tratamiento</h2>
          <p><strong>Finalidades primarias</strong> (necesarias para la prestación del servicio):</p>
          <ul>
            <li>Crear y gestionar su cuenta de usuario.</li>
            <li>Permitirle participar en grupos de quiniela privados por invitación.</li>
            <li>Registrar, validar y mostrar sus pronósticos y puntuaciones.</li>
            <li>Enviarle comunicaciones operativas relacionadas con el servicio (notificaciones de resultados, cambios de configuración del grupo).</li>
            <li>Cumplir con obligaciones legales aplicables.</li>
          </ul>
          <p><strong>Finalidades secundarias</strong> (puede oponerse al tratamiento):</p>
          <ul>
            <li>Mejorar la experiencia del usuario a partir de métricas de uso agregadas y anonimizadas.</li>
          </ul>
          <p>
            Si no desea que sus datos sean tratados para finalidades secundarias, puede manifestarlo
            enviando un correo a <a href="mailto:osvaldo.bautista@gmail.com">osvaldo.bautista@gmail.com</a>{" "}
            con el asunto &ldquo;Oposición a finalidades secundarias&rdquo;.
          </p>
        </section>

        <section>
          <h2>4. Transferencias de datos</h2>
          <p>
            Sus datos personales son procesados por los siguientes terceros en calidad de
            encargados del tratamiento, con los que contamos o gestionaremos el contrato de
            procesamiento de datos correspondiente:
          </p>
          <ul>
            <li>
              <strong>Google LLC / Firebase</strong>: infraestructura de autenticación, base de
              datos y funciones de servidor. Sus servidores pueden estar ubicados fuera de México.
              Google está adherido al Marco de Privacidad de Datos UE-EE.UU. y cuenta con
              cláusulas contractuales estándar.
            </li>
            <li>
              <strong>Vercel Inc.</strong>: hospedaje del sitio web y entrega de contenido.
            </li>
          </ul>
          <p>
            No vendemos, cedemos ni transferimos sus datos a terceros distintos a los anteriores,
            salvo mandato legal.
          </p>
        </section>

        <section>
          <h2>5. Derechos ARCO</h2>
          <p>
            Usted tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>,{" "}
            <strong>Cancelar</strong> u <strong>Oponerse</strong> (derechos ARCO) al tratamiento
            de sus datos personales, conforme a lo establecido en la LFPDPPP.
          </p>
          <p>Para ejercer sus derechos, envíe una solicitud a:</p>
          <p>
            <a href="mailto:osvaldo.bautista@gmail.com">osvaldo.bautista@gmail.com</a>
          </p>
          <p>Su solicitud debe incluir:</p>
          <ul>
            <li>Nombre completo y correo electrónico registrado en la plataforma.</li>
            <li>Descripción clara del derecho que desea ejercer y los datos sobre los que solicita la acción.</li>
            <li>Copia de identificación oficial (para verificar su identidad).</li>
          </ul>
          <p>
            Responderemos su solicitud en un plazo máximo de <strong>20 días hábiles</strong>{" "}
            contados a partir de su recepción.
          </p>
        </section>

        <section>
          <h2>6. Uso de cookies y tecnologías similares</h2>
          <p>
            La Cancha utiliza cookies de sesión y almacenamiento local (localStorage) exclusivamente
            para mantener su sesión de autenticación activa. Estas cookies son técnicamente
            necesarias para el funcionamiento del servicio y no requieren consentimiento adicional.
          </p>
          <p>
            No utilizamos cookies de rastreo publicitario ni compartimos su información de
            navegación con terceros con fines comerciales.
          </p>
        </section>

        <section>
          <h2>7. Medidas de seguridad</h2>
          <p>
            Implementamos medidas técnicas y organizativas para proteger sus datos, entre ellas:
            transmisión cifrada mediante HTTPS/TLS, autenticación gestionada por Firebase Auth,
            reglas de acceso a base de datos que limitan la lectura y escritura al usuario
            autorizado, y registros de auditoría de operaciones críticas.
          </p>
        </section>

        <section>
          <h2>8. Retención de datos</h2>
          <p>
            Conservamos sus datos mientras su cuenta esté activa o mientras sea necesario para
            la operación del servicio. Puede solicitar la cancelación de su cuenta y sus datos
            en cualquier momento a través del correo indicado en la sección 5.
          </p>
        </section>

        <section>
          <h2>9. Cambios a este aviso</h2>
          <p>
            Podemos actualizar este aviso de privacidad en cualquier momento. Cuando lo hagamos,
            modificaremos la fecha de &ldquo;última actualización&rdquo; al inicio de esta página. Le
            notificaremos cambios sustanciales por correo electrónico al menos 15 días antes de
            que entren en vigor.
          </p>
        </section>

        <section>
          <h2>10. Ley aplicable</h2>
          <p>
            Este aviso se rige por la{" "}
            <strong>
              Ley Federal de Protección de Datos Personales en Posesión de los Particulares
              (LFPDPPP)
            </strong>{" "}
            y su Reglamento, así como por los Lineamientos del Aviso de Privacidad emitidos por
            el INAI.
          </p>
        </section>

        <div className="legalDocFooter">
          <Link href="/">← Volver al inicio</Link>
          <Link href="/terminos">Ver Términos y Condiciones</Link>
        </div>
      </div>
    </main>
  );
}
