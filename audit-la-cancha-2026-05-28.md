---
proyecto: La Cancha — Quinielas Privadas Mundial 2026
fecha: 2026-05-28
score_global: 70/100
decision: GO CONDICIONAL
expertos: 14
areas_bloqueantes: 2
---

# Reporte de Auditoría Pre-Producción
## La Cancha — Quinielas Privadas Mundial 2026 — 2026-05-28

---

## 📊 Panel de Scores del Equipo Experto

| # | Área | Experto | Score | Estado | Veredicto en una línea |
|---|---|---|---|---|---|
| 1 | Arquitectura de Software | Arquitecto Senior | 72/100 | 🟡 | Patrones correctos, admin monolítico y N+1 a resolver pronto |
| 2 | Seguridad de Aplicación | Ing. Seguridad Software | 77/100 | 🟡 | Headers excelentes, Firestore rules sólidas; rate limiting faltante |
| 3 | Ciberseguridad | Experto Ciberseguridad | 66/100 | 🟡 | Infra managed reduce riesgo; backup de Firestore no configurado (bloqueante) |
| 4 | Backend | Programador Backend Sr. | 78/100 | 🟡 | Validación y atomicidad correctas; batch sin límite de 500 docs |
| 5 | Frontend | Programador Frontend Sr. | 74/100 | 🟡 | Código limpio, cero console.logs; falta error boundaries |
| 6 | Responsive Design | Especialista Responsive | 78/100 | 🟡 | Flujos principales ok; admin en mobile sin verificar |
| 7 | Base de Datos | DBA Senior | 73/100 | 🟡 | Índices definidos, rules impecables; backup faltante es bloqueante |
| 8 | DevOps e Infraestructura | Ing. DevOps Senior | 65/100 | 🟡 | CI funcional, deploy manual; sin monitoreo ni rollback documentado |
| 9 | Accesibilidad | Especialista Accesibilidad | 74/100 | 🟡 | Base sólida; falta skip-nav y verificación de focus traps |
| 10 | Performance | Ing. Performance | 71/100 | 🟡 | Next.js defaults buenos; admin carga todo en mount |
| 11 | QA — Ingeniería | QA Engineer Senior | 62/100 | 🟡 | Unit tests de lógica crítica presentes; sin tests de Cloud Functions ni E2E |
| 12 | QA — Testing | QA Tester Senior | 55/100 | 🔴 | Sin plan de testing documentado, sin UAT, sin pruebas de flujos completos |
| 13 | Producto y Negocio | Product Owner Senior | 79/100 | 🟡 | Producto claro y bien comunicado; falta guía para admins y métricas |
| 14 | Cumplimiento Legal | Especialista Compliance | 42/100 | 🔴 | Sin Aviso de Privacidad, sin T&C, sin mecanismo ARCO — riesgo legal activo |

**Score Global Ponderado: 70/100**

---

## 🚦 Decisión del Panel: GO CONDICIONAL

> La plataforma tiene una base técnica sólida y madura para su scope: seguridad de aplicación bien configurada, Firestore rules impecables, lógica de negocio con cobertura de tests unitarios y CI funcional. El score global de 70/100 refleja una plataforma casi lista, con dos áreas que no pueden entrar a producción en su estado actual: **Cumplimiento legal** (sin Aviso de Privacidad bajo LFPDPPP — riesgo jurídico inmediato) y **QA Testing** (sin registro de pruebas funcionales ni UAT para una plataforma que maneja dinero de quinielas). Ambos problemas son resolubles en menos de 5 días de trabajo focalizado.

---

## 🔗 Mapa de Interdependencias

**Clúster 1: Seguridad y Backup (Seguridad App + Ciberseguridad + Base de Datos)**
- Ciberseguridad → Base de Datos: La ausencia de backups de Firestore es compartida — una sola tarea de configurar Cloud Scheduler + export a GCS resuelve ambas áreas.
- Seguridad → Backend: El rate limiting faltante aplica en la capa de Cloud Functions — resolver en funciones críticas (submitPrediction, acceptInvite) impacta ambos scores.
- Resolución coordinada: Un sprint de 1 día: configurar backup automático de Firestore + rate limiting básico en 2 funciones.

**Clúster 2: Calidad y Confianza (QA Ingeniería + QA Testing + DevOps)**
- DevOps → QA: El pipeline de CI compila Cloud Functions pero no las testea. Agregar tests de funciones al pipeline resuelve parcialmente ambas áreas.
- QA Ingeniería → QA Testing: Los tests unitarios existentes son la base para construir un plan de regresión funcional documentado.
- Resolución coordinada: Escribir tests para submitPrediction y updateGroupRankingInternal, ejecutarlos en CI, y documentar un checklist de testing manual de 10 flujos críticos.

**Clúster 3: Arquitectura y Frontend (Arquitectura + Frontend + Performance)**
- Arquitectura → Frontend: El admin monolítico afecta los tres — dividir en componentes por tab resuelve cohesión, reduce tiempo de carga y facilita testing.
- Performance → Base de Datos: Admin carga todo en mount + N+1 en listMyGroups — resolver en conjunto optimizando queries y usando lazy load por sección.
- Resolución coordinada: Refactorizar admin page en Horizonte 2 (post-launch), no bloquea el go-live.

**Clúster 4: Legal (Cumplimiento + Producto)**
- Cumplimiento → Producto: El Product Owner necesita coordinar con un abogado para redactar el Aviso de Privacidad y los T&C en lenguaje claro para el usuario.
- Resolución coordinada: 1 día de redacción legal + 1 día de implementación (página /privacidad, /terminos, footer links).

---

## 📋 Plan de Acción Priorizado

### 🔴 Horizonte 1 — CRÍTICO (Antes del deploy)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Configurar backup automático de Firestore (Cloud Scheduler → export a GCS, retención 30 días) | Ciberseguridad / DB | DevOps / Platform Admin | 2–4 horas |
| 2 | Crear página /privacidad con Aviso de Privacidad conforme a LFPDPPP | Cumplimiento | Desarrollador + Abogado | 4–8 horas |
| 3 | Crear página /terminos con Términos y Condiciones básicos | Cumplimiento | Desarrollador + Abogado | 2–4 horas |
| 4 | Agregar mecanismo de derechos ARCO (email de contacto visible en Aviso de Privacidad) | Cumplimiento | Desarrollador | 1 hora |
| 5 | Ejecutar testing funcional manual documentado de 10 flujos críticos con checklist | QA Testing | QA / Desarrollador | 4–6 horas |
| 6 | Garantizar NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY configurada en Vercel producción | Seguridad | DevOps | 30 minutos |

### 🟡 Horizonte 2 — URGENTE (Semana 1–2 post-launch)

| # | Hallazgo | Área | Responsable sugerido | Esfuerzo estimado |
|---|---|---|---|---|
| 1 | Agregar rate limiting en submitPrediction y acceptInvite | Seguridad / Backend | Backend Dev | 3–5 horas |
| 2 | Implementar error.tsx en rutas principales (/groups/[groupId], /admin) | Frontend / Arquitectura | Frontend Dev | 2 horas |
| 3 | Agregar skip-navigation link en layout.tsx apuntando a #main-content | Accesibilidad | Frontend Dev | 1 hora |
| 4 | Configurar alertas de error en Firebase + Vercel | DevOps | DevOps | 2 horas |
| 5 | Escribir tests de submitPrediction y updateGroupRankingInternal con Firebase Emulator | QA Ingeniería | Backend Dev | 4–8 horas |
| 6 | Documentar rollback procedure para Vercel y Firebase Functions | DevOps | DevOps | 1 hora |
| 7 | Corregir listRecentResults para usar índice compuesto (status + kickoffAt desc) | DB / Performance | Backend Dev | 1 hora |
| 8 | Remover unsafe-inline de production CSP usando nonces de Next.js 14 | Seguridad | Frontend Dev | 4–6 horas |

### 🔵 Horizonte 3 — MEJORA CONTINUA (Backlog técnico)

| # | Observación | Área | Impacto esperado |
|---|---|---|---|
| 1 | Refactorizar admin page en componentes por tab con lazy loading | Arquitectura / Performance | Admin 3x más rápido, testing posible por sección |
| 2 | Agregar límite de 500 docs en batches de Cloud Functions con chunking | Backend | Previene crash en grupos con 240+ participantes |
| 3 | Optimizar listMyGroups para eliminar N+1 | DB / Performance | Dashboard 2x más rápido con 5+ grupos |
| 4 | Configurar Vitest coverage reporting y umbral mínimo 70% | QA Ingeniería | Visibilidad de cobertura real |
| 5 | Implementar Playwright E2E para 5 flujos críticos | QA Ingeniería / QA Testing | Detección de regressions en CI |
| 6 | Agregar sección de ayuda para administradores de grupo | Producto | Reducción de soporte manual |
| 7 | Implementar métricas de producto (Firebase Analytics events) | Producto | Datos para mejoras post-Mundial |
| 8 | Agregar breakpoint 1024px para tablet landscape | Responsive | Experiencia mejorada en iPad |

---

## ✅ Criterios de Aceptación Mínimos para Go-Live

### Seguridad y Datos
- [x] No hay credenciales ni secrets en el repositorio
- [x] HTTPS activo y forzado en toda la plataforma
- [ ] Backup de base de datos configurado y probado — PENDIENTE
- [ ] Datos personales protegidos conforme a LFPDPPP — PENDIENTE
- [x] Headers de seguridad HTTP configurados
- [ ] AppCheck activo en producción — PENDIENTE (verificar env var)

### Funcionalidad
- [ ] Todos los flujos críticos de usuario funcionan sin errores — no documentado
- [ ] Manejo de errores implementado — parcial (sin error boundaries)
- [x] Formularios validados en cliente y servidor

### Infraestructura y Operabilidad
- [x] Entorno de producción configurado separado de staging
- [x] Variables de entorno en sistema seguro
- [ ] Monitoreo de uptime activo con alertas — PENDIENTE
- [ ] Plan de rollback documentado y probado — PENDIENTE
- [x] Dominio y certificados SSL vigentes

### Calidad
- [x] Suite de tests críticos pasa en CI
- [ ] Testing funcional de flujos principales completado y documentado — PENDIENTE
- [ ] Performance básica verificada (LCP menor a 4s en mobile) — no medido

---

## 🖊️ Firmas del Panel

| Experto | Área | Veredicto Final |
|---|---|---|
| Arquitecto Senior | Arquitectura | APRUEBA CON CONDICIONES — Añadir error boundaries antes de go-live |
| Ing. Seguridad | Seguridad App | APRUEBA CON CONDICIONES — AppCheck obligatorio y rate limiting en semana 1 |
| Experto Ciberseguridad | Ciberseguridad | APRUEBA CON CONDICIONES — Backup de Firestore configura antes de activar usuarios reales |
| Backend Senior | Backend | APRUEBA CON CONDICIONES — Chunking de batch en grupos grandes, mejora post-launch |
| Frontend Senior | Frontend | APRUEBA CON CONDICIONES — Error boundaries deben implementarse antes del lanzamiento |
| Resp. Design | Responsive | APRUEBA — Flujos principales mobile funcionan correctamente |
| DBA Senior | Base de Datos | APRUEBA CON CONDICIONES — Backup es bloqueante, el resto es mejora continua |
| DevOps Senior | DevOps | APRUEBA CON CONDICIONES — Monitoreo y rollback doc en semana 1 post-launch |
| Accesibilidad | Accesibilidad | APRUEBA CON CONDICIONES — Skip-nav y verificación de focus traps en semana 1 |
| Ing. Performance | Performance | APRUEBA — Performance suficiente para volumen esperado en lanzamiento |
| QA Engineer | QA Ingeniería | APRUEBA CON CONDICIONES — Tests de Cloud Functions requeridos en semana 1 |
| QA Tester | QA Testing | NO APRUEBA — Requiere checklist de testing funcional documentado antes del deploy |
| Product Owner | Producto | APRUEBA — Producto listo funcionalmente, guía para admins en backlog |
| Compliance | Regulación | NO APRUEBA — Aviso de Privacidad y T&C obligatorios antes de recolectar datos |

---
Reporte generado por el Panel de Auditoría Pre-Producción | 2026-05-28
