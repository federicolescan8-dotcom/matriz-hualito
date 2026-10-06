# Matriz Hualito

Herramienta interna (SaaS más adelante) que crea la **identidad digital** de una marca y genera sus **publicaciones
para redes** con control de calidad automático. Hoy funciona como creadora de publicaciones; el replanteo en curso la
convierte también en herramienta de identidad (ver `docs/replanteo.md`).

El usuario escribe en español rioplatense. Respondé, comentá el código y escribí la documentación en ese mismo español.

## Documentos que hay que leer
| Documento | Qué es | Cuándo leerlo |
|---|---|---|
| `docs/manual-v1.1.md` | **Manual de diseño**: las reglas del sistema (paleta, tipografía, biblioteca, layout, checklist). Es la especificación: el código la implementa. | Antes de tocar `app/src/engine` o el aspecto de una pieza. |
| `docs/manual-tecnico.md` | **Manual técnico**: arquitectura, flujo de datos, módulos y cómo correr, probar y verificar. | Al empezar cualquier sesión. |
| `docs/replanteo.md` | **Hoja de ruta** del replanteo marca → rasgos propios → sistema, por etapas. | Al tomar una issue de una etapa. |
| `app/AGENTS.md` | Aviso de Next.js 16: tiene cambios que rompen con versiones anteriores; leé `app/node_modules/next/dist/docs/` antes de usar una API de Next. | Antes de tocar rutas, layouts o config de Next. |

## Regla obligatoria: el manual se actualiza con cada cambio
Todo cambio que altere comportamiento, reglas, interfaz o arquitectura **no está terminado** hasta que el subagente
`manual` (`.claude/agents/manual.md`) actualizó los manuales. Antes de cerrar la tarea o de commitear:

1. Invocá el subagente `manual` con un resumen de qué cambió y por qué, y la lista de archivos tocados.
2. Revisá su diff: el manual de diseño suma una entrada numerada en "Cambios respecto de la versión 1.0" y edita la
   sección afectada; el técnico refleja módulos, archivos o comandos nuevos.
3. Commiteá código y manuales juntos.

Cambios que no requieren actualizar el manual: refactors sin cambio de comportamiento, tests, typos.

## Comandos (desde `app/`)
```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```
En Windows usar `npm.cmd`/`npx.cmd` (PowerShell bloquea `npm.ps1`). La exportación a PNG usa Edge o Chrome; en Linux o
en la nube: `npx playwright-core install chromium`.

## Convenciones
- **El motor es puro.** `app/src/engine` es TypeScript sin React ni DOM, testeado regla por regla contra el manual.
  Toda regla nueva va ahí, con su test, y el componente solo la dibuja.
- **Lo que se ve es lo que se exporta.** `components/Pieza.tsx` dibuja la pieza a tamaño real; la vista previa la
  escala con CSS y `/api/render` la fotografía con Playwright. No dupliques el render.
- **Medir, no adivinar.** El ajuste de texto y el checklist trabajan con las cajas reales del DOM (`lib/medicion.ts`).
- **Comentarios** en español, explicando el porqué y citando el capítulo del manual cuando corresponde.
- **Datos:** sin Supabase configurado, las marcas viven en `localStorage` del navegador. Nunca subas `.env*`.
- Antes de commitear: `npm test`, `npm run typecheck` y `npm run lint` limpios.
