# La Cancha · Quinielas privadas Mundial 2026

Webapp MVP premium para organizar quinielas privadas del Mundial FIFA 2026 con Next.js, Firebase Auth, Cloud Firestore, Firebase Security Rules, Cloud Functions y despliegue de frontend en Vercel.

> **Advertencia legal para Mexico:** Esta plataforma es una herramienta administrativa para organizar quinielas privadas. No constituye asesoria legal. Si un grupo usa aportaciones economicas o premios, debe consultar a un abogado y revisar la regulacion aplicable en Mexico antes de operar.

La plataforma no procesa pagos, no custodia dinero, no implementa wallet y no integra Stripe, Mercado Pago, PayPal ni otro procesador. Solo registra informacion administrativa: aportacion acordada, responsable del dinero, estado de pago manual y premios estimados.

## Stack tecnico

- Next.js App Router, React y TypeScript.
- CSS Modules y CSS global simple. Se eligio CSS Modules/CSS nativo para reducir dependencias y facilitar despliegue MVP sin Tailwind.
- Firebase Auth para registro e inicio de sesion email/password.
- Cloud Firestore para grupos, miembros, invitaciones, partidos, pronosticos, scores, premios y auditoria.
- Firebase Security Rules para permisos del cliente.
- Firebase Cloud Functions con Admin SDK para invitaciones, auditoria, recalculo, ranking, premios y sync mock de partidos.
- Vercel para desplegar el frontend.

## Instalacion local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Para verificar:

```bash
npm run lint
npm test
npm run build
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores publicos del proyecto Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY=
NEXT_PUBLIC_APP_URL=

RESULTS_API_PROVIDER=mock
RESULTS_API_KEY=
RESULTS_API_BASE_URL=
SPORTMONKS_API_TOKEN=
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_WORLD_CUP_SEASON_ID=26618
```

No guardes secretos reales en el repo. El Admin SDK solo vive en `functions/`.

## Configuracion de Firebase

1. Crea un proyecto en Firebase.
2. Activa Firebase Auth con proveedor Email/Password.
3. Crea Cloud Firestore.
4. Registra una Web App y copia los valores `NEXT_PUBLIC_FIREBASE_*`.
5. Instala Firebase CLI si no lo tienes.
6. Inicia sesion con `firebase login`.
7. Asocia el proyecto con `firebase use --add`.
8. Despliega reglas e indices:

```bash
firebase deploy --only firestore
```

## Deploy de Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Funciones incluidas:

- `onPredictionWrite`: valida retrasos, registra auditoria y deja rastros de cambios.
- `recalculateGroupScores`: callable protegido para `group_admin` o `platform_admin`.
- `updateGroupRanking`: callable protegido para recalcular ranking y premios.
- `syncMatchesFromProviderCallable`: sync mock protegido para `platform_admin`.
- `syncFixturesFromProvider`: sync de fixtures protegido para `platform_admin`.
- `syncLiveResultsFromProvider`: sync de resultados/live protegido para `platform_admin`.
- `scheduledFixturesSync`: programada cada 6 horas; usa mock o Sportmonks.
- `scheduledLiveResultsSync`: programada cada 5 minutos; usa mock o Sportmonks.
- `createInvite`: crea codigos de invitacion.
- `acceptInvite`: valida invitacion y agrega participante.
- `createGroup`: crea grupo + membresia admin de forma consistente.
- `submitPrediction`: valida cierre con hora de servidor y guarda pronostico.

## Configuracion de Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables `NEXT_PUBLIC_FIREBASE_*`.
3. Usa los defaults de Next.js:
   - Build command: `npm run build`
   - Output: gestionado por Next.js
4. Despliega.

Las variables `RESULTS_API_*` son para la capa futura de resultados y no deben exponerse al cliente si contienen secretos.

## Como crear un grupo

1. Registra o inicia sesion en `/login`.
2. Ve a `/groups/new`.
3. Captura nombre, moneda, aportacion, responsable del dinero, resultado valido y visibilidad.
4. Acepta la advertencia legal.
5. El creador queda como `group_admin`.

## Como invitar participantes

1. Entra a `/groups/[groupId]/admin`.
2. Usa `Crear invitacion`.
3. Comparte la liga `/join/[inviteCode]`.
4. El participante debe iniciar sesion y aceptar la invitacion.

## Como capturar pronosticos

1. Entra a `/groups/[groupId]/predictions`.
2. Captura marcador local y visitante antes del kickoff.
3. El cliente bloquea el formulario cuando `now >= kickoffAt`.
4. Las reglas tambien validan que no se creen o editen pronosticos cerrados.
5. Si un pronostico entra tarde por error, Functions lo marca como `isLate=true` y 0 puntos.

## Como calcular ranking

1. Asegura que existan resultados en `matches`.
2. En `/groups/[groupId]/admin`, usa `Recalcular puntos`.
3. Cloud Functions calcula puntos, actualiza `scores`, calcula `prizes` y registra auditoria.

## Como registrar resultados manualmente

En el MVP, un `platform_admin` puede escribir partidos/resultados en `matches` desde consola Firebase, script administrativo o una Function futura. Campos relevantes:

- `homeGoals90`, `awayGoals90`
- `homeGoalsExtraTime`, `awayGoalsExtraTime`
- `homePenaltyGoals`, `awayPenaltyGoals`
- `finalHomeGoals`, `finalAwayGoals`
- `winnerTeam`
- `status`

Despues de actualizar resultados, ejecuta `recalculateGroupScores`.

## API de resultados futura

La integracion queda preparada en:

- `src/lib/resultsProvider.ts`
- `functions/src/resultsSync.ts`

Soporta proveedor `mock` y `sportmonks`, fixtures, resultados, actualizacion de partidos y recalculo posterior. Para conectar Sportmonks:

1. Contrata/revisa el plan World Cup 2026 y sus limites.
2. Configura `RESULTS_API_PROVIDER=sportmonks`.
3. Configura `SPORTMONKS_API_TOKEN` solo en Firebase Functions/Vercel server envs si aplica.
4. Configura `SPORTMONKS_WORLD_CUP_SEASON_ID` si Sportmonks cambia el season id.
5. Ejecuta `syncFixturesFromProvider` para cargar fixtures.
6. Ejecuta `syncLiveResultsFromProvider` durante pruebas o usa las scheduled functions.
7. Despues de resultados, ejecuta `recalculateGroupScores`.

No uses scraping ni API keys reales en el repositorio.

## Firestore Security Rules

`firestore.rules` implementa:

- Usuarios autenticados.
- Cada usuario puede leer su perfil.
- Miembros solo leen grupos donde participan.
- Participantes envian pronosticos mediante Cloud Functions; el cliente no escribe predicciones directamente.
- El cliente no puede modificar puntos, ranking, premios, auditoria ni sync logs.
- `group_admin` administra miembros/configuracion del grupo.
- Escrituras sensibles ocurren desde Cloud Functions.

## App Check y dominios

Antes de abrir trafico publico:

1. En Firebase Console, configura App Check para la Web App con reCAPTCHA Enterprise.
2. Agrega el site key en `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
3. Monitorea metricas antes de activar enforcement.
4. En Authentication > Settings > Authorized domains agrega tu dominio Vercel.

## Vercel Analytics, Speed Insights y CI

El workflow `.github/workflows/ci.yml` ejecuta lint, tests y builds de frontend/functions en cada PR/push a `main`. Para la beta publica, activa Vercel Analytics y Speed Insights desde Vercel o agrega los paquetes oficiales cuando decidas medir trafico real.

## Reglas de puntuacion

Defaults:

- Marcador exacto: 3 puntos.
- Diferencia de goles correcta: 2 puntos.
- Ganador correcto o empate correcto: 1 punto.
- Resultado incorrecto: 0 puntos.
- Pronostico tardio: 0 puntos.

Tests: `tests/scoring.test.ts`.

## Reglas de premios

- 2 participantes activos: 1 lugar 100%, 2 lugar 0%.
- 3 participantes activos: 70%, 30%, 0%.
- 4 o mas participantes activos: 60%, 30%, 10%.

Empates en zona de premio: suma los premios de posiciones empatadas y divide entre participantes empatados. La explicacion se guarda en Firestore y se muestra en UI.

Tests: `tests/prizes.test.ts`.

## Limitaciones del MVP

- No hay panel completo para editar resultados manuales; se documenta el flujo administrativo.
- No hay Google provider; el MVP usa email/password.
- No hay UI avanzada para configuracion global.
- `platform_admin` debe asignarse manualmente en Firestore.
- El sync de resultados usa mock.
- La auditoria es basica y debe ampliarse para produccion.
- Las reglas de Firestore no pueden cubrir toda la logica sensible; Functions es la fuente confiable.

## Roadmap recomendado

1. Panel de resultados para `platform_admin`.
2. Integracion real con proveedor deportivo licenciado.
3. App Check y emuladores en CI.
4. Tests de reglas Firestore.
5. Mejor auditoria de diffs y alertas.
6. Notificaciones por email.
7. Exportacion CSV por grupo.
8. Branding por grupo.
9. Observabilidad de Functions.
10. Revision legal formal antes de operar con aportaciones economicas o premios.
