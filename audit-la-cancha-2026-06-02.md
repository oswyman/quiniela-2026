---
proyecto: La Cancha — Quinielas Privadas Mundial 2026
fecha: 2026-06-02
score_global: 73/100
decision: GO CONDICIONAL
expertos: 14
areas_bloqueantes: 0
---

# Reporte de Auditoría Pre-Producción
## La Cancha — 2026-06-02

> **Stack auditado:** Next.js 14 (App Router) + Firebase (Firestore, Auth, Cloud Functions v2) + TypeScript + CSS Custom Properties + Motion + Vercel
> **Tipo:** Plataforma de quinielas privadas, audiencia mexicana, contexto deportivo
> **Datos sensibles:** nombre, email, pronósticos deportivos. Sin datos financieros directos (plataforma no custodia dinero).

---

## 📊 Panel de Scores del Equipo Experto

| # | Área | Experto | Score | Estado | Veredicto en una línea |
|---|---|---|---|---|---|
| 1 | Arquitectura de Software | Arquitecto Senior | 80/100 | 🟢 | Sólida. N+1 en listMyGroups y falta transacción en updatePaymentStatus son los únicos puntos de riesgo. |
| 2 | Seguridad de Aplicación | Ing. Seguridad Software | 74/100 | 🟡 | App Check + headers completos; la visibilidad de pronósticos se enforcea solo en UI, no en Firestore Rules. |
| 3 | Ciberseguridad | Experto Ciberseguridad | 72/100 | 🟡 | Firebase gestiona la infraestructura; monitoreo y backup documentado son los gaps operacionales urgentes. |
| 4 | Backend | Programador Backend Sr. | 76/100 | 🟡 | Validación exhaustiva en Cloud Functions; updatePaymentStatus sin transacción es el riesgo principal. |
| 5 | Frontend | Programador Frontend Sr. | 74/100 | 🟡 | Buena calidad; ausencia de Error Boundaries de React es el mayor riesgo de UX. |
| 6 | Responsive Design | Especialista Responsive | 82/100 | 🟢 | Touch targets correctos, mobile fallbacks completos, dvh aplicado. Meta viewport no declarado explícitamente. |
| 7 | Base de Datos | DBA Senior | 74/100 | 🟡 | Firestore bien modelado; sin backup documentado y 2 escrituras no atómicas en payment status. |
| 8 | DevOps e Infraestructura | Ing. DevOps Senior | 65/100 | 🟡 | CI funcional pero sin CD, sin staging, sin monitoreo. El área más frágil operacionalmente. |
| 9 | Accesibilidad | Especialista Accesibilidad | 74/100 | 🟡 | Buena base (skip link, labels, reduced-motion); falta Error Boundary accesible y test con screen reader. |
| 10 | Performance | Ing. Performance | 76/100 | 🟡 | LCP mejorado con Image priority; bundle Firebase y N+1 en dashboard son los cuellos de botella. |
| 11 | QA — Ingeniería | QA Engineer Senior | 62/100 | 🟡 | 31 tests de dominio puro, cero tests de Cloud Functions ni E2E. Cobertura insuficiente. |
| 12 | QA — Testing | QA Tester Senior | 60/100 | 🟡 | Sin plan de testing documentado, sin UAT formal, sin evidencia de pruebas en dispositivo real. |
| 13 | Producto y Negocio | Product Owner Senior | 80/100 | 🟢 | Producto funcional, copy honesto, flujos intuitivos. Falta métricas y documentación de usuario. |
| 14 | Cumplimiento Legal | Especialista Compliance | 76/100 | 🟡 | Aviso de privacidad y T&C presentes; falta banner de cookies y mecanismo ARCO en UI. |

**Score Global Ponderado: 73/100**

---

## 🚦 Decisión del Panel: GO CONDICIONAL

El panel concluye GO CONDICIONAL con score global de 73/100. No hay áreas bloqueantes (score < 60) ni hallazgos críticos en las áreas de seguridad, base de datos o backend. La plataforma puede lanzarse si se resuelven en los próximos 7 días: (1) la visibilidad de pronósticos a nivel de Firestore Rules, (2) monitoreo básico de producción, y (3) el banner de cookies. El resto de los hallazgos importantes son post-launch pero deben quedar en backlog activo.

---

## 🔗 Mapa de Interdependencias

**Clúster 1: Integridad de datos y confianza**
- Seguridad App → Base de Datos: la visibilidad de pronósticos requiere ajuste en `firestore.rules` (`/predictions`) para respetar el campo `predictionVisibility` del grupo antes de permitir la lectura.
- Backend → Base de Datos: `updatePaymentStatus` necesita `runTransaction` para mantener consistencia entre `groups/{id}/members/{uid}` y `groupMembers/{id}_{uid}`.
- Resolución coordinada: un PR que toque `firestore.rules` + un refactor de `updatePaymentStatus` a Cloud Function con transacción. Trabajo de un día.

**Clúster 2: Observabilidad y operación**
- DevOps → QA Ingeniería: sin CD ni entorno staging, los tests no tienen ambiente equivalente a producción donde ejecutarse.
- DevOps → Ciberseguridad: sin monitoreo no hay detección de anomalías ni incidentes.
- Resolución coordinada: activar Vercel Analytics + Sentry en una tarde. CD puede venir en sprint 2.

**Clúster 3: Testing y calidad funcional**
- QA Ingeniería → QA Testing: la ausencia de E2E tests hace que el testing funcional dependa 100% de ejecución manual.
- QA Testing → Producto: sin UAT documentado no hay firma de aceptación formal.
- Resolución coordinada: una sesión de testing manual exhaustivo (4-6 horas) con checklist antes del go-live. Tests E2E son post-launch.

**Clúster 4: Performance y escala**
- Performance → Base de Datos: `listMyGroups` N+1 y `listRecentResults` over-fetch comparten la misma raíz (falta de índices compuestos y batch reads).
- Resolución coordinada: un índice compuesto `(status, kickoffAt DESC)` en Firestore + refactor de `listMyGroups` a batch read.

---

## 📋 Plan de Acción Priorizado

### 🔴 Horizonte 1 — CRÍTICO (Antes del deploy)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Firestore Rules: agregar lógica de `predictionVisibility` en `match /predictions` para bloquear lectura de picks ajenos antes del cierre si el grupo tiene `predictionVisibility = "AFTER_CLOSE"` | Seguridad + DB | Backend Dev | 3-4 horas |
| 2 | Activar monitoreo de producción: Vercel Analytics + Sentry (o equivalente) con alertas de error rate > 1% | DevOps | DevOps / Dev | 2-3 horas |
| 3 | Agregar banner de cookies / aviso de tracking con aceptación antes de cargar Firebase Analytics | Cumplimiento | Frontend Dev | 2 horas |
| 4 | Agregar `.env.local.test` a `.gitignore` para evitar commit accidental de credenciales | Ciberseguridad | Dev | 5 min |

### 🟡 Horizonte 2 — URGENTE (Semana 1-2 post-launch)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Refactorizar `updatePaymentStatus` a Cloud Function con `runTransaction` | Backend + DB | Backend Dev | 2-3 horas |
| 2 | Agregar índice compuesto `(status, kickoffAt DESC)` en Firestore + refactorizar `listRecentResults` con `orderBy` + `limit` | DB + Performance | Backend Dev | 1-2 horas |
| 3 | Refactorizar `listMyGroups` con `getAll` (batch read) en lugar de N `getDoc` independientes | Backend + Performance | Backend Dev | 2 horas |
| 4 | Implementar Error Boundaries de React en páginas protegidas (`/dashboard`, `/groups/[id]/*`) | Frontend + Accesibilidad | Frontend Dev | 2-3 horas |
| 5 | Configurar backup automático de Firestore (Scheduled Export a Cloud Storage) y documentar proceso de restore | Ciberseguridad + DB | DevOps | 1-2 horas |
| 6 | Documentar rollback plan: paso a paso para revertir deploy en Vercel + restaurar backup de Firestore | DevOps | DevOps / Dev | 1 hora |
| 7 | Sesión de testing funcional manual exhaustivo: flujos críticos en iOS Safari + Android Chrome reales | QA Testing | QA / Stakeholder | 4-6 horas |
| 8 | Declarar `viewport` explícitamente en `layout.tsx`: `export const viewport: Viewport = { width: "device-width", initialScale: 1 }` | Responsive | Frontend Dev | 15 min |

### 🔵 Horizonte 3 — MEJORA CONTINUA (Backlog técnico)

| # | Observación | Área | Impacto esperado |
|---|---|---|---|
| 1 | Agregar pipeline de CD a GitHub Actions: deploy a Vercel en push a main (post-tests) | DevOps | Reproducibilidad de deploys, menor riesgo humano |
| 2 | Agregar entorno staging en Vercel con proyecto Firebase separado | DevOps | Validación pre-producción de cada release |
| 3 | Agregar `coverage` a Vitest en CI: `vitest run --coverage` + umbral 70% en scoring/prizes | QA Ingeniería | Visibilidad de cobertura real, prevención de regresiones |
| 4 | Agregar tests de integración para Cloud Functions con Firebase Emulator | QA Ingeniería | Detectar bugs en el pipeline de datos antes de producción |
| 5 | Mecanismo ARCO en UI: formulario de solicitud o enlace prominente en aviso de privacidad | Cumplimiento | Cumplimiento más completo de LFPDPPP |
| 6 | OG metadata con imagen de preview (`og:image`, Twitter Cards) en `layout.tsx` | Producto + Accesibilidad | Mejor experiencia al compartir enlace en WhatsApp/redes |
| 7 | Agregar tooltips de ayuda en admin de grupo (configuración de visibilidad, reglas de premio, límite de participantes) | Producto | Reducir fricción de onboarding para nuevos admins |
| 8 | Configurar Vercel Analytics con eventos custom: pronóstico guardado, grupo creado, invite aceptado | Producto | Métricas de uso reales para decisiones de producto |
| 9 | Code-split módulos de Firebase para reducir bundle inicial: importar `firebase/functions` solo cuando sea necesario | Performance | Reducir ~40KB del bundle inicial |

---

## ✅ Criterios de Aceptación Mínimos para Go-Live

### Seguridad y Datos
- [ ] Firestore Rules actualizado: `predictionVisibility = "AFTER_CLOSE"` bloquea lectura de picks ajenos antes del cierre
- [x] HTTPS activo y forzado (Vercel maneja automáticamente)
- [ ] Backup de Firestore configurado y probado con restore test
- [x] Datos personales protegidos — aviso de privacidad LFPDPPP presente
- [x] Headers de seguridad HTTP configurados (CSP, HSTS, X-Frame-Options)
- [x] Firebase App Check + reCAPTCHA Enterprise activo

### Funcionalidad
- [x] Flujo crear grupo → invitar → pronosticar → ver ranking funciona sin errores
- [x] Cierre de pronósticos 90 min antes del kickoff enforceado en backend
- [x] Manejo de errores implementado en frontend (StatusMessage, Toast, retry)
- [x] Formularios validados en cliente y servidor (Cloud Functions)
- [ ] Error Boundaries de React implementados en páginas protegidas

### Infraestructura y Operabilidad
- [x] Entorno de producción separado (Vercel + Firebase prod)
- [x] Variables de entorno en sistema seguro (Vercel Environment Variables / `.env.local` fuera del repo)
- [ ] Monitoreo de uptime activo con alertas (Sentry / Vercel Analytics)
- [ ] Plan de rollback documentado y comunicado al equipo
- [x] Dominio y certificados SSL vigentes (Vercel gestiona)

### Calidad
- [x] Suite de tests (31) pasa en CI (lint + test + build en GitHub Actions)
- [ ] Testing funcional manual de flujos principales en iOS Safari + Android Chrome completado
- [x] Performance básica: LCP < 2.5s con Image priority + CDN Vercel

### Cumplimiento
- [x] Aviso de privacidad LFPDPPP accesible en `/privacidad`
- [x] Términos y condiciones accesibles en `/terminos`
- [ ] Banner de cookies con aceptación antes de cargar tracking analytics
- [ ] `.env.local.test` en `.gitignore`

---

## 🖊️ Firmas del Panel

| Experto | Área | Veredicto Final |
|---|---|---|
| Arquitecto Senior | Arquitectura | APRUEBA CON CONDICIONES — N+1 y transacción de payments deben resolverse pronto |
| Ing. Seguridad | Seguridad App | APRUEBA CON CONDICIONES — Firestore Rules de predictions debe corregirse antes del deploy |
| Experto Ciberseguridad | Ciberseguridad | APRUEBA CON CONDICIONES — Monitoreo y backup son requisitos operacionales no negociables |
| Backend Senior | Backend | APRUEBA CON CONDICIONES — updatePaymentStatus sin transacción es riesgo de datos real |
| Frontend Senior | Frontend | APRUEBA CON CONDICIONES — Error Boundaries requeridos en semana 1 post-launch |
| Resp. Design | Responsive | APRUEBA — Excelente trabajo responsive, hallazgos son menores |
| DBA Senior | Base de Datos | APRUEBA CON CONDICIONES — Backup y transacción de payments antes o justo después del launch |
| DevOps Senior | DevOps | APRUEBA CON CONDICIONES — Monitoreo es requisito pre-launch; CD y staging para sprint 2 |
| Accesibilidad | Accesibilidad | APRUEBA CON CONDICIONES — Error Boundary accesible y test con VoiceOver post-launch |
| Ing. Performance | Performance | APRUEBA — Performance aceptable para lanzamiento; optimizaciones de bundle son backlog |
| QA Engineer | QA Ingeniería | APRUEBA CON CONDICIONES — Testing manual exhaustivo debe completarse antes del go-live |
| QA Tester | QA Testing | APRUEBA CON CONDICIONES — UAT mínimo de 4 horas con checklist de flujos críticos requerido |
| Product Owner | Producto | APRUEBA — Producto funcional y honesto. Métricas post-launch son prioritarias |
| Compliance | Regulación | APRUEBA CON CONDICIONES — Banner de cookies y mecanismo ARCO antes del lanzamiento público |

---

> Reporte generado por el Panel de Auditoría Pre-Producción | La Cancha | 2026-06-02
> Score global: 73/100 | Decisión: GO CONDICIONAL | Áreas bloqueantes: 0 | Condiciones pre-deploy: 4
