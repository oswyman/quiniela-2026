# Formulas sugeridas para Google Sheets

Estas formulas son opcionales. El MVP calcula desde Apps Script, pero las formulas ayudan a auditar o crear vistas auxiliares.

Nota: segun la configuracion regional de Google Sheets, puede que necesites cambiar `,` por `;`.

## Detectar pronosticos tardios

En `PRONOSTICOS!L2`:

```text
=IF(I2+J2>VLOOKUP(D2,PARTIDOS!A:H,6,FALSE)+VLOOKUP(D2,PARTIDOS!A:H,7,FALSE),"SI","NO")
```

## Estado de pronostico segun cierre

En `PRONOSTICOS!K2`:

```text
=IF(L2="SI","TARDIO","VALIDO")
```

## Sumar puntos por participante

En `PUNTUACION!D2`:

```text
=SUMIF(PRONOSTICOS!B:B,A2,PRONOSTICOS!M:M)
```

## Contar marcadores exactos

Si agregas una columna auxiliar `Tipo acierto` en `PRONOSTICOS`, puedes usar:

```text
=COUNTIFS(PRONOSTICOS!B:B,A2,PRONOSTICOS!N:N,"MARCADOR_EXACTO")
```

## Generar ranking por grupo

En una vista auxiliar:

```text
=SORT(FILTER(PUNTUACION!A:J,PUNTUACION!C:C="Grupo Demo"),4,FALSE,5,FALSE,9,FALSE)
```

## Detectar empates en ranking

En `RANKING`, columna auxiliar:

```text
=COUNTIFS(E:E,E2,F:F,F2,G:G,G2)>1
```

## Calcular bolsa

En `PREMIOS!E2`:

```text
=C2*D2
```

## Calcular premios default para 2 participantes

Primer lugar:

```text
=IF(C2=2,E2,0)
```

Segundo lugar:

```text
=IF(C2=2,0,0)
```

## Calcular premios default para 3 participantes

Primer lugar:

```text
=IF(C2=3,E2*70%,0)
```

Segundo lugar:

```text
=IF(C2=3,E2*30%,0)
```

Tercer lugar:

```text
=IF(C2=3,0,0)
```

## Calcular premios default para 4 o mas participantes

Primer lugar:

```text
=IF(C2>=4,E2*60%,0)
```

Segundo lugar:

```text
=IF(C2>=4,E2*30%,0)
```

Tercer lugar:

```text
=IF(C2>=4,E2*10%,0)
```

## Formula unica de premios por cantidad de participantes

Primer lugar:

```text
=IFS(C2=2,E2,C2=3,E2*70%,C2>=4,E2*60%)
```

Segundo lugar:

```text
=IFS(C2=2,0,C2=3,E2*30%,C2>=4,E2*30%)
```

Tercer lugar:

```text
=IFS(C2<=3,0,C2>=4,E2*10%)
```

## Filtrar por grupo

Participantes de un grupo:

```text
=FILTER(PARTICIPANTES!A:G,PARTICIPANTES!D:D="Grupo Demo")
```

Pronosticos de un grupo, cruzando por participante:

```text
=FILTER(PRONOSTICOS!A:M,ISNUMBER(MATCH(PRONOSTICOS!B:B,FILTER(PARTICIPANTES!A:A,PARTICIPANTES!D:D="Grupo Demo"),0)))
```

## Mostrar partidos pendientes

```text
=FILTER(PARTIDOS!A:Q,PARTIDOS!I:I<>"FINALIZADO")
```

## Mostrar partidos sin resultado valido

```text
=FILTER(PARTIDOS!A:Q,(PARTIDOS!P:P="")+(PARTIDOS!Q:Q=""))
```

## Pronosticos validos por participante

```text
=COUNTIFS(PRONOSTICOS!B:B,A2,PRONOSTICOS!K:K,"VALIDO")
```

## Pronosticos tardios por participante

```text
=COUNTIFS(PRONOSTICOS!B:B,A2,PRONOSTICOS!L:L,"SI")
```

## Auditoria por accion

```text
=FILTER(AUDITORIA!A:G,AUDITORIA!C:C="RECALCULAR_TODO")
```
