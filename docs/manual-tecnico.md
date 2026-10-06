# Manual técnico · Matriz Hualito

Cómo está construida la aplicación. Las **reglas de diseño** están en `docs/manual-v1.1.md`; este documento explica
**dónde** y **cómo** el código las implementa. Lo mantiene actualizado el subagente `manual` (`.claude/agents/manual.md`).

## 1. Stack
| Pieza | Uso |
|---|---|
| Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind 4 | Aplicación web (`app/`) |
| Vitest | Tests del motor (`app/src/engine/*.test.ts`) |
| playwright-core | Render a PNG en el servidor (Edge → Chrome → Chromium de Playwright) |
| fflate | ZIP de exportación (todos los formatos, carrusel) |
| @phosphor-icons/react | 60 íconos de la biblioteca, en estilo lineal y sólido |
| next/font (Google) | Familias variables: Inter, Manrope, Fraunces, Sora, Newsreader, Space Grotesk |
| Supabase (opcional) | Base de marcas multi-organización con RLS y login por enlace mágico. Sin `.env.local`, modo local |

## 2. Estructura
```
app/src/
  engine/       Motor puro (sin React ni DOM): reglas del manual, testeadas
  lib/          Puente con el navegador: medición del DOM, almacenamiento, exportación, sesión
  components/   Dibujo: la pieza, sus editores, la identidad de la marca, el checklist
  app/          Rutas de Next: diagnóstico, marcas, identidad, publicar, render, api/render, login
docs/           Manual de diseño, manual técnico, replanteo, configuración de Supabase
supabase/       schema.sql (tablas, RLS, semilla)
```

## 3. Flujo de la aplicación
La navegación (`components/Navegacion.tsx`) cuenta el proceso en tres pasos numerados: **1 Marca → 2 Identidad → 3 Publicaciones**.

1. **Marca** (activa en `/` y `/marcas`): el diagnóstico y los datos.
   - **Diagnóstico** (`/`, `app/diagnostico/Diagnostico.tsx`): un asistente de 5 pasos:
     - rubro;
     - personalidad;
     - color, con chips aplicados a piezas reales; si el color previo del cliente no alcanza como texto, ofrece la opción con o sin versión funcional;
     - logo;
     - resultado, que muestra `IdentidadMarca`.

     Arma el objeto `Marca` (`engine/diagnostico.ts › construirMarca`). Al guardar, la marca pasa a ser la *marca activa* y se ofrece seguir con su identidad (`/identidad/[id]`).
   - **Datos** (`/marcas`): la lista de marcas (un clic la vuelve la marca activa) y, para la activa, los datos del diagnóstico: rubro, personalidad, color previo, matiz excluido, decisión de color, tipografía previa, fotos propias del diagnóstico y fecha. Botones: Ver identidad, Publicar con esta marca, Exportar JSON y Borrar. Ya no edita la paleta.
2. **Identidad** (`/identidad/[marca]`: `app/identidad/[marca]/page.tsx`, server con `await params`, y `VistaIdentidad.tsx`, cliente): la vista del sistema visual de la marca (`components/IdentidadMarca.tsx`). Abrirla vuelve a esa marca la marca activa. `/identidad` (`app/identidad/page.tsx`) redirige a la identidad de la marca activa o pide hacer un diagnóstico. Tiene un índice de secciones con ancla (`SECCIONES_IDENTIDAD`):
   - prueba Modo A / Modo B con texto de ejemplo, arriba;
   - **Color**: paleta con ajuste manual por HEX y sugerencias de color válido, opción con o sin versión funcional, CTA en Modo B, secuencia de modo;
   - **Tipografía**;
   - **Logo**;
   - **Recursos gráficos**: estilo de íconos, formas, patrones e íconos del rubro;
   - **Fotografía**: el check de fotos propias.

   Los cambios quedan en borrador hasta **Confirmar cambios** (o **Descartar**). El botón **Publicar con esta identidad** se deshabilita mientras haya cambios sin confirmar.
3. **Publicaciones** (`/publicar`, antes Publicar): bajo el título dice "Usa la identidad confirmada de {marca} · ajustar la identidad", con un link a `/identidad/[id]`. Lee solo de `marca.identidad`. Tiene dos modos.
   - **Publicación simple:** canal, formato, variante, modo, alineación, textos y elementos gráficos. Muestra vista previa, guías, todos los formatos y la hoja de contactos. Exporta un PNG o un ZIP con los 4 formatos.
   - **Carrusel 4:5** (`components/PublicarCarrusel.tsx`): portada, puntos y cierre, con el control de la serie. Exporta un ZIP con un PNG por slide.

## 4. Motor (`app/src/engine`)
| Módulo | Responsabilidad |
|---|---|
| `color.ts` | HSL ↔ RGB ↔ HEX (exacto), contraste WCAG, mezcla con alfa, ΔE en CIELAB, OKLCH |
| `presets.ts` | Rubros: rango de matiz, secuencia de modos, familias, alineaciones, variantes prioritarias. Tipos `Variante`, `Modo`, `Rubro` |
| `palette.ts` | Fórmula de paleta (`derivarPaleta`, cap. 3): modo optimizado y heredado (con o sin versión funcional), acento y su texto, CTA en Modo A, Modo B y sobre cualquier fondo, `controlesPaleta`/`fallasPaleta`, sugerencias (`colorValidoCercano`) |
| `typography.ts` | Familias, peso del H1 según el largo, escala, compensación óptica, jerarquía (`JERARQUIA_H1`, `CTA_MIN`) |
| `diagnostico.ts` | `Diagnostico` → `Marca`: chips, ajustes manuales (`ajustarColorMarca`, `restaurarColorMarca`), elección de versión funcional y CTA en Modo B (`elegirVersionFuncional`, `puedeElegirFuncional`, `elegirCtaModoB`). Todas leen y modifican `marca.identidad`. También `registrarEnHistorial` (suma una `EntradaHistorial` a `marca.historial`) |
| `identidad.ts` | Tipo `Identidad` (todo lo visual de la marca) y migración de marcas guardadas antes de E1: `migrarMarca`, `esMarcaV1`, tipo `MarcaV1` |
| `biblioteca.ts` | Formas, patrones, íconos y contenedores por rubro; opacidades y overlay |
| `decoraciones.ts` | Decoraciones de plantilla (arco lateral, esquinas en diagonal) como geometría de círculos |
| `formatos.ts` | Formatos (4:5, 1:1, 9:16, 1200×630) con márgenes, zonas de interfaz y recorte de grilla, y canales (IG feed y stories, WA estados, FB feed, link) |
| `pieza.ts` | Objeto `Pieza` (con `aceptaciones?: Aceptacion[]`, `aceptarControl`, `quitarAceptacion`), plantillas por variante (1, 2, 2B-L, 2B-S, 3, 4, P) y ajustes por formato, capa decorativa efectiva, geometría del 2B-L |
| `carrusel.ts` | `Carrusel`/`Slide`, `piezaDeSlide` (cada slide pasa a ser una pieza simple), modos por rol, `evaluarCarrusel` |
| `checklist.ts` | `evaluarPieza(marca, pieza, medicion)`: controles de color, tipografía, composición, zonas seguras y contenido. Estado `ok`, `rechazado` o `revision_manual`, con controles *aceptados* (decisión del cliente) y *avisos*. Cada `Control` lleva un `nivel` (`NivelRegla`: `bloqueante`, `aviso` o `sugerencia`; `add` usa `aviso` por defecto). `estadoDe` da `ok` si cada control cumple, está aceptado o es sugerencia. `aplicarAceptaciones` marca `aceptado` + `justificacion` solo en avisos que fallan; la excepción v1.1 de color acepta los controles de color que fallan salvo los bloqueantes (`nivelTexto(valor)`: bajo `MIN_GRAFICO` es bloqueante, si no aviso) |
| `logo.ts` | Recoloreo de SVG para las versiones monocromas |

## 5. Del dato al PNG
1. `components/Pieza.tsx` dibuja la pieza a tamaño real (por ejemplo 1080×1350). Lo hace a partir de `Marca` + `Pieza` y `plantillaPara(variante, formato)`.
2. Al montarse, `lib/medicion.ts › ajustarTexto` hace una búsqueda binaria del tamaño del H1, el body y el CTA contra las cajas reales de las letras. Respeta:
   - la jerarquía (H1 ≥ 2× body y CTA);
   - las líneas máximas;
   - el contorno real de la capa decorativa.

   En el 2B-L también elige la posición del círculo.
3. `medirPieza` arma la `Medicion` y `evaluarPieza` corre el checklist. La pieza marca `data-listo="true"`.
4. **Vista previa:** la misma pieza escalada con CSS. **Exportación:** `lib/exportar.ts › renderizar` hace un POST a `/api/render`. Ese endpoint:
   - abre `/render` en Playwright;
   - inyecta `window.__RENDER__` y espera `window.__RESULTADO__`;
   - devuelve el PNG solo si el estado es `ok`. Si no, responde 422 con el checklist.

## 6. Datos
- `Marca` (ver `engine/diagnostico.ts`) tiene en la raíz solo `id`, `organizacion_id`, `nombre`, `rubro`, `diagnostico`, `version_manual` y `creada`. Todo lo visual vive en `marca.identidad` (tipo `Identidad`, `engine/identidad.ts`):
  - `color`: `modo`, `base`, `version_funcional`, `banda_prohibida` y `solo_heredado`;
  - `paleta`;
  - `paleta_calculada` y `ajustes_manuales`, con lo que la fórmula había calculado y qué se cambió a mano;
  - `tipografia` y `logo` (data URLs);
  - `graficos`, obligatorio: `{ estilo_iconos }`;
  - `fotos_habilitadas`.

  Los lectores (`Pieza.tsx`, `EditoresPieza.tsx`, `checklist.ts`, `pieza.ts` y Publicaciones) leen de `marca.identidad.*`.
- `Marca.historial?: EntradaHistorial[]`: decisiones de la marca, `{ tipo: "aceptacion", control, motivo, autor, fecha, pieza }`. Al aceptar un aviso en Publicaciones (`app/publicar/page.tsx`) se guarda la marca con la entrada; `/marcas` la muestra en "Historial de decisiones". La aceptación misma vive en `Pieza.aceptaciones` y viaja a `/api/render`, por eso el render del servidor la respeta y exporta.
- `components/Checklist.tsx` muestra una etiqueta de nivel en cada control que falla. En los avisos, si recibe `onAceptar`, ofrece "Aceptar con justificación" (campo de motivo); los aceptados muestran autor, fecha y motivo con "Quitar", y los bloqueantes avisan que no se pueden aceptar. Publicaciones conecta `onAceptar`/`onQuitar` (autor: email de la sesión o "estudio (modo local)"); el carrusel todavía no lo conecta.
- **Migración** (`engine/identidad.ts › migrarMarca`): lleva una marca guardada antes de E1 (`MarcaV1`, con lo visual en la raíz) al formato nuevo sin perder datos. Si no tenía `graficos`, fija el estilo de íconos del rubro, que era lo que valía por defecto. Las marcas ya migradas pasan tal cual (misma referencia); `esMarcaV1` detecta el formato viejo. Se aplica en:
  - `lib/marcas.ts › marcasDelNavegador`: migra y reescribe `localStorage` una sola vez, sin emitir evento;
  - `cargarRemotas` (Supabase): migra al leer; la fila queda en el formato nuevo en el próximo guardado;
  - `/api/render`: un JSON viejo se migra antes de renderizar.
- Almacenamiento (`lib/marcas.ts`):
  - **con Supabase:** tablas `organizaciones`, `miembros` y `marcas`, con RLS por `mi_organizacion()`;
  - **sin Supabase:** la clave `hualito.marcas.v1` en `localStorage`;
  - **marca activa:** la clave `hualito.marcaActiva`.
- Configuración de Supabase: `docs/configurar-supabase.md`. Las claves van en `app/.env.local`, nunca en el repo.

## 7. Tests y verificación
- `npm test`: más de 100 tests del motor, entre ellos:
  - toda la rueda de matices por rubro;
  - grillas de colores heredados;
  - el checklist con mediciones sintéticas;
  - el carrusel;
  - las sugerencias de color.
- Un cambio visual no se da por bueno solo con tests: **renderizá la pieza** y mirala.
  - **Opción 1, en la app:** abrir `/publicar` y activar las **Guías** y la **Hoja de contactos**.
  - **Opción 2, por API, de forma reproducible:** POST a `http://localhost:3000/api/render` con `{ marca, pieza }`. Responde PNG si aprueba o 422 con `resultado.controles`. Conviene generar la `Pieza` con el motor (`piezaNueva`, `piezaDeSlide`) para no armarla a mano.
- Las marcas de prueba van en el `localStorage` del navegador de prueba. No pises las marcas reales del usuario.

## 8. Cómo extender
| Quiero… | Dónde |
|---|---|
| una regla de diseño nueva | función en `engine/`, su test y una entrada en el manual de diseño |
| un control del checklist | `engine/checklist.ts › evaluarPieza`, con su test en `checklist.test.ts`. Elegí su nivel: `bloqueante` (legibilidad crítica, no se acepta), `aviso` (por defecto, se acepta con justificación) o `sugerencia` (lo que fija el rubro, no frena) |
| una variante de layout | plantilla en `pieza.ts › PLANTILLAS` (y `AJUSTES_FORMATO`) y su composición en `Pieza.tsx` |
| un formato o canal | `formatos.ts`: `FORMATOS`, `CANALES` y el tipo `Formato`/`Canal`; ajustes por variante en `pieza.ts` |
| una decoración de plantilla | una entrada en `decoraciones.ts › DECORACIONES` |
| un dato visual nuevo de la marca | campo en `Identidad` (`engine/identidad.ts`), un paso en `migrarMarca` para las marcas guardadas, y su sección en `components/IdentidadMarca.tsx` (sumada a `SECCIONES_IDENTIDAD`) |
| una forma, un patrón o un ícono | `biblioteca.ts` (y `components/Graficos.tsx` para los íconos) |

## 9. Sesiones en la nube
- Instalar y verificar: `cd app && npm install && npx playwright-core install chromium && npm test`.
- El servidor de desarrollo corre en el puerto 3000. Para los PNG hace falta el Chromium de Playwright, porque en la nube no hay Edge ni Chrome.
- Sin `.env.local`, la app corre en modo local: no hace falta Supabase para trabajar.
