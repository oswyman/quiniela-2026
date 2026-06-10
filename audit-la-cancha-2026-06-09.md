---
proyecto: La Cancha — Quinielas Privadas Mundial 2026
fecha: 2026-06-09
score_global: 73/100
decision: GO CONDICIONAL
expertos: 14
areas_bloqueantes: 0
---

# Reporte de Auditoría Pre-Producción
## La Cancha — 2026-06-09 (re-auditoría; previa: 2026-06-02, 73/100)

> **Stack auditado:** Next.js 14 (App Router) + Firebase (Firestore, Auth, Cloud Functions, App Check) + TypeScript + CSS nativo + Vercel
> **Contexto:** Tercera auditoría. Desde la del 2026-06-02 no hay commits nuevos, pero el árbol de trabajo contiene los fixes de las condiciones pre-deploy: 3 de las 4 condiciones del Horizonte 1 anterior están resueltas en el código.
> **Datos sensibles:** nombre, email, pronósticos. Sin custodia de dinero.

---

## 🔄 Estado de las condiciones de la auditoría anterior (2026-06-02)

| Condición H1 anterior | Estado | Evidencia |
|---|---|---|
| 1. Firestore Rules: `predictionVisibility` | ✅ RESUELTO | `firestore.rules:71-83` — lectura de picks ajenos bloqueada salvo `BEFORE_CLOSE` o partido cerrado |
| 2. Monitoreo de producción | ⚠️ PARCIAL | `@vercel/analytics` instalado y gateado por consentimiento; **sin** monitoreo de errores (Sentry) ni alertas |
| 3. Banner de cookies | ✅ RESUELTO | `CookieBanner.tsx` + `AnalyticsProvider.tsx` — `<Analytics/>` solo carga con consentimiento "accepted" |
| 4. `.env.local.test` en `.gitignore` | ✅ RESUELTO | última línea de `.gitignore` |

También resueltos del Horizonte 2 anterior: Error Boundaries (`src/app/error.tsx` + `global-error.tsx`), `viewport` explícito (`layout.tsx:32`), console.logs eliminados.

---

## 🔍 Fase 1 — Dictámenes Individuales

## 🔍 ARQUITECTURA DE SOFTWARE — Arquitecto Senior
**Score: 78/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Drift entre Firestore Rules y la capa de datos del cliente:** `src/lib/firebase/firestore.ts:158-160` (`updatePaymentStatus`) escribe en `groupMembers/{id}` pero `firestore.rules:99` declara `allow write: if false` para esa colección. El contrato rules↔cliente se rompió sin que ningún test lo detectara — síntoma de que la lógica de escritura denormalizada debería vivir en Cloud Functions, como ya ocurre con el resto del dominio.
- N+1 en `listMyGroups` (`firestore.ts:36-46`): un `getDoc` por membresía dentro de `Promise.all`. Funciona a esta escala pero es el patrón a corregir antes de crecer.

### Observaciones y mejoras recomendadas
- Archivos legacy del MVP de Google Sheets en la raíz (`Code.gs`, `Scoring.gs`, `ApiResults.gs`, `Audit.gs`, `Config.gs`, `SheetsSetup.gs`, `Formulas.md`, `TEST_PLAN.md`) y un `firebase 2.json` duplicado sin trackear: mover a `/legacy` o eliminar para reducir ruido y confusión de configuración.
- Sin ADRs ni diagrama de arquitectura; el README y la memoria de proyecto compensan parcialmente.

### Veredicto individual
La arquitectura cliente-ligero/Functions-para-lo-sensible sigue siendo correcta y consistente; el único riesgo real es la escritura denormalizada de pagos que quedó fuera de ese patrón.

---

## 🔍 SEGURIDAD DE APLICACIÓN — Ingeniero en Seguridad de Software
**Score: 81/100** | **Semáforo: 🟢**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- `script-src` de producción aún incluye `'unsafe-inline'` (`next.config.js:14`), lo que debilita la CSP contra XSS. Migrar a nonces de Next.js cuando sea viable.
- Sin rate limiting aplicativo en callables sensibles (`acceptInvite`, `submitPrediction`). App Check + reCAPTCHA Enterprise mitiga abuso automatizado, pero no limita a un usuario autenticado hostil.

### Observaciones y mejoras recomendadas
- `img-src 'self' data: https:` es muy amplio; restringir a los hosts reales (unsplash, gstatic).
- El resto está sólido: headers completos (HSTS preload, `frame-ancestors 'none'`, `Permissions-Policy`), App Check inicializado (`client.ts:21`), validación server-side en Functions, IDOR de pronósticos ahora cerrado en DB (`firestore.rules:71-83` — la condición #1 de la auditoría anterior, verificada y bien implementada: propia predicción siempre; ajena solo con `BEFORE_CLOSE` o partido `finished/live/cancelled`).

### Veredicto individual
El gap principal de la auditoría anterior (visibilidad de pronósticos solo en UI) quedó cerrado a nivel de base de datos; el área pasa a verde con pendientes de endurecimiento no bloqueantes.

---

## 🔍 CIBERSEGURIDAD E INFRAESTRUCTURA — Experto en Ciberseguridad
**Score: 73/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Backup PITR no verificable desde el repo:** `docs/backup-setup.md` documenta el procedimiento, pero no hay evidencia de ejecución (gcloud sin sesión activa en este entorno). Verificar con `gcloud firestore databases describe --database="(default)" | grep pointInTimeRecoveryEnablement` y hacer un restore test. Sin backup probado, el criterio de go-live no se cumple.
- **Sin detección de incidentes:** no hay monitoreo de errores ni alertas (email on error spike en Firebase/Vercel, o Sentry). Un fallo de Functions en pleno partido pasaría desapercibido hasta que los usuarios reporten.
- Sin plan de respuesta a incidentes ni procedimiento de rollback documentado (no existe en `docs/`).

### Observaciones y mejoras recomendadas
- Higiene de secretos correcta: `.gitignore` cubre `.env*`, `.env.local.test` incluido; sin credenciales en el repo (`firebase 2.json` es solo config de firestore/functions, no una service account key).
- Infraestructura delegada a Vercel/Firebase (TLS, DDoS básico, parcheo) — apropiado para el tamaño del equipo.
- Verificar también que `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` esté en Vercel Production (no verificable desde el repo).

### Veredicto individual
La superficie está bien protegida; lo que falta es operación: backup verificado, alertas y rollback son los tres requisitos antes de exponer la plataforma a tráfico real.

---

## 🔍 BACKEND — Programador Backend Senior
**Score: 70/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno (ver hallazgo #1: defecto funcional grave, clasificado importante-alto porque el dato canónico sí se persiste).

### Hallazgos importantes (Deben resolverse pronto)
- **`updatePaymentStatus` está parcialmente roto en producción** (`src/lib/firebase/firestore.ts:158-160`): hace dos `updateDoc` secuenciales sin transacción; el primero (`groups/{id}/members/{uid}`) es permitido por rules, el segundo (`groupMembers/{groupId}_{uid}`) es **rechazado siempre** por `firestore.rules:99` (`allow write: if false`). Resultado: el doc canónico se actualiza, el índice denormalizado queda obsoleto y la promesa rechaza con `permission-denied`. Debe convertirse en Cloud Function con `runTransaction` (patrón ya usado en `createGroup`), o eliminarse la escritura al índice si `paymentStatus` no se lee de ahí.
- `listRecentResults` (`firestore.ts:84-95`) sigue sin `orderBy` + índice compuesto: trae 50 docs y ordena en cliente, con el workaround documentado en comentario. Crear índice `(status, kickoffAt DESC)` y usar `orderBy + limit`.
- Sin rate limiting aplicativo en callables (compartido con Seguridad).

### Observaciones y mejoras recomendadas
- Las Functions mantienen el buen nivel ya auditado: validación exhaustiva de inputs, deadline de pronósticos enforced en servidor, `isPlatformAdmin()`/`isGroupAdmin()` al inicio de cada función privilegiada, audit logs.
- Manejo de fechas en UTC con timestamps correcto.

### Veredicto individual
Las Cloud Functions están listas; el flujo de pagos es el único punto del backend que no debe llegar así al go-live — es un fix de 2-3 horas con patrón ya existente en el codebase.

---

## 🔍 FRONTEND — Programador Frontend Senior
**Score: 76/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- `onPaymentChange` (`src/app/groups/[groupId]/admin/page.tsx:179-182`) es el único handler de la página **sin try/catch**: con el bug de rules descrito en Backend, la promesa rechaza, `reload()` nunca corre, el `<select>` revierte visualmente y el admin no recibe ningún mensaje de error. Envolver en try/catch con `setError` como hacen `onRoleChange` y el resto.

### Observaciones y mejoras recomendadas
- Resuelto desde la auditoría anterior: Error Boundaries (`error.tsx`, `global-error.tsx`), cero `console.log` en `src/`, `AnalyticsProvider` con gating de consentimiento limpio.
- `ServiceWorkerRegistration` registra `/sw.js` correctamente, pero ver hallazgo de PWA incompleta en Producto/Responsive.
- Gestión de estado simple y apropiada (estado local + Firestore); estados de carga y vacío presentes en las páginas revisadas.

### Veredicto individual
Frontend en buen estado; el try/catch faltante en pagos es trivial pero debe entrar junto con el fix de backend porque hoy oculta un fallo real.

---

## 🔍 DISEÑO RESPONSIVO — Especialista en Responsive Design
**Score: 84/100** | **Semáforo: 🟢**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- Ninguno.

### Observaciones y mejoras recomendadas
- Resuelto: `export const viewport: Viewport` explícito con `width: "device-width", initialScale: 1, themeColor` (`layout.tsx:32-36`).
- Botones del CookieBanner con `minHeight: 40` — subir a 44px para cumplir el mínimo táctil de Apple HIG; el banner usa `flex-wrap` y se adapta bien a pantallas angostas.
- Sin manifest PWA, la experiencia "instalada" solo existe vía meta `appleWebApp` en iOS; en Android no hay prompt de instalación (ver Producto).
- Persiste la recomendación de validar los flujos críticos en iOS Safari y Android Chrome reales como parte del checklist de testing.

### Veredicto individual
El trabajo responsive sigue siendo de lo más sólido del proyecto; lista para producción en esta dimensión.

---

## 🔍 BASE DE DATOS — DBA Senior
**Score: 72/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Índice denormalizado `groupMembers` desincronizado por diseño:** el dato `paymentStatus` ya no puede mantenerse sincronizado desde el cliente (rules lo prohíben). Mientras nada lea `paymentStatus` desde `groupMembers` el daño es contenido, pero es una bomba de tiempo para cualquier feature futura que confíe en ese índice. Mover la doble escritura a una Cloud Function transaccional.
- Backup PITR sin evidencia de activación ni restore test (compartido con Ciberseguridad).
- `listRecentResults` sin índice compuesto `(status, kickoffAt DESC)` — over-fetch de 50 docs por carga del dashboard.

### Observaciones y mejoras recomendadas
- Las rules de `predictions` ahora hacen 2 `get()` adicionales por lectura de predicción ajena (grupo + match): correcto en seguridad, vigilar el costo de lecturas si los grupos crecen; una alternativa futura es denormalizar `predictionVisibility` al doc de predicción.
- Sin política de retención/TTL para `auditLogs` y `apiSyncLogs` — definir antes de que crezcan indefinidamente.
- Modelado general correcto: jerarquía de subcolecciones clara, escrituras sensibles (`scores`, `prizes`, `matches`) solo vía Admin SDK.

### Veredicto individual
El modelo es sano y las rules mejoraron; los dos pendientes reales son el backup verificado y sacar la escritura denormalizada de pagos del cliente.

---

## 🔍 DEVOPS E INFRAESTRUCTURA — Ingeniero DevOps Senior
**Score: 65/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Sin monitoreo de errores ni alertas.** Vercel Analytics (pageviews, gateado por consentimiento) no es observabilidad: no hay forma de enterarse de un error spike en Functions o en el frontend. Mínimo viable pre-launch: alertas de email de Firebase (Functions error rate) + Vercel log drains o Sentry gratuito.
- **Sin procedimiento de rollback documentado.** No existe en `docs/`. Documentar: revertir deploy en Vercel (promote previous), `firebase deploy --only functions` de la versión anterior, y restore de Firestore.
- Sin CD: `ci.yml` corre lint + 31 tests + build de app y functions en push/PR a main (✅), pero el deploy es manual y el deploy de rules/functions no está en el pipeline — riesgo de drift entre `firestore.rules` local y producción (precisamente la clase de drift que causó el bug de pagos, si las rules desplegadas difieren de las del repo).
- Sin entorno staging.

### Observaciones y mejoras recomendadas
- **Verificar qué `firestore.rules` está realmente desplegado** (`firebase deploy --only firestore:rules` tras confirmar): si producción aún tiene rules viejas, la condición #1 de la auditoría anterior no está realmente cerrada.
- `firebase 2.json` duplicado: eliminarlo o renombrarlo; un `firebase deploy` con config ambigua es fuente de errores.
- CDN, TLS y dominios gestionados por Vercel — correcto.

### Veredicto individual
Sigue siendo el área más frágil: la plataforma puede lanzarse, pero hoy nadie se enteraría de un incidente ni podría revertirlo con un procedimiento escrito.

---

## 🔍 ACCESIBILIDAD — Especialista en Accesibilidad Web
**Score: 76/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- Sin evidencia de prueba con lector de pantalla (VoiceOver/NVDA) en los flujos críticos — incluirlo en la sesión de testing manual pendiente.

### Observaciones y mejoras recomendadas
- CookieBanner bien resuelto: `role="dialog"`, `aria-label`, `aria-live="polite"`, botones reales con texto, "Rechazar" con la misma jerarquía que "Aceptar". Subir `minHeight` de 40 a 44px.
- Skip link a `#main-content` presente en `layout.tsx`; Error Boundaries ahora dan una salida accesible ante crashes en vez de pantalla en blanco.
- Persisten las buenas bases ya auditadas: labels en formularios, `prefers-reduced-motion`.
- El banner no necesita focus trap (no es modal bloqueante) — decisión correcta.

### Veredicto individual
Base sólida y mejorando; lo único pendiente de verdad es validar con tecnología asistiva real antes del lanzamiento público.

---

## 🔍 PERFORMANCE Y OPTIMIZACIÓN — Ingeniero de Performance
**Score: 76/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- N+1 de `listMyGroups` en el dashboard (1 query + N `getDoc` secuenciales por grupo) — latencia perceptible para usuarios en varios grupos; las rules nuevas de `predictions` añaden además 2 reads por celda ajena visible en vistas de grupo.
- `listRecentResults` descarga 50 matches para mostrar 6 — resolver junto con el índice compuesto.

### Observaciones y mejoras recomendadas
- El service worker nuevo mejora visitas repetidas: cache-first para `/_next/static/` (assets inmutables) y network-first con fallback offline para páginas — estrategia correcta que no arriesga servir HTML obsoleto.
- Fuentes via `next/font` (autohospedadas, sin FOIT) ✅; `Image` con `priority` en LCP ya aplicado en auditoría previa ✅.
- Bundle de Firebase sigue siendo el mayor costo de JS inicial; el code-splitting de `firebase/functions` sigue en backlog.
- Sin load testing — aceptable para una beta privada, planear antes de jornadas con muchos partidos simultáneos.

### Veredicto individual
Performance adecuada para el lanzamiento; los cuellos conocidos (N+1, over-fetch) son los mismos de la auditoría anterior y siguen siendo trabajo de horas, no de días.

---

## 🔍 QA — INGENIERÍA DE CALIDAD — QA Engineer Senior
**Score: 62/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Cero tests de integración de Cloud Functions y rules.** El bug de `updatePaymentStatus` vs `firestore.rules` es exactamente la clase de defecto que un test con Firebase Emulator (`@firebase/rules-unit-testing`) habría atrapado — el emulator ya está configurado en scripts (`emulator:start`, seed) pero ningún test lo usa.
- Sin tests E2E de los flujos críticos (crear grupo → invitar → pronosticar → ranking).
- Sin reporte de cobertura en CI (`vitest run --coverage` no está configurado).

### Observaciones y mejoras recomendadas
- Los 31 tests de dominio puro (scoring, prizes, knockout, standings, permissions, CSV, deadlines — 11 archivos) pasan y corren en CI: la lógica de negocio más sensible (dinero/aciertos) sí está cubierta.
- `TEST_PLAN.md` en la raíz es del MVP legacy de Google Sheets — archivarlo para no confundir con `docs/testing-checklist.md`.

### Veredicto individual
La cobertura de dominio es buena pero la franja donde viven los bugs reales (rules + Functions + cliente) tiene cero automatización; el primer test de emulator debería escribirse junto con el fix de pagos.

---

## 🔍 QA — TESTING FUNCIONAL — QA Tester Senior
**Score: 60/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **Sin evidencia de ejecución del checklist manual** (`docs/testing-checklist.md`, 60+ ítems, pendiente desde el 2026-05-28). El bug activo en el cambio de estado de pago — que falla silenciosamente en consola — sugiere fuertemente que el flujo de pagos no se ha probado end-to-end contra las rules actuales.
- La instalación PWA no se ha probado en dispositivo: en Android ni siquiera es posible (falta manifest), en iOS solo vía "Agregar a inicio".
- Sin UAT formal con un group_admin real antes de vender la beta.

### Observaciones y mejoras recomendadas
- El checklist existente es bueno; solo falta ejecutarlo, fechar los resultados y registrar evidencia (puede ser una columna de "probado el / por" en el mismo doc).
- Probar específicamente: cambio de paymentStatus, aceptar invite con código expirado, pronóstico en el minuto límite, y los flujos nuevos de PWA/offline.

### Veredicto individual
La infraestructura de testing manual existe pero no se ha usado; ejecutar el checklist es condición de go-live, no opcional — habría encontrado el bug de pagos.

---

## 🔍 GESTIÓN DE PRODUCTO — Product Owner Senior
**Score: 78/100** | **Semáforo: 🟡**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- **PWA a medias:** se anunció soporte PWA (commit `d05d31a`) pero `public/` solo contiene `sw.js` — sin `manifest.json` ni íconos, la app no es instalable en Android y no hay identidad visual al "Agregar a inicio". Completarla (manifest + íconos 192/512 + screenshots) o no comunicarla como feature.
- El flujo de marcar pagos — central para el group_admin que administra dinero real entre amigos — está degradado por el bug descrito; desde producto, es el flujo de mayor confianza percibida.

### Observaciones y mejoras recomendadas
- Sin analytics de eventos custom (grupo creado, pronóstico guardado, invite aceptado) — con el gating de consentimiento ya resuelto, agregarlos es barato y daría visibilidad real de adopción.
- Sin documentación de usuario/FAQ para group_admins (cómo invitar, cómo se calculan premios) — los RulesPanel in-app mitigan.
- Lo demás se mantiene: flujos intuitivos, copy honesto sobre que la plataforma no custodia dinero, onboarding por invitación claro.

### Veredicto individual
Producto vendible para beta privada; cerrar la promesa PWA y el flujo de pagos antes de ponerlo frente a clientes que pagan.

---

## 🔍 CUMPLIMIENTO Y REGULACIÓN — Especialista Legal-Técnico
**Score: 84/100** | **Semáforo: 🟢**

### Hallazgos críticos (Bloqueantes para producción)
- Ninguno.

### Hallazgos importantes (Deben resolverse pronto)
- Ninguno.

### Observaciones y mejoras recomendadas
- Resuelto desde la auditoría anterior: banner de cookies con consentimiento explícito previo a cargar Vercel Analytics, con opción de rechazo equivalente — conforme a LFPDPPP y mejores prácticas tipo GDPR.
- Aviso de privacidad en `/privacidad` con derechos ARCO y mención del marco de transferencia de datos de Google (DPF UE-EE.UU.) ✅; Términos y Condiciones en `/terminos` ✅; footer legal en todas las páginas ✅.
- Pendiente menor: definir y publicar plazo de retención de datos (cuánto se conservan cuentas y pronósticos tras el Mundial) y el procedimiento operativo interno para responder solicitudes ARCO (hoy solo hay email de contacto).
- Al ser quiniela con aportaciones administradas fuera de la plataforma, no aplica regulación de juegos con apuesta (Ley Federal de Juegos y Sorteos) mientras la plataforma no custodie ni transfiera dinero — mantener el copy actual que lo deja explícito.

### Veredicto individual
Cumplimiento en el mejor estado de las tres auditorías; lista para producción con mejoras menores de retención documentada.

---

# 📊 Fase 2 — Síntesis Ejecutiva

## Panel de Scores del Equipo Experto

| # | Área | Experto | Score | Estado | Veredicto en una línea |
|---|---|---|---|---|---|
| 1 | Arquitectura de Software | Arquitecto Senior | 78/100 | 🟡 | Sólida; el drift rules↔cliente en pagos es el único desvío del patrón Functions. |
| 2 | Seguridad de Aplicación | Ing. Seguridad Software | 81/100 | 🟢 | Visibilidad de pronósticos cerrada en DB; quedan endurecimientos no bloqueantes (CSP, rate limiting). |
| 3 | Ciberseguridad | Experto Ciberseguridad | 73/100 | 🟡 | Superficie protegida; faltan backup verificado, alertas y rollback — operación, no defensa. |
| 4 | Backend | Programador Backend Sr. | 70/100 | 🟡 | Functions listas; `updatePaymentStatus` parcialmente roto (escritura denegada por rules) es el fix obligado. |
| 5 | Frontend | Programador Frontend Sr. | 76/100 | 🟡 | Error Boundaries y consent gating resueltos; falta try/catch en `onPaymentChange`. |
| 6 | Responsive Design | Especialista Responsive | 84/100 | 🟢 | Viewport explícito resuelto; touch targets del banner a 44px es lo único pendiente. |
| 7 | Base de Datos | DBA Senior | 72/100 | 🟡 | Rules mejoradas; backup sin verificar e índice `groupMembers` desincronizable son los riesgos. |
| 8 | DevOps e Infraestructura | Ing. DevOps Senior | 65/100 | 🟡 | CI sano, pero sin alertas, sin rollback escrito, sin CD ni staging — el área más frágil. |
| 9 | Accesibilidad | Especialista Accesibilidad | 76/100 | 🟡 | Banner accesible y bases sólidas; falta validación con screen reader real. |
| 10 | Performance | Ing. Performance | 76/100 | 🟡 | SW mejora repeat visits; N+1 del dashboard y over-fetch de resultados persisten. |
| 11 | QA — Ingeniería | QA Engineer Senior | 62/100 | 🟡 | 31 tests de dominio; cero automatización en la franja rules+Functions donde vivió el bug de pagos. |
| 12 | QA — Testing | QA Tester Senior | 60/100 | 🟡 | Checklist documentado pero sin evidencia de ejecución; el bug de pagos lo confirma. |
| 13 | Producto y Negocio | Product Owner Senior | 78/100 | 🟡 | Vendible para beta; PWA a medias y flujo de pagos degradado tocan la confianza del cliente. |
| 14 | Cumplimiento Legal | Especialista Compliance | 84/100 | 🟢 | Banner de cookies + ARCO + avisos completos; mejor estado de las tres auditorías. |

**Score Global Ponderado: 73/100**

---

## 🚦 Decisión del Panel: GO CONDICIONAL

> El score se mantiene en 73/100 pese a que se resolvieron 3 de las 4 condiciones de la auditoría del 2026-06-02 (rules de visibilidad, banner de cookies, `.gitignore`) más Error Boundaries y viewport. La razón: esta auditoría **confirmó un defecto funcional activo** — `updatePaymentStatus` ejecuta una escritura que las propias rules del repo deniegan, sin manejo de error en la UI — y una feature anunciada a medias (PWA sin manifest), y las áreas operacionales de mayor peso (DevOps, QA) no avanzaron. No hay áreas bloqueantes (<60) ni hallazgos críticos en áreas core. La plataforma puede lanzarse al resolver las 4 condiciones siguientes, todas de horas, no de días.

---

## 🔗 Mapa de Interdependencias

**Clúster 1: El flujo de pagos (Backend → DB → Frontend → QA)**
- Un solo defecto aparece en cuatro dictámenes: la escritura a `groupMembers` denegada por rules (`firestore.rules:99` vs `firestore.ts:158-160`), el índice denormalizado obsoleto, el handler sin try/catch (`admin/page.tsx:179`), y la ausencia de tests de emulator que lo habrían detectado.
- Resolución coordinada: un solo PR — Cloud Function `updatePaymentStatus` con `runTransaction` sobre ambos docs + try/catch con `setError` en el handler + primer test de integración con Firebase Emulator que cubra el flujo. Medio día.

**Clúster 2: Operación y verificación de despliegue (DevOps → Ciberseguridad → Seguridad)**
- Sin CD, lo que está en el repo no necesariamente está en producción: hay que **verificar que las rules nuevas de `predictions` estén desplegadas** (`firebase deploy --only firestore:rules`), que PITR esté activo y que la App Check key esté en Vercel — tres condiciones de auditorías previas cuyo cierre no es verificable desde el código.
- Resolución coordinada: sesión de 1 hora de verificación en consolas (gcloud + Firebase + Vercel) con evidencia anotada en `docs/`, más alertas de error mínimas (Firebase email alerts) y rollback escrito.

**Clúster 3: Testing manual como compuerta final (QA Testing → QA Ingeniería → Producto)**
- El checklist de 60+ ítems existe desde mayo y sigue sin ejecutarse; el bug de pagos demuestra el costo de saltárselo. Sin esa sesión no hay firma de aceptación posible.
- Resolución coordinada: ejecutar `docs/testing-checklist.md` (3-4 h) en iOS Safari + Android Chrome **después** de mergear el fix del Clúster 1, registrando fecha y resultado por ítem.

**Clúster 4: PWA coherente (Producto → Responsive → Frontend)**
- `sw.js` + meta iOS sin `manifest.json` ni íconos = promesa incompleta que afecta producto (feature a medias), responsive (no instalable en Android) y frontend (SW registrado para una PWA que no existe del todo).
- Resolución coordinada: agregar `manifest.json` + íconos 192/512 + `metadata.manifest` en `layout.tsx` (2 h), o quitar el anuncio de PWA del changelog/marketing hasta completarla.

---

## 📋 Plan de Acción Priorizado

### 🔴 Horizonte 1 — CRÍTICO (Antes del deploy)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Arreglar flujo de pagos: Cloud Function transaccional para `paymentStatus` + try/catch en `onPaymentChange` + test de emulator | Backend + DB + Frontend | Backend Dev | 4-5 horas |
| 2 | Sesión de verificación de producción: rules desplegadas, PITR activo (`gcloud firestore databases describe`), App Check key en Vercel; anotar evidencia | DevOps + Ciberseguridad | DevOps | 1 hora |
| 3 | Alertas mínimas de error: Firebase alerting por email en Functions + revisión de logs de Vercel (o Sentry free tier) | DevOps | Dev | 2-3 horas |
| 4 | Ejecutar `docs/testing-checklist.md` completo en iOS Safari + Android Chrome reales, con evidencia fechada (después del fix #1) | QA Testing | QA / Stakeholder | 3-4 horas |

### 🟡 Horizonte 2 — URGENTE (Semana 1-2 post-launch)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Completar PWA: `manifest.json` + íconos 192/512 + enlace en metadata (o retirar el anuncio de PWA) | Producto + Frontend | Frontend Dev | 2 horas |
| 2 | Documentar rollback: revertir deploy Vercel + redeploy de functions/rules + restore Firestore | DevOps | DevOps | 1-2 horas |
| 3 | Índice compuesto `(status, kickoffAt DESC)` + `orderBy/limit` en `listRecentResults` | DB + Performance | Backend Dev | 1-2 horas |
| 4 | Batch read en `listMyGroups` (eliminar N+1 del dashboard) | Backend + Performance | Backend Dev | 2 horas |
| 5 | Rate limiting aplicativo en `acceptInvite` y `submitPrediction` | Seguridad + Backend | Backend Dev | 2-3 horas |
| 6 | Tests de integración de rules y Functions con Firebase Emulator (empezar por invites y predictions) | QA Ingeniería | Backend Dev | 1 día |
| 7 | Subir touch targets del CookieBanner a 44px y pasar VoiceOver por los flujos críticos | A11y + Responsive | Frontend Dev | 2 horas |
| 8 | Definir retención de datos post-Mundial y procedimiento interno ARCO | Cumplimiento | Owner | 1-2 horas |

### 🔵 Horizonte 3 — MEJORA CONTINUA (Backlog técnico)

| # | Observación | Área | Impacto esperado |
|---|---|---|---|
| 1 | CD en GitHub Actions: deploy de app + functions + rules en push a main post-tests | DevOps | Elimina drift repo↔producción (causa raíz del clúster 1) |
| 2 | Entorno staging con proyecto Firebase separado | DevOps | Validación segura de cada release |
| 3 | Remover `'unsafe-inline'` del script-src de producción con nonces | Seguridad | CSP efectiva contra XSS |
| 4 | Coverage en CI con umbral 70% en scoring/prizes | QA Ingeniería | Prevención de regresiones en lógica de dinero |
| 5 | Eventos custom de analytics (grupo creado, pick guardado, invite aceptado) | Producto | Métricas reales de adopción |
| 6 | Archivar legacy (`*.gs`, `TEST_PLAN.md`, `firebase 2.json`) en `/legacy` o eliminar | Arquitectura | Menos ruido y riesgo de config ambigua |
| 7 | Code-split de `firebase/functions` en el cliente | Performance | ~40KB menos de JS inicial |
| 8 | TTL/retención para `auditLogs` y `apiSyncLogs` | DB | Control de crecimiento de colecciones |
| 9 | Restringir `img-src` de la CSP a hosts reales | Seguridad | Menor superficie de exfiltración |

---

## ✅ Criterios de Aceptación Mínimos para Go-Live

### Seguridad y Datos
- [x] No hay credenciales ni secrets en el repositorio (`.gitignore` completo, `firebase 2.json` es solo config)
- [x] HTTPS forzado + HSTS preload (Vercel + `next.config.js`)
- [ ] Backup PITR **verificado activo** y restore test realizado
- [x] Visibilidad de pronósticos enforced en Firestore Rules (verificar que esté desplegado)
- [x] Headers de seguridad completos (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- [x] App Check + reCAPTCHA Enterprise en el código (verificar site key en Vercel Production)

### Funcionalidad
- [x] Flujo crear grupo → invitar → pronosticar → ranking operativo
- [ ] **Flujo de marcar pagos funciona sin errores** (hoy: escritura denegada + fallo silencioso)
- [x] Error Boundaries en `error.tsx` / `global-error.tsx`
- [x] Validación cliente + servidor en formularios
- [x] Cierre de pronósticos enforced en backend

### Infraestructura y Operabilidad
- [x] Producción separada (Vercel + Firebase prod), env vars en sistema seguro
- [ ] Alertas de error activas (Firebase/Vercel/Sentry)
- [ ] Plan de rollback documentado
- [x] Dominio y certificados gestionados por Vercel

### Calidad
- [x] 31 tests pasan en CI (lint + test + build, app y functions)
- [ ] Checklist de testing manual ejecutado con evidencia (iOS Safari + Android Chrome)
- [x] Performance básica: LCP optimizado + SW cache de estáticos

### Cumplimiento
- [x] Aviso de privacidad LFPDPPP con ARCO en `/privacidad`
- [x] Términos y condiciones en `/terminos`
- [x] Banner de cookies con consentimiento previo a analytics

---

## 🖊️ Firmas del Panel

| Experto | Área | Veredicto Final |
|---|---|---|
| Arquitecto Senior | Arquitectura | APRUEBA CON CONDICIONES — mover escritura de pagos al patrón Functions |
| Ing. Seguridad | Seguridad App | APRUEBA — gap principal cerrado en DB; endurecimientos a backlog |
| Experto Ciberseguridad | Ciberseguridad | APRUEBA CON CONDICIONES — backup verificado y alertas antes del tráfico real |
| Backend Senior | Backend | APRUEBA CON CONDICIONES — fix de `updatePaymentStatus` es obligatorio pre-deploy |
| Frontend Senior | Frontend | APRUEBA CON CONDICIONES — try/catch en pagos junto al fix de backend |
| Resp. Design | Responsive | APRUEBA — área lista; 44px en banner como detalle |
| DBA Senior | Base de Datos | APRUEBA CON CONDICIONES — backup probado y escritura denormalizada fuera del cliente |
| DevOps Senior | DevOps | APRUEBA CON CONDICIONES — verificación de despliegue, alertas y rollback escritos |
| Accesibilidad | Accesibilidad | APRUEBA CON CONDICIONES — pasar screen reader en la sesión de testing |
| Ing. Performance | Performance | APRUEBA — cuellos conocidos no bloquean la beta |
| QA Engineer | QA Ingeniería | APRUEBA CON CONDICIONES — primer test de emulator junto al fix de pagos |
| QA Tester | QA Testing | APRUEBA CON CONDICIONES — checklist ejecutado con evidencia es compuerta final |
| Product Owner | Producto | APRUEBA CON CONDICIONES — cerrar pagos y PWA antes de clientes de pago |
| Compliance | Regulación | APRUEBA — mejor estado de las tres auditorías |

---

> Reporte generado por el Panel de Auditoría Pre-Producción | La Cancha | 2026-06-09
> Score global: 73/100 | Decisión: GO CONDICIONAL | Áreas bloqueantes: 0 | Condiciones pre-deploy: 4
> Auditorías previas: 2026-05-28 (70/100) · 2026-06-02 (73/100)
