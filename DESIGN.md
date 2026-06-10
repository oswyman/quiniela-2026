---
name: La Cancha
description: Quinielas privadas entre amigos para El Torneo 2026 — la mesa seria donde se juega el pronóstico.
colors:
  stadium-deep: "#061711"
  stadium-night: "#0a241b"
  stadium-green: "#10392d"
  stadium-pitch: "#155844"
  grass-field: "#19735a"
  grass-accent: "#228a6d"
  grass-bright: "#4fc39a"
  trophy-gold-deep: "#94660d"
  trophy-gold: "#b98322"
  trophy-gold-bright: "#d4a642"
  ivory-warm: "#fffdf7"
  ivory-cream: "#f8f3e7"
  ivory-sand: "#eee4d1"
  ink: "#151917"
  success: "#087f5b"
  warn: "#8c5a00"
  danger: "#b42318"
  live-green: "#16a34a"
typography:
  display:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 4.5vw, 2.1rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "22px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
components:
  button-primary:
    backgroundColor: "{colors.stadium-green}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "48px"
  button-gold:
    backgroundColor: "{colors.trophy-gold-bright}"
    textColor: "#211704"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "48px"
  choice-button:
    backgroundColor: "{colors.ivory-warm}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
    height: "80px"
  choice-button-active:
    backgroundColor: "{colors.stadium-green}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px"
    height: "80px"
  card:
    backgroundColor: "{colors.ivory-warm}"
    rounded: "{rounded.md}"
    padding: "20px"
  pill:
    rounded: "{rounded.pill}"
    padding: "8px 10px"
---

# Design System: La Cancha

## 1. Overview

**Creative North Star: "La Mesa del Estadio"**

La Cancha es la seriedad de una mesa de apuestas entre amigos con la energía contenida de un estadio antes del kickoff. El sistema visual combina verdes profundos de estadio nocturno, el verde césped del campo y el dorado del trofeo sobre marfiles cálidos. La tensión del torneo se comunica con datos (countdowns, marcadores, posiciones), nunca con decoración: cada partido tiene peso visual propio y la información que el usuario vino a buscar (su posición, sus pronósticos, cuánto falta para el cierre) nunca compite con adornos.

El sistema rechaza explícitamente la estética de app de apuestas (gradientes neón, UI de casino) y el SaaS genérico cream/blue de dashboard empresarial. Es registro **product**: la UI sirve a la tarea y desaparece en ella. La familiaridad es virtud; la extrañeza sin propósito es el fallo.

**Key Characteristics:**
- Tokens semánticos de dos capas: primitivos de marca constantes + semánticos que cambian por tema (light/dark), todos en `src/app/globals.css`
- Modo claro marfil cálido por defecto; modo oscuro verde-noche verificado WCAG AA (toggle de 3 estados: auto/light/dark)
- Tipografía condensada de marcador (Barlow Condensed 800) solo para títulos y momentos; Barlow para todo lo demás
- Componentes sólidos y directos: pesos 800, píldoras rellenas, cero ambigüedad en la acción principal
- Mobile-first: los pronósticos se hacen desde el teléfono minutos antes del cierre

## 2. Colors

Paleta de estadio nocturno y trofeo: verdes profundos, césped saturado y dorado cálido sobre marfil, sin un solo negro o blanco puro.

### Primary
- **Stadium Green** (#10392d): el accent de acción en modo claro. Botones primarios, selección activa, tabs activas. En modo oscuro el accent migra a **Grass Field** (#19735a) para mantener contraste.
- **Grass Accent** (#228a6d): indicadores de estado positivo, focus rings (al 18% de opacidad), highlight de "mi fila" en rankings.

### Secondary
- **Trophy Gold** (#d4a642 con texto #211704): el CTA de momento (entrar a La Cancha, acciones doradas), badges de pendientes, premios y posición 1 del podio. Es el color de la recompensa, no de la navegación.

### Neutral
- **Ivory Warm** (#fffdf7): fondo y superficies en modo claro. Nunca #fff.
- **Ivory Sand / líneas** (#d2c5a8 borde, #b9ab8c borde fuerte): bordes cálidos, nunca grises fríos.
- **Ink** (#151917): texto principal claro; #e8efe9 en oscuro. Muted #5d6862 (5.7:1 AA verificado).
- **Stadium Deep** (#061711 → #081510 fondo dark): la noche del estadio.

### Estados
- **Success** (#087f5b, bg #ecfdf5) · **Warn** (#8c5a00, bg #fff8df) · **Danger** (#b42318, bg #fff1f0) · **Live** (#16a34a, dot #22c55e pulsante). Cada uno con variantes `-bg` y `-border` por tema.

### Named Rules
**The No-Pure Rule.** Prohibido `#000` y `#fff`. Todo neutro lleva tinte cálido hacia el verde/marfil de la marca.
**The Gold-Is-Reward Rule.** El dorado señala recompensa y urgencia (CTA de entrada, premios, pendientes, podio 1°), jamás navegación ni decoración de fondo.

## 3. Typography

**Display Font:** Barlow Condensed (con system-ui, sans-serif)
**Body Font:** Barlow (con sans-serif)

**Character:** Condensada de marcador de estadio para los momentos (equipos enfrentados, posiciones del podio, héroes); humanista y legible para la tarea. El contraste entre ambas ES la jerarquía.

### Hierarchy
- **Display** (800, clamp 1.45–2.1rem en match cards, hasta clamp 3.2–7.6rem en hero, line-height 1.05): nombres de equipos en match cards, números de podio, hero de landing. Solo Barlow Condensed.
- **Headline** (700–800, --text-2xl 1.5rem): títulos de página y paneles.
- **Body** (400–600, 1rem, 1.5): texto de tarea. Máximo 65–75ch en prosa.
- **Label** (800, --text-xs 0.75rem, letter-spacing 0.05em, UPPERCASE): encabezados de tabla, eyebrows, etiquetas de pills y choice buttons.
- **Datos numéricos**: siempre `font-variant-numeric: tabular-nums` (rankings, marcadores, countdowns).

### Named Rules
**The Scoreboard Rule.** Barlow Condensed aparece solo donde hay emoción de partido (equipos, posiciones, hero). Labels, botones y datos usan Barlow. Display font en un label de formulario es un bug.

## 4. Elevation

Sistema casi plano con capas tonales: la profundidad se comunica con cambios de superficie (`--surface`, `--surface-2`, `--surface-raised`) y bordes cálidos, no con sombras dramáticas. Las sombras existen como respuesta a estado, no como decoración de reposo.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 0 rgba(6,23,17,0.06)`): reposo de cards y paneles. Prácticamente un borde inferior.
- **shadow-md** (`0 18px 46px rgba(6,23,17,0.12)`): hover de cards interactivas y paneles destacados.
- **shadow-lg** (`0 28px 80px rgba(6,23,17,0.2)`): reservada para overlays (toasts, banners).

### Named Rules
**The Flat-At-Rest Rule.** Las superficies están planas en reposo. La sombra media aparece solo con hover/interacción, acompañada de `translateY(-2px)` y transición de 150–160ms con `--ease-out`.

## 5. Components

Sólidos y directos: como un marcador de estadio, cero ambigüedad sobre qué es accionable y qué está seleccionado.

### Buttons
- **Shape:** píldora completa (999px), min-height 48px (44px es el piso absoluto táctil)
- **Primary:** fondo `--accent` (Stadium Green claro / Grass Field oscuro), texto blanco, peso 800
- **Gold:** fondo Trophy Gold Bright (#d4a642), texto #211704; el CTA de momento
- **Secondary:** fondo `--surface-raised`, borde `--border-strong`
- **Hover / Active:** elevación −1/−2px + shadow-md en hover; `scale(0.97)` en active; disabled `opacity 0.56` sin transform

### Match Card (componente firma)
Marcador de partido: fila superior de pills de estado (deadline dorado, countdown ámbar <24h, EN VIVO pulsante, cerrado), equipos enfrentados en grid simétrico `1fr auto 1fr` con "vs" central muted, y choice grid de 3 opciones. El estado vive en el fondo de la card: `--success-bg` acertado, `--danger-bg` fallado, `--bg-2` cerrado, borde verde en vivo. **Nunca barras laterales de color.**

### Choice Buttons
- **Grid:** siempre 3 columnas (Local/Empate/Visita), min-height 80px desktop / 64px móvil
- **Estructura:** label uppercase 800 arriba ("Gana"/"Empate"), equipo con bandera emoji en strong abajo
- **Activo:** relleno sólido `--accent` con texto blanco + focus ring; la selección es inconfundible, no un tinte
- **En card resuelta:** tinte success/danger con texto en tinta normal

### Cards / Containers
- **Corner Style:** 14px (`--radius-md`)
- **Background:** `--surface` con borde 1px `--border`; padding 20px
- **Interactivas:** hover con borde dorado al 62%, shadow-md, −2px

### Pills / Badges
Píldoras 999px, peso 800, una variante semántica por estado (`--deadline` dorado, `--closing` ámbar con tabular-nums, `--tbd` muted, admin/active/closed). El pill ES el sistema de estado de la app.

### Navigation
Header sticky verde-noche translúcido con blur 18px, marca con balón SVG dorado; tabs de fase en píldoras con scroll horizontal sin scrollbar, activa rellena de accent, badge dorado de pendientes o ✓ de fase completa.

### Tablas
Encabezados sticky uppercase muted --text-xs; `tabular-nums` en todas las celdas numéricas; en móvil colapsan a cards. Filas destacadas por tinte de fondo (oro/plata/bronce top 3, verde "tú"), nunca por borde lateral.

## 6. Do's and Don'ts

### Do:
- **Do** usar los tokens semánticos de `globals.css` para todo color nuevo; si un valor no existe como token, créalo en las tres definiciones (light, dark explícito, dark media-query).
- **Do** comunicar urgencia con datos: countdown "Cierra en 2h 14m" en ámbar con tabular-nums, no con animaciones.
- **Do** mantener mínimo táctil de 44px (botones estándar 48px) y verificar contraste AA en ambos temas.
- **Do** usar skeletons (clases `.skeleton*` existentes) para toda carga, nunca "Cargando..." plano.
- **Do** estados completos en cada componente interactivo: default, hover, focus-visible, active, disabled.

### Don't:
- **Don't** usar barras laterales de color (`border-left/right` >1px) como acento en cards, filas o alertas. Se eliminaron de toda la app; el estado va en fondo + borde completo + pill.
- **Don't** usar gradientes neón ni UI de casino: PRODUCT.md prohíbe "apps de fantasy genéricas con gradientes neón y UI de casino".
- **Don't** parecer "SaaS genérico cream/blue ni dashboard de métricas empresariales" (PRODUCT.md). Nada de hero-metric con número gigante + gradiente.
- **Don't** usar "tarjetas idénticas en grid con icon + heading + texto" (PRODUCT.md): variar tamaño, densidad y estructura.
- **Don't** usar `#000`/`#fff`, gradient text (`background-clip: text`), ni glassmorphism decorativo (el blur del header es el único permitido).
- **Don't** animar propiedades de layout; solo opacity/transform con `--ease-out` 150–250ms, y siempre respetando `prefers-reduced-motion`.
- **Don't** usar Barlow Condensed en labels, botones o datos: solo en momentos de partido.
