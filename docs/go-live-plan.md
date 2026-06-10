# Plan de Ejecución Go-Live — La Cancha
**Fecha:** 2026-06-09 (noche, post-incidente) · **Base:** `audit-la-cancha-2026-06-09.md` (73/100, GO CONDICIONAL)

---

## 1. Revisión — qué cambió desde el reporte de la mañana

| Ítem del audit | Estado en el reporte | Estado REAL ahora |
|---|---|---|
| Backup PITR + Delete Protection | ⬜ Por verificar | ✅ **Activado y verificado** (PITR 7 días) |
| Rules de `predictionVisibility` | ✅ "Resuelto en código" | 🔴 **REABIERTO** — desplegarla causó el incidente de hoy (rompió `listPredictions`); revertida en prod y en repo (`1609999`). Requiere rediseño, no redeploy |
| Fix flujo de pagos (código) | 🔴 Por hacer | ✅ Hecho, verificado, commiteado (`98de817`) |
| Fix flujo de pagos (producción) | — | 🔴 **URGENTE**: Vercel ya desplegó el frontend que llama al callable `updatePaymentStatus`, pero la function NO está desplegada → el cambio de estado de pago falla por completo en prod |
| Rules desplegadas = repo | ⬜ Por verificar | ✅ Verificado (ruleset `fca9c9c5` = repo) |
| App Check key en Vercel | ⬜ Por verificar | ⬜ Pendiente |
| Alertas de error | ⬜ | ⬜ Pendiente |
| Checklist manual | ⬜ | ⬜ Pendiente |
| 🆕 Bug de enmascaramiento de errores | — | 🆕 Detectado en el incidente: en `predictions/page.tsx` el guard `!group` (L183) corre antes que `loadError` (L205) → errores de permisos se muestran como "Grupo no encontrado" |

**Bloqueo operativo:** el deploy local de functions falla porque la máquina está en swap pesado (6.5/8 GB; firebase CLI hace OOM/timeout). Se resuelve liberando RAM o reiniciando.

---

## 2. Plan de ejecución

### 🔴 Fase A — Restaurar prod completo (HOY, ~30 min)

| # | Acción | Cómo | Tiempo |
|---|---|---|---|
| A1 | Liberar memoria del equipo | Cerrar apps pesadas / reiniciar / `sudo purge` | 5 min |
| A2 | **Deploy de `updatePaymentStatus`** | `NODE_OPTIONS="--max-old-space-size=4096" FUNCTIONS_DISCOVERY_TIMEOUT=120 npx firebase deploy --only functions:updatePaymentStatus --project quiniela-2026-9883d` | 5-10 min |
| A3 | Smoke test del flujo de pagos | Como group_admin: cambiar estado de pago, ver mensaje de éxito, recargar y confirmar persistencia | 5 min |
| A4 | Confirmar con Abel y Miguel que sus pantallas cargan tras el revert | Mensaje directo | 5 min |

### 🟠 Fase B — Cerrar condiciones de auditoría (1-2 días)

| # | Acción | Cómo | Tiempo |
|---|---|---|---|
| B1 | Verificar `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` en Vercel Production | Vercel → Settings → Environment Variables (o `vercel env ls`) | 10 min |
| B2 | Alertas de error | Firebase Console → Alerts (Functions error rate, email) + revisar Vercel logs; opcional Sentry free | 2-3 h |
| B3 | Fix de enmascaramiento de errores | En `predictions/page.tsx` y `predictions/group/page.tsx`: mover el render de `loadError` ANTES del guard `!group` | 30 min |
| B4 | Documentar rollback en `docs/rollback.md` | Incluir lo aprendido hoy: revertir deploy Vercel (promote previous), redeploy de rules desde git, recuperar ruleset previo vía Rules API, restore PITR | 1 h |

### 🟡 Fase C — Compuerta final (antes de invitar más usuarios)

| # | Acción | Cómo | Tiempo |
|---|---|---|---|
| C1 | Ejecutar `docs/testing-checklist.md` completo | iOS Safari + Android Chrome reales, con fecha y resultado por ítem; incluir: pagos (A3 ampliado), invites, pronóstico al límite, offline/PWA | 3-4 h |
| C2 | Decisión GO/NO-GO | Si C1 pasa sin bloqueantes → GO | — |

### 🔵 Fase D — Post-launch (Horizonte 2 del audit)

1. **Rediseño de `predictionVisibility` en DB** (el aprendizaje del incidente): filtrar `listPredictions` por `where("uid","==",uid)` + query separada para picks ajenos de partidos cerrados, o denormalizar visibilidad al doc. Solo entonces reintroducir la regla. (~medio día + test de emulator)
2. Test de integración con Firebase Emulator para rules + functions (habría atrapado tanto el bug de pagos como el incidente)
3. PWA completa (`manifest.json` + íconos) o retirar el anuncio
4. Índice `(status, kickoffAt DESC)` + `listRecentResults` con orderBy/limit; batch read en `listMyGroups`
5. Rate limiting en `acceptInvite`/`submitPrediction`
6. CD en GitHub Actions (deploy de app + functions + rules en push a main) — elimina el drift repo↔prod, causa de fondo de los dos bugs de hoy
7. Touch targets 44px CookieBanner; retención de datos post-Mundial; limpiar legacy (`*.gs`, `firebase 2.json`)

---

## 3. Decisión de riesgo pendiente (del dueño del producto)

**Visibilidad de pronósticos:** tras el incidente, el enforcement en DB queda pospuesto a Fase D. Mientras tanto, un miembro técnico del mismo grupo podría leer picks ajenos antes del cierre vía API (la UI sí los oculta). **Recomendación:** aceptable para beta privada entre conocidos; rediseñarlo en D1 antes de abrir a grupos comerciales. Si NO se acepta el riesgo, D1 pasa a Fase B y el go-live se retrasa ~1 día.

---

## 4. Criterio de cierre

GO cuando: A2-A4 ✅ + B1-B3 ✅ + C1 sin bloqueantes. B4 y todo D no bloquean pero quedan en backlog activo con fecha.
