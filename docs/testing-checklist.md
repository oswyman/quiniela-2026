# Checklist de Testing Funcional — La Cancha
## Pre-Producción | Mundial 2026

Ejecutar este checklist completo antes de cada deploy a producción.
Marcar cada ítem con ✅ (pasa), ❌ (falla — registrar bug) o ⚠️ (pasa con observaciones).

**Responsable de la ejecución:** _______________
**Fecha:** _______________
**Versión/commit:** _______________

---

## FLUJO 1 — Registro e inicio de sesión

- [ ] 1.1 Login con Google funciona y redirige a `/dashboard`
- [ ] 1.2 Login con email/password válidos funciona y redirige a `/dashboard`
- [ ] 1.3 Login con credenciales incorrectas muestra mensaje de error claro (no stack trace)
- [ ] 1.4 Cierre de sesión funciona y redirige a `/`
- [ ] 1.5 Acceder a `/dashboard` sin sesión redirige o muestra pantalla de sesión requerida
- [ ] 1.6 Acceder a `/groups/[id]` sin sesión muestra AuthGate (no error en blanco)

---

## FLUJO 2 — Creación de grupo (admin)

- [ ] 2.1 Solo usuarios con `roleGlobal = group_admin` ven el botón "Crear grupo" en el Header
- [ ] 2.2 Formulario de creación valida campos requeridos (nombre, aportación)
- [ ] 2.3 Grupo se crea correctamente y aparece en el dashboard del creador
- [ ] 2.4 El creador aparece como `group_admin` en el grupo recién creado

---

## FLUJO 3 — Invitaciones

- [ ] 3.1 Admin puede crear invitación por correo para participante
- [ ] 3.2 Admin puede crear invitación abierta (link público)
- [ ] 3.3 Link de invitación muestra vista previa del grupo (nombre, admin) antes de aceptar
- [ ] 3.4 Aceptar invitación agrega al usuario como miembro del grupo
- [ ] 3.5 Intentar usar un link de invitación ya usado/revocado muestra error claro
- [ ] 3.6 Admin puede revocar un link abierto — el link deja de funcionar

---

## FLUJO 4 — Pronósticos (fase de grupos)

- [ ] 4.1 Participante puede ver todos los partidos programados de la fase de grupos
- [ ] 4.2 Puede seleccionar LOCAL / EMPATE / VISITANTE y guardar pronóstico
- [ ] 4.3 Pronóstico guardado aparece marcado visualmente al recargar la página
- [ ] 4.4 Pronóstico puede modificarse mientras el partido esté abierto
- [ ] 4.5 **Cierre de pronósticos**: 90 minutos antes del kickoff, la UI muestra el pronóstico como cerrado (sin botón de edición)
- [ ] 4.6 Intentar guardar pronóstico después del cierre devuelve error del servidor (no se guarda silenciosamente)
- [ ] 4.7 Partido con estado "live" o "finished" aparece bloqueado para pronósticos

---

## FLUJO 5 — Pronósticos (fase eliminatoria)

- [ ] 5.1 Partidos de knockout con equipos sin resolver NO aparecen disponibles para pronosticar antes de ser publicados
- [ ] 5.2 Una vez publicado (isPublishedToParticipants = true), el partido aparece con los equipos correctos
- [ ] 5.3 Participante puede elegir uno de los dos equipos del partido
- [ ] 5.4 Intentar enviar un equipo que no sea de los dos válidos devuelve error
- [ ] 5.5 En `/admin`, el superadmin puede usar "Publicar llave completa" y se crean/actualizan los partidos 73-104 con horario y sede
- [ ] 5.6 Después de publicar la llave completa, los partidos 73-88 aparecen disponibles para pronósticos y 89-104 no aparecen hasta tener ambos equipos definidos
- [ ] 5.7 Capturar resultados de eliminación directa publica automáticamente los siguientes cruces cuando ambos equipos quedan definidos
- [ ] 5.8 Si se usa el respaldo de propuesta por standings, la confirmación queda bloqueada cuando requiere revisión manual y muestra el motivo

---

## FLUJO 6 — Resultados y scoring

- [ ] 6.1 Al registrar resultado de un partido, el score del grupo se puede recalcular
- [ ] 6.2 Pronóstico correcto suma 1 punto al participante
- [ ] 6.3 Pronóstico incorrecto suma 0 puntos
- [ ] 6.4 Empate en puntos → los participantes comparten posición en el ranking
- [ ] 6.5 La página de Resultados muestra los partidos terminados con el marcador correcto
- [ ] 6.6 Las predicciones de cada participante se muestran con color correcto (acierto / error)

---

## FLUJO 7 — Ranking y premios

- [ ] 7.1 Ranking muestra participantes ordenados por puntos descendente
- [ ] 7.2 El premio estimado se muestra correctamente según la regla configurada del grupo
- [ ] 7.3 Participante puede ver su propia posición destacada
- [ ] 7.4 Participante con 0 pronósticos aparece en el ranking con 0 puntos (no se cae la lista)

---

## FLUJO 8 — Estados de error y edge cases

- [ ] 8.1 Acceder a un `groupId` que no existe muestra error amigable (no pantalla en blanco)
- [ ] 8.2 Acceder al grupo de otro usuario (sin ser miembro) muestra error de acceso
- [ ] 8.3 Si Cloud Functions no responde, la UI muestra mensaje de error (no spinner infinito)
- [ ] 8.4 Recargar la página durante carga no causa error de estado inconsistente
- [ ] 8.5 Nombre de usuario con caracteres especiales (acentos, ñ) se muestra correctamente

---

## FLUJO 9 — Admin de grupo

- [ ] 9.1 Solo el `group_admin` ve la sección de administración del grupo
- [ ] 9.2 Admin puede cambiar estado de pago de un participante (pagado / pendiente)
- [ ] 9.3 Admin puede recalcular scores manualmente
- [ ] 9.4 Un participante regular NO puede acceder a la ruta `/groups/[id]/admin`

---

## FLUJO 10 — Platform Admin

- [ ] 10.1 Solo usuarios con `roleGlobal = platform_admin` pueden acceder a `/admin`
- [ ] 10.2 Un usuario regular que intenta acceder a `/admin` ve pantalla de acceso denegado (no un error 500)
- [ ] 10.3 Admin puede cargar resultado de un partido manualmente
- [ ] 10.4 Admin puede importar fixtures desde CSV sin errores para el formato estándar
- [ ] 10.5 Admin puede publicar la llave completa 73-104 sin duplicar partidos ya existentes
- [ ] 10.6 La auditoría de acciones muestra las últimas operaciones correctamente

---

## FLUJO 11 — Responsive / Mobile

- [ ] 11.1 Login funciona en iOS Safari (iPhone 14 o similar)
- [ ] 11.2 Lista de pronósticos es usable en pantalla de 390px de ancho
- [ ] 11.3 Ranking es legible en mobile
- [ ] 11.4 No hay scroll horizontal inesperado en ninguna de las páginas principales

---

## FLUJO 12 — Legal

- [ ] 12.1 Página `/privacidad` carga correctamente y es legible
- [ ] 12.2 Página `/terminos` carga correctamente y es legible
- [ ] 12.3 Links a privacidad y términos son visibles desde la landing page
- [ ] 12.4 El email de contacto ARCO está visible y es funcional

---

## Resultado del testing

| Flujo | Estado | Bugs encontrados |
|---|---|---|
| 1 — Login | | |
| 2 — Creación de grupo | | |
| 3 — Invitaciones | | |
| 4 — Pronósticos grupos | | |
| 5 — Pronósticos knockout | | |
| 6 — Resultados y scoring | | |
| 7 — Ranking y premios | | |
| 8 — Errores y edge cases | | |
| 9 — Admin de grupo | | |
| 10 — Platform Admin | | |
| 11 — Responsive | | |
| 12 — Legal | | |

**Decisión:** ☐ Listo para deploy &nbsp;&nbsp; ☐ Requiere correcciones primero

**Firma:** _______________ **Fecha:** _______________
