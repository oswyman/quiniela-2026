# AGENTS.md — La Cancha

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

Siempre ejecutar `npm run build` y `npm test` antes de reportar una tarea como completa. Si hay cambios en `functions/`, hacer `cd functions && npm run build` por separado.

## Stack y arquitectura

- **Next.js 14 App Router + React 18 + TypeScript**, CSS nativo (sin Tailwind: decisión deliberada). Frontend en Vercel.
- **Firebase**: Auth (Google + Email/Password), Firestore, Security Rules (`firestore.rules`), Cloud Functions (`functions/src/`) con Admin SDK para toda escritura sensible.
- **Regla de oro**: las mutaciones de negocio van por Cloud Functions, nunca escritura directa de cliente a Firestore.

### Mapa de código

| Ruta | Qué es |
|---|---|
| `src/app/` | Páginas App Router: `/`, `/dashboard`, `/login`, `/admin`, `/groups/new`, `/groups/[groupId]/{predictions,predictions/group,ranking,results,admin}`, `/join/[inviteCode]`, `/terminos`, `/privacidad` |
| `src/app/globals.css` | Sistema de diseño completo (tokens CSS + componentes). Ver `DESIGN.md` |
| `src/components/` | Header, GroupNav, EmptyState, Toast, StatusMessage, AuthGate, ThemeToggle, skeletons |
| `src/lib/` | Lógica cliente: `scoring.ts`, `prizes.ts`, `deadlines.ts`, `calendar.ts`, `fixtureCsv.ts`, `matchTime.ts`, `firebase/` |
| `functions/src/` | Cloud Functions: `groups.ts`, `invites.ts`, `predictions.ts`, `manualResults.ts`, `scoring.ts`, `prizes.ts`, `standings.ts`, `roundOf32.ts`, `knockout.ts`, `knockoutResolution.ts`, `resultsSync.ts`, `audit.ts` |
| `tests/` | Vitest de lógica pura (scoring, prizes, deadlines, csv, calendar, standings) |
| `docs/` | `go-live-plan.md`, `testing-checklist.md`, template CSV de fixtures |
| `firestore.rules` | Reglas de seguridad. Nunca modificar sin revisar todas las queries del cliente |

## Modelo de datos Firestore

**Colecciones raíz:** `users/{uid}`, `groups/{groupId}`, `matches/{matchId}`, `auditLogs/{id}`, `systemConfig/tournament`

**Subcolecciones de grupo:** `groups/{id}/members`, `groups/{id}/invites`, `groups/{id}/predictions`, `groups/{id}/scores`, `groups/{id}/prizes`

El cliente **nunca escribe** `scores`, `prizes`, `matches`, `auditLogs` — siempre por Cloud Function.

## Reglas críticas

### Legal: marcas FIFA
**Prohibido en texto visible al usuario**: "FIFA", "Mundial", "Mundial 2026", "Copa Mundial", "World Cup", "México 2026". Multas hasta ~29 MDP (IMPI).

- Usar siempre: **"El Torneo 2026"** (o "el torneo").
- Permitido en código interno no visible: `fifaGroup`, `FIFA_REQUIRED_HEADERS`. No introducir nuevos.
- Verificar antes de commit: `grep -ri "FIFA\|Mundial" src/app src/components`

### Tabla de tercios Ronda de 32
`functions/src/standings.ts` → `THIRD_PLACE_LOOKUP`: tabla con las 4 combinaciones posibles del Torneo 2026. Mapea grupo avanzante → slot (matchNumbers 74,77,79,80,81,82,85,87). Si la combinación no está en la tabla → `needsReview: true` en todos los slots de terceros. Tests en `tests/roundOf32.test.ts`.

### Publicación de llaves
`functions/src/roundOf32.ts` calcula si la Ronda de 32 está lista: deben estar finalizados los 72 partidos de grupos, existir 16 asignaciones y no haber revisión pendiente. `confirmRoundOf32Resolution` requiere confirmación de `platform_admin`; no publicar automáticamente esta ronda. Después de confirmar Ronda de 32, `functions/src/knockoutResolution.ts` propaga ganadores/perdedores de 89 a 104 y marca cruces resueltos como `isPublishedToParticipants: true` para que puedan pronosticarse.

### Incidente predictionVisibility
NO reintroducir la regla Firestore que filtra `predictions` por `predictionVisibility` — rompió producción (revert commit 1609999). Causa: las queries de colección sin filtro `where` son denegadas por reglas con condiciones por-documento. El filtrado de picks ajenos va en el cliente.

### Sincronía scoring frontend/backend
`src/lib/scoring.ts` y `functions/src/scoring.ts` deben mantenerse idénticos en lógica. Al modificar uno, actualizar el otro y los tests en `tests/scoring.test.ts`.

## Diseño

- Leer `DESIGN.md` antes de tocar UI. Sistema de tokens en `globals.css`.
- Todo color nuevo requiere **tres definiciones**: `:root`, `:root[data-theme="dark"]` y `@media (prefers-color-scheme: dark)`.
- WCAG AA en ambos temas. Táctil mínimo 44px. `tabular-nums` en cifras. Skeletons para cargas.
- Fuentes: Barlow Condensed (display), Barlow (body). Paleta: stadium-green, trophy-gold, ivory-warm.

## Convenciones

- Copy de UI en **español de México**, tono directo y cercano. Sin em dashes.
- Commits: conventional commits en inglés (`feat(ui):`, `fix(rules):`, `fix(functions):`).
- Cambios en `functions/` requieren deploy Firebase separado; no salen con Vercel.
- No commitear: `firebase 2.json`, `.agents/`, `skills-lock.json`.
- Cambiar strings en `src/lib/` puede romper asserts en `tests/` — actualizar juntos.

## Reglas de negocio clave

- **Pronóstico**: cierra 90 min antes de cada partido (`PREDICTION_CUTOFF_MINUTES = 90`). Frontend bloquea UI; Cloud Function valida en servidor. Tardío = `isLate: true` = 0 aciertos.
- **Unirse a un grupo**: permitido en cualquier momento del torneo (sin deadline de registro). Los partidos ya cerrados no se pueden pronosticar.
- **Scoring**: 1 acierto por partido. Fase de grupos → HOME/DRAW/AWAY a 90'. Eliminación → equipo que avanza.
- **Premios**: 2 activos=100%/0%; 3=70%/30%/0%; 4+=60%/30%/10%. Empates dividen el pool de posiciones empatadas.
