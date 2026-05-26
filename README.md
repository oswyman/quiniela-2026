# La Cancha · Quinielas privadas Mundial 2026

Webapp beta vendible para organizar quinielas privadas del Mundial FIFA 2026 con Next.js, Firebase Auth, Cloud Firestore, Firebase Security Rules, Cloud Functions y despliegue del frontend en Vercel.

> **Advertencia legal para Mexico:** Esta plataforma es una herramienta administrativa para organizar quinielas privadas. No constituye asesoria legal. Si un grupo usa aportaciones economicas o premios, debe consultar a un abogado y revisar la regulacion aplicable en Mexico antes de operar.

La plataforma no procesa pagos, no custodia dinero, no implementa wallet y no integra Stripe, Mercado Pago, PayPal ni otro procesador. Solo registra informacion administrativa: aportacion acordada, responsable del dinero, estado de pago manual y premios estimados.

## Stack tecnico

- Next.js App Router, React y TypeScript.
- CSS Modules y CSS global simple. Se eligio CSS nativo para reducir dependencias, controlar identidad visual y mantener el despliegue MVP ligero.
- Firebase Auth para acceso email/password.
- Cloud Firestore para grupos, miembros, invitaciones, partidos, pronosticos, scores, premios y auditoria.
- Firebase Security Rules para permisos del cliente.
- Firebase Cloud Functions con Admin SDK para invitaciones, grupos, pronosticos, resultados manuales, auditoria, recalculo, ranking, premios y sync opcional.
- Vercel para desplegar el frontend.

## Instalacion local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` o el puerto que indique Next.js.

Para verificar:

```bash
npm run lint
npm test
npm run build
cd functions && npm install && npm run build
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores publicos de Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY=
NEXT_PUBLIC_APP_URL=

RESULTS_API_PROVIDER=manual
RESULTS_API_KEY=
RESULTS_API_BASE_URL=

API_FOOTBALL_KEY=
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE=1
API_FOOTBALL_SEASON=2026

SPORTMONKS_API_TOKEN=
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_WORLD_CUP_SEASON_ID=26618
```

No guardes secretos reales en el repo. `API_FOOTBALL_KEY`, Sportmonks y cualquier secreto solo deben vivir en Firebase Functions o entornos seguros. El Admin SDK nunca se usa en el frontend.

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

Para crear el primer superadmin, crea el usuario en Auth, crea/actualiza `users/{uid}` en Firestore y asigna `roleGlobal: "platform_admin"`. Desde `/admin`, ese superadmin puede generar invitaciones para administradores de grupo.

## Deploy de Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Funciones principales:

- `createAdminInvite`: `platform_admin` crea invitaciones email-bound para administradores de grupo.
- `createParticipantInvite` / `createInvite`: `group_admin` invita participantes por correo.
- `acceptInvite`: valida codigo, email autenticado, expiracion y deadline de registro.
- `createGroup`: crea grupo + miembro admin de forma consistente.
- `updateGroup`: edita reglas del grupo antes del inicio del Mundial.
- `deleteGroup`: cancela grupo antes del inicio del Mundial.
- `submitPrediction`: valida kickoff con hora de servidor y guarda pronostico.
- `upsertManualMatch`: `platform_admin` carga o edita fixtures manuales.
- `upsertManualResult`: `platform_admin` captura resultados manuales.
- `recalculateGroupScores` / `updateGroupRanking`: recalcula puntos, ranking y premios.
- `syncFixturesFromProvider` / `syncLiveResultsFromProvider`: sync opcional de proveedor.
- `scheduledFixturesSync` / `scheduledLiveResultsSync`: programadas, utiles solo si el proveedor no es `manual` ni `disabled`.

## Configuracion de Vercel

1. Importa el repositorio en Vercel.
2. Configura variables `NEXT_PUBLIC_FIREBASE_*` y `NEXT_PUBLIC_APP_URL`.
3. Usa los defaults de Next.js:
   - Build command: `npm run build`
   - Output: gestionado por Next.js
4. En Firebase Authentication > Settings > Authorized domains, agrega el dominio de Vercel.
5. Despliega.

Las variables de proveedor de resultados con secretos no deben exponerse al cliente.

## Como funciona para usuarios

1. Un superadmin crea una invitacion para un administrador de grupo desde `/admin`.
2. El administrador acepta la invitacion en `/join/[inviteCode]` y crea su cuenta con ese correo.
3. El administrador crea su grupo y configura moneda, aportacion, responsable del dinero, resultado valido y visibilidad de pronosticos.
4. El administrador invita participantes por correo desde `/groups/[groupId]/admin`.
5. Los participantes aceptan la invitacion y solo pueden entrar si el email autenticado coincide.
6. El registro del grupo cierra 90 minutos antes del primer partido del Mundial.
7. Cada pronostico cierra por partido cuando `now >= match.kickoffAt`.
8. El ranking muestra puntos, desempates y premios estimados.

## Como crear un grupo

El registro publico esta cerrado. Solo un usuario con `roleGlobal: "group_admin"` o `platform_admin`, creado por invitacion, puede usar `/groups/new`.

Campos configurables:

- Nombre del grupo.
- Moneda.
- Aportacion administrativa.
- Responsable del dinero.
- Resultado valido: 90 minutos, tiempos extra o final con penales.
- Visibilidad de pronosticos: por defecto despues del cierre.
- Aceptacion de advertencia legal.

## Como invitar participantes

1. Entra a `/groups/[groupId]/admin`.
2. Captura el correo del participante.
3. Crea la invitacion.
4. Comparte la liga `/join/[inviteCode]` por correo o canal externo.
5. El participante crea cuenta o inicia sesion con exactamente ese correo.

No se aceptan registros libres al grupo. Despues del deadline de registro, Functions rechaza crear o aceptar invitaciones y registra auditoria.

## Como capturar pronosticos

1. Entra a `/groups/[groupId]/predictions`.
2. Captura marcador local y visitante antes del kickoff.
3. El frontend bloquea el formulario cuando el partido cerro.
4. `submitPrediction` vuelve a validar en backend con hora de servidor.
5. Si un pronostico entra tarde por error operativo, se marca `isLate=true` y vale 0 puntos.

## Como calcular ranking

1. Asegura que existan resultados en `matches`.
2. En `/groups/[groupId]/admin` o `/admin`, usa `Recalcular`.
3. Cloud Functions calcula puntos, actualiza `scores`, calcula `prizes` y registra auditoria.

El ranking explica puntos totales, marcadores exactos, diferencias, ganadores/empates, premios estimados y empates en zona de premio.

## Como registrar resultados manualmente

El modo oficial recomendado para beta es `RESULTS_API_PROVIDER=manual`.

En `/admin`, un `platform_admin` puede:

- Crear o editar partidos.
- Capturar marcador a 90 minutos.
- Capturar marcador final.
- Capturar ganador.
- Recalcular rankings por grupo.

Despues de actualizar resultados, ejecuta `recalculateGroupScores`.

## API-Football / API-SPORTS

Se reviso la guia de API-Football para Mundial 2026: usa `league=1` y `season=2026` para fixtures, standings y live fixtures. Tambien se reviso pricing: el plan gratuito publica 100 requests/dia y el Free plan puede tener temporadas limitadas.

Decision de producto para beta:

- `manual` sera la fuente oficial inicial.
- `api-football` queda como integracion opcional para precargar o sincronizar si se contrata plan/token suficiente.
- La API corre solo en Cloud Functions, nunca en frontend.

Configura:

```bash
RESULTS_API_PROVIDER=api-football
API_FOOTBALL_KEY=tu_token
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE=1
API_FOOTBALL_SEASON=2026
```

Endpoints preparados:

- Fixtures: `/fixtures?league=1&season=2026`.
- Live/latest: `/fixtures?live=all`.

No uses scraping ni API keys reales en el repositorio.

## Firestore Security Rules

`firestore.rules` implementa:

- Usuarios autenticados.
- Cada usuario puede leer su perfil.
- Miembros solo leen grupos donde participan.
- `platform_admin` lee grupos, usuarios y auditoria.
- El cliente no crea grupos ni modifica configuracion competitiva directamente.
- El cliente no escribe `scores`, `prizes`, `auditLogs`, `apiSyncLogs` ni `matches`.
- Invitaciones, grupos, resultados y pronosticos sensibles pasan por Cloud Functions.

## App Check y dominios

Antes de abrir trafico publico:

1. Configura App Check para la Web App con reCAPTCHA Enterprise.
2. Agrega el site key en `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
3. Monitorea metricas antes de activar enforcement.
4. Agrega el dominio Vercel en Firebase Auth.

## Reglas de puntuacion

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

- No envia correos automaticamente; genera links de invitacion para compartir por fuera.
- Firebase Email/Password permite crear Auth users; la entrada al producto y grupos se controla por invitacion email-bound en Functions.
- `platform_admin` inicial se asigna manualmente en Firestore.
- API-Football no debe ser fuente critica en plan gratuito.
- Falta test suite completa de Firestore Emulator.
- Falta App Check enforcement y monitoreo formal de Functions.
- Falta revision legal formal antes de operar con aportaciones economicas o premios.

## Roadmap recomendado

1. Email transaccional para enviar invitaciones.
2. Tests de reglas Firestore con Emulator.
3. App Check enforcement.
4. Observabilidad de Functions y alertas de sync.
5. Panel de auditoria con diffs legibles.
6. Importacion CSV de fixtures manuales.
7. Validacion de cuotas del proveedor antes de activar API live.
8. Exportacion CSV por grupo.
9. Branding por grupo.
10. Revision legal y fiscal formal por mercado.
