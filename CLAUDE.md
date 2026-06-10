# CLAUDE.md — La Cancha

Quinielas privadas entre amigos para El Torneo 2026. Herramienta administrativa: **no procesa pagos, no custodia dinero, no integra procesadores**. Solo registra aportación acordada, responsable, estado de pago manual y premios estimados.

## Comandos

```bash
npm run dev              # Next.js dev en :3000
npm run build            # Build de producción (verificar antes de push)
npm test                 # Vitest (tests/ — lógica pura, sin UI)
npm run lint             # ESLint
npm run emulator:start   # Firebase emulators (requiere openjdk@17)
npm run emulator:seed    # Sembrar datos de prueba (scripts/seed.ts)
npm run emulator:dev     # Next.js apuntando a emuladores (.env.local.emulator)
```

## Stack y arquitectura

- **Next.js 14 App Router + React 18 + TypeScript**, CSS nativo (sin Tailwind: decisión deliberada). Frontend en Vercel.
- **Firebase**: Auth (Google), Firestore, Security Rules (`firestore.rules`), Cloud Functions (`functions/src/`) con Admin SDK para toda escritura sensible (invitaciones, pronósticos, resultados, scoring, premios, pagos, auditoría).
- **Regla de oro**: las mutaciones de negocio van por Cloud Functions, nunca escritura directa de cliente a Firestore. El estado de pago se actualiza vía Cloud Function con escritura atómica (incidente resuelto en commit 98de817).

### Mapa de código

| Ruta | Qué es |
|---|---|
| `src/app/` | Páginas: landing `/`, `/dashboard`, `/login`, `/admin` (superadmin), `/groups/new`, `/groups/[groupId]/{,predictions,predictions/group,ranking,results,admin}`, `/join/[inviteCode]`, `/terminos`, `/privacidad` |
| `src/app/globals.css` | TODO el sistema de diseño (tokens + componentes). Ver DESIGN.md |
| `src/components/` | Header, GroupNav, EmptyState, Toast, StatusMessage, AuthGate, ThemeToggle, skeletons, etc. |
| `src/lib/` | Lógica de cliente: `scoring.ts` (cierres, picks), `prizes.ts` (ranking), `calendar.ts` (export iCal), `fixtureCsv.ts`, `matchTime.ts`, `firebase/` |
| `functions/src/` | Cloud Functions: groups, invites, predictions, scoring, prizes, standings, knockout, manualResults, resultsSync, audit |
| `tests/` | Vitest de lógica pura (scoring, prizes, deadlines, csv, calendar, standings) |
| `docs/` | go-live-plan.md, testing-checklist.md, backup-setup.md, template CSV de fixtures |
| `audit-la-cancha-*.md` | Auditorías pre-producción (la última: 2026-06-09, GO CONDICIONAL 73/100) |

## Reglas críticas (no negociables)

### Legal: marcas FIFA
**Prohibido en cualquier texto visible al usuario** (UI, metadata, manifest, iCal, toasts): "FIFA", "Mundial", "Mundial 2026", "Copa Mundial", "World Cup", "México 2026", mascotas/trofeos oficiales. FIFA tiene ~398 marcas registradas ante el IMPI; multas de hasta ~29 MDP.

- El término de branding aprobado es **"El Torneo 2026"** (o "el torneo").
- Excepción: el aviso de no-afiliación en `LegalNotice.tsx` y `/terminos` menciona FIFA solo para deslindarse (uso nominativo permitido). No tocar.
- Permitido en código interno no visible: `fifaGroup` (types), `FIFA_REQUIRED_HEADERS` (fixtureCsv), strings de functions/tests. No introducir nuevos.
- Al escribir cualquier copy nuevo, verificar con: `grep -ri "FIFA\|Mundial" src/app src/components`

### Incidente predictionVisibility (2026-06-09)
NO reintroducir la regla de Firestore que filtraba lectura de `predictions` por `predictionVisibility` — rompió producción porque las queries existentes no la satisfacen (revert en commit 1609999). El filtrado de picks ajenos se hace en cliente (`predictions/page.tsx` filtra por uid). Si se quiere visibilidad real a nivel DB, hay que rediseñar las queries primero.

### Diseño
- Leer `PRODUCT.md` (estrategia/marca) y `DESIGN.md` (sistema visual, tokens, do's & don'ts) antes de tocar UI.
- Todo color nuevo entra como token en `globals.css` en SUS TRES definiciones: `:root` (light), `:root[data-theme="dark"]` y el bloque `@media (prefers-color-scheme: dark)` (deben ser idénticos).
- Contraste WCAG AA en ambos temas; mínimo táctil 44px; `tabular-nums` en datos numéricos; skeletons para cargas; prohibidas las barras laterales de color como acento.

## Convenciones

- Copy de UI en español de México, tono directo y cercano (ver PRODUCT.md). Sin em dashes en copy.
- Commits: conventional commits en inglés (`feat(ui):`, `fix(rules):`...).
- Cambiar strings de `src/lib/` puede romper asserts de `tests/` — actualizar el test junto con el string.
- Cambios en `functions/` requieren deploy separado de Firebase (no salen con el deploy de Vercel); evitarlos para fixes solo de copy.
- Los archivos `firebase 2.json`, `.agents/` y `skills-lock.json` del working tree no se commitean.

## Estado pre-producción

GO CONDICIONAL (auditoría 2026-06-09, 73/100). Pendientes H1: verificación en prod, alertas/monitoring, checklist manual de QA (docs/testing-checklist.md). El bug de pagos ya se resolvió (98de817). Detalle en `audit-la-cancha-2026-06-09.md` y `docs/go-live-plan.md`.
