# Plan de pruebas manuales

Este plan valida el MVP en Google Sheets + Apps Script sin depender de API externa.

## Preparacion

1. Crear un Google Sheet nuevo.
2. Pegar todos los archivos `.gs` en Apps Script.
3. Recargar el Sheet.
4. Ejecutar `Quiniela 2026 > Inicializar plantilla`.
5. Confirmar que existen las hojas esperadas.
6. Confirmar que `AUDITORIA` registra el setup.

## Caso 1: estructura inicial

Pasos:

1. Ejecutar `Inicializar plantilla`.
2. Revisar encabezados de todas las hojas.
3. Revisar que `CONFIGURACION` tenga una fila demo.
4. Revisar que `REGLAS` tenga reglas visibles.

Resultado esperado:

- Todas las hojas existen.
- Las hojas calculadas estan protegidas.
- Las validaciones de datos aparecen en columnas configurables.

## Caso 2: grupo con 2 participantes

Datos:

- Grupo: `Grupo 2`
- Moneda: `MXN`
- Aportacion: `100`
- Participantes activos: 2

Pasos:

1. Configurar el grupo.
2. Registrar 2 participantes activos.
3. Capturar 2 partidos.
4. Capturar pronosticos validos.
5. Capturar resultados.
6. Ejecutar `Recalcular todo`.

Resultado esperado:

- Bolsa total: `200`.
- Primer lugar: `200`.
- Segundo lugar: `0`.
- Regla aplicada: `2 participantes: 100% al primer lugar`.

## Caso 3: grupo con 3 participantes

Datos:

- Aportacion: `100`
- Participantes activos: 3

Resultado esperado:

- Bolsa total: `300`.
- Primer lugar: `210`.
- Segundo lugar: `90`.
- Tercer lugar: `0`.
- Regla aplicada: `3 participantes: 70% / 30%`.

## Caso 4: grupo con 4 o mas participantes

Datos:

- Aportacion: `100`
- Participantes activos: 4

Resultado esperado:

- Bolsa total: `400`.
- Primer lugar: `240`.
- Segundo lugar: `120`.
- Tercer lugar: `40`.
- Regla aplicada: `4 o mas participantes: 60% / 30% / 10%`.

## Caso 5: empate en primer lugar

Datos:

- 4 participantes.
- Dos participantes empatan en posicion 1.

Pasos:

1. Crear resultados que dejen a 2 participantes con mismos puntos, marcadores exactos y pronosticos validos.
2. Ejecutar `Recalcular todo`.

Resultado esperado:

- Posicion repetida: `1` para ambos.
- Se suma premio de posicion 1 y 2.
- Se divide entre los empatados.
- `PREMIOS!Observaciones` registra la regla de empate.

## Caso 6: pronostico tardio

Pasos:

1. Crear partido con fecha/hora anterior al momento actual.
2. Enviar o capturar pronostico con timestamp posterior al cierre.
3. Ejecutar `Validar pronosticos`.
4. Ejecutar `Recalcular todo`.

Resultado esperado:

- `Estado pronostico`: `TARDIO`.
- `Es tardio`: `SI`.
- `Puntos obtenidos`: `0`.

## Caso 7: marcador exacto

Datos:

- Pronostico: `2-1`.
- Resultado valido: `2-1`.

Resultado esperado:

- `Puntos obtenidos`: `3`.
- En `PUNTUACION`, `Marcadores exactos` aumenta en 1.

## Caso 8: diferencia de goles correcta

Datos:

- Pronostico: `3-1`.
- Resultado valido: `2-0`.

Resultado esperado:

- Diferencia correcta de `+2`.
- `Puntos obtenidos`: `2`.
- En `PUNTUACION`, `Diferencias acertadas` aumenta en 1.

## Caso 9: ganador correcto

Datos:

- Pronostico: `1-0`.
- Resultado valido: `3-2`.

Resultado esperado:

- Ganador correcto.
- `Puntos obtenidos`: `1`.
- En `PUNTUACION`, `Ganadores acertados` aumenta en 1.

## Caso 10: empate correcto

Datos:

- Pronostico: `0-0`.
- Resultado valido: `1-1`.

Resultado esperado:

- Empate correcto.
- `Puntos obtenidos`: `1`.
- En `PUNTUACION`, `Empates acertados` aumenta en 1.

## Caso 11: resultado incorrecto

Datos:

- Pronostico: `2-0`.
- Resultado valido: `0-1`.

Resultado esperado:

- `Puntos obtenidos`: `0`.

## Caso 12: eliminacion directa a 90 minutos

Configuracion:

- Resultado valido: `90_MINUTOS`.

Datos:

- 90 minutos: `1-1`.
- Tiempo extra: `2-1`.
- Penales: vacio.

Resultado esperado:

- Se puntua usando `1-1`.
- Un pronostico `1-1` obtiene marcador exacto.

## Caso 13: eliminacion directa con tiempos extra

Configuracion:

- Resultado valido: `TIEMPOS_EXTRA`.

Datos:

- 90 minutos: `1-1`.
- Tiempo extra: `2-1`.

Resultado esperado:

- Se puntua usando `2-1`.

## Caso 14: final incluyendo penales

Configuracion:

- Resultado valido: `FINAL_CON_PENALES`.

Datos:

- 90 minutos: `1-1`.
- Tiempo extra: `1-1`.
- Penales: `4-3`.

Resultado esperado:

- Se puntua usando penales si estan capturados como resultado valido.
- Si `Resultado valido local/visitante` esta lleno, tiene prioridad.

## Caso 15: auditoria

Pasos:

1. Ejecutar setup.
2. Registrar participante.
3. Enviar pronostico.
4. Recalcular.
5. Crear respaldo.

Resultado esperado:

- `AUDITORIA` tiene entradas con timestamp, usuario, accion, hoja, detalles y resultado.

## Caso 16: respaldo manual

Pasos:

1. Ejecutar `Crear respaldo`.
2. Abrir el enlace mostrado.

Resultado esperado:

- Existe una copia del archivo con sufijo `BACKUP yyyyMMdd-HHmmss`.
- La accion se registra en `AUDITORIA`.

## Caso 17: archivo separado por grupo

Pasos:

1. Configurar nombre de grupo.
2. Ejecutar `Crear archivo para grupo`.
3. Abrir archivo nuevo.

Resultado esperado:

- El archivo nuevo existe.
- Conserva estructura, configuracion, reglas y protecciones.
- La accion se registra en auditoria del maestro.

## Caso 18: API mock

Pasos:

1. Ejecutar `loadMockMatches()` desde Apps Script.
2. Ejecutar `Quiniela 2026 > Cargar resultados mock`.

Resultado esperado:

- `PARTIDOS` se actualiza con resultados mock.
- Se recalculan puntuaciones.
- No se requiere API key real.
