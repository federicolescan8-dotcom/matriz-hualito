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
| next/font (Google) | 12 familias variables (`lib/fuentes.ts`): Inter, Manrope, Fraunces, Sora, Newsreader, Space Grotesk, más Playfair Display, Literata, DM Sans, Work Sans, Outfit y Bricolage Grotesque (E3b, con `preload: false`: se bajan cuando una pieza las usa). La fuente propia de la marca se registra con `FontFace` |
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
   - **Diagnóstico** (`/`, `app/diagnostico/Diagnostico.tsx`): un asistente de 5 pasos, con navegación libre entre ellos (con el nombre cargado; el resultado pide un color elegido):
     - marca: nombre, rubro como punto de partida, mezcla con otro rubro, rubro libre y contenido del cliente (oferta, mensaje, apoyo, CTA);
     - personalidad: 6 sliders (ejes), "Volver al punto de partida" y un panel en vivo con la tipografía (el nombre en esa familia), la franja del rango de color y el tipo de acento; además, la pregunta del color previo y excluido. Cambiar de rubro vuelve los ejes a la semilla;
     - color, con chips aplicados a piezas reales; si el color previo del cliente no alcanza como texto, ofrece la opción con o sin versión funcional;
     - logo;
     - resultado, que muestra `IdentidadMarca`.

     Arma el objeto `Marca` (`engine/diagnostico.ts › construirMarca`). Al guardar, la marca pasa a ser la *marca activa* y se ofrece seguir con su identidad (`/identidad/[id]`).
     - **Edición:** `/?editar=<id>` (la página `/` lee `searchParams`) abre el asistente con `diagnosticoDeMarca(marca)`. Al guardar, `reconstruirMarca(anterior, d, chip)` conserva id, organización, fecha, historial y gráficos, y vuelve a aplicar los colores ajustados a mano.
     - **Contenido real:** `textosPara(rubro, contenido)` (`components/PiezaMuestra.tsx`) usa el contenido del cliente y completa con el ejemplo del rubro; lo usan los chips del diagnóstico, la prueba de la identidad y la pieza inicial de Publicaciones. `piezaNueva` nombra los ítems del catálogo con la oferta.
   - **Datos** (`/marcas`): la lista de marcas (un clic la vuelve la marca activa) y, para la activa, los datos del diagnóstico: rubro, mezcla, rubro libre, ejes, contenido, personalidad, color previo, matiz excluido, decisión de color, tipografía previa, fotos propias del diagnóstico y fecha. Botones: Editar diagnóstico, Ver identidad, Publicar con esta marca, Exportar JSON y Borrar. Ya no edita la paleta.
2. **Identidad** (`/identidad/[marca]`: `app/identidad/[marca]/page.tsx`, server con `await params`, y `VistaIdentidad.tsx`, cliente): la vista del sistema visual de la marca (`components/IdentidadMarca.tsx`). Abrirla vuelve a esa marca la marca activa. `/identidad` (`app/identidad/page.tsx`) redirige a la identidad de la marca activa o pide hacer un diagnóstico. Tiene un índice de secciones con ancla (`SECCIONES_IDENTIDAD`):
   - prueba Modo A / Modo B con texto de ejemplo, arriba;
   - **Color**: paleta con ajuste manual por HEX y sugerencias de color válido, opción con o sin versión funcional, CTA en Modo B, secuencia de modo, y el laboratorio (`components/LaboratorioColor.tsx`, solo cuando se puede editar): bloquear roles y "Ver otras opciones" (3 alternativas con muestra Modo A y B), tomar colores del logo, de una foto o de la pantalla (EyeDropper, donde exista) con `lib/imagen.ts › pixelesDeImagen` (imagen reducida a 72 px con canvas), paleta extendida por armonía (sumar, reemplazar, quitar) y "Ver la identidad como" con filtro SVG `feColorMatrix` (mismas matrices del motor) sobre toda la vista;
   - **Tipografía** (`components/ParTipografico.tsx`, E3b): selectores de display y de texto agrupados por clase, la regla del par en vivo (`controlPar`), pares sugeridos (`paresSugeridos`) y la carga de la fuente propia (WOFF2, WOFF, TTF u OTF, con su clase, que queda como opción "Propia"); quitarla vuelve a la familia de los ejes si estaba en uso;
   - **Logo**;
   - **Recursos gráficos**: al inicio, los rasgos propios (`components/RasgosPropios.tsx`, E2): formas propias (la primera es la principal ★; "principal", "quitar"), "Subir SVG del diseñador" (`lib/imagen.ts › contornoDeSvg`: dibuja el SVG fuera de pantalla, toma la figura de mayor superficie, con sus transformaciones, y muestrea 360 puntos; no vectoriza ni simplifica), "Generar con los ejes" ("otra", "usar"), patrón propio (casilla) y detalle recurrente (select). Después, estilo de íconos, formas, patrones e íconos del rubro;
   - **Fotografía**: el check de fotos propias.

   Los cambios quedan en borrador hasta **Confirmar cambios** (o **Descartar**). El botón **Publicar con esta identidad** se deshabilita mientras haya cambios sin confirmar.

   **Versiones (E13).** El borrador tiene deshacer y rehacer (botones ↶ ↷ y Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z fuera de campos de texto) con la pila pura de `versiones.ts`. Arriba de la identidad, `components/PanelVersiones.tsx`: guardar versión con nombre (confirma los cambios), lista con favorita (★), "Volver a esta" (queda en el borrador), "Aprobar", tildar 2 o 3 para compararlas lado a lado (Modo A y B) con `diferencias`, aviso de versión aprobada o cambios sin aprobar (`cambiosSinAprobar`) y el botón "Presentar al cliente".
   - **Presentación** (`/presentacion/[marca]`: `page.tsx`, server con `await params`, y `Presentacion.tsx`, cliente): sin la navegación de la app, pantalla completa (⛶) y flechas del teclado. `?version=<id>` muestra una versión; sin parámetro, la identidad actual. Diapositivas: Portada, Colores (nombres simples y HEX, sin ratios), Tipografía, Feed (9 piezas con `piezasDeGrilla`), Story (9:16 en un marco de teléfono), Tarjeta (frente y dorso), Cartel y Aprobación. Las piezas son el componente real `Pieza` escalado.
   - **Aprobación:** en la última diapositiva se escribe quién aprueba y un comentario. Aprobar la versión mostrada llama a `aprobarVersion`; si se muestra la identidad actual, antes se guarda como versión "Presentada el…". También se pueden dejar comentarios en la versión (`comentarVersion`). Pendiente: el link para el cliente desde su casa necesita acceso sin login; hoy se presenta en la computadora del estudio o con la sesión del equipo.
3. **Publicaciones** (`/publicar`, antes Publicar): bajo el título dice "Usa la identidad confirmada de {marca} · ajustar la identidad", con un link a `/identidad/[id]`; si hay versión aprobada dice "Usa la versión aprobada". Lee de `marca.identidad`, salvo que haya una versión aprobada: `marcaParaPublicar(marca)` (E13) reemplaza la identidad por la aprobada y se memoriza con `useMemo` (una referencia nueva en cada render recrearía la pieza inicial sin fin). Para guardar el historial se usa la marca guardada, no la de publicar, porque si no se pisaría la identidad actual con la aprobada. Tiene dos modos.
   - **Publicación simple:** canal, formato, variante, modo, alineación, textos y elementos gráficos. Muestra vista previa, guías, todos los formatos y la hoja de contactos. Exporta un PNG o un ZIP con los 4 formatos.
   - **Carrusel 4:5** (`components/PublicarCarrusel.tsx`): portada, puntos y cierre, con el control de la serie. Exporta un ZIP con un PNG por slide.

## 4. Motor (`app/src/engine`)
| Módulo | Responsabilidad |
|---|---|
| `color.ts` | HSL ↔ RGB ↔ HEX (exacto), contraste WCAG, mezcla con alfa, ΔE en CIELAB, OKLCH |
| `presets.ts` | Rubros: rango de matiz, secuencia de modos, familias, alineaciones, variantes prioritarias. Tipos `Variante`, `Modo`, `Rubro` |
| `palette.ts` | Fórmula de paleta (`derivarPaleta`, cap. 3): modo optimizado y heredado (con o sin versión funcional), acento y su texto, CTA en Modo A, Modo B y sobre cualquier fondo, `controlesPaleta`/`fallasPaleta`, sugerencias (`colorValidoCercano`) |
| `ejes.ts` | Ejes continuos de personalidad (E12), 6 de 0 a 100. `EJES_RUBRO` (semilla por rubro), `ejesSemilla(rubro, secundario)` (promedio si hay mezcla), `ejesDesdePersonalidad(rubro, tono, valor)` (migración), `familiaDeEjes` con `FAMILIAS_EN_EJES`, `rangoMatiz(ejes, rubro, secundario)`, `valorDeEjes`, `tonoDeEjes` |
| `typography.ts` | Familias (`FAMILIAS`, `CLASE_FAMILIA`, `ALTURA_X`; `resolverTipografia` con prioridad: previa del cliente > sugerida por los ejes > preset del rubro según tono), peso del H1 según el largo, escala, compensación óptica, jerarquía (`JERARQUIA_H1`, `CTA_MIN`). Par (E3b): `familiaTexto(t)`, `controlPar(display, texto)`, `paresSugeridos(display)` (hasta 4, sans primero) y `elegirPar(t, display, texto, italicaRubro)`, que toma la itálica de la familia de texto; la compensación óptica del body (`compensacionOptica`, `plantillaPara`) también usa la de texto |
| `diagnostico.ts` | `Diagnostico` (suma `ejes`, `rubro_secundario`, `rubro_libre` y `contenido: ContenidoCliente`) → `Marca`: chips (`generarChips` usa el rango de `rangoMatiz`, no el H_rango fijo del rubro), `valorDiagnostico(d)` (valor guardado o el de los ejes), `diagnosticoDeMarca` y `reconstruirMarca` (edición), ajustes manuales (`ajustarColorMarca`, `restaurarColorMarca`), elección de versión funcional y CTA en Modo B (`elegirVersionFuncional`, `puedeElegirFuncional`, `elegirCtaModoB`). Todas leen y modifican `marca.identidad`. También `registrarEnHistorial` (suma una `EntradaHistorial` a `marca.historial`) |
| `laboratorio.ts` | Laboratorio de color (E3a, cap. 3). `ARMONIAS` y `paletaExtendida(paleta, armonia)` (2 secundarios con `texto` solo si llegan a 4,5:1, y neutro oscuro), `revalidarExtendida`; `regenerarPaleta(actual, bloqueados, entrada, semilla, cantidad=3)` con PRNG mulberry32 (determinista), que devuelve alternativas ordenadas (las que cumplen primero, sin repetidas a ΔE < 4); `extraerColores(pixeles, k=5)` (k-medias en RGB); daltonismo: `MATRICES_DALTONISMO`, `simularDaltonismo`, `confusionesDaltonismo` (`DELTA_CONFUSION` = 12). `diagnostico.ts › aplicarAlternativa(marca, alt)` aplica una alternativa |
| `identidad.ts` | Tipo `Identidad` (todo lo visual de la marca) y migración de marcas guardadas antes de E1: `migrarMarca`, `esMarcaV1`, tipo `MarcaV1` |
| `recursos.ts` | Rasgos propios (E2, cap. 5). `RecursosPropios { formas, patron_propio?, detalle? }` en `identidad.recursos`; prefijo de id `propia-`. `normalizarContorno(puntos)` lleva un contorno muestreado a un trazado `M…L…Z` en la caja 0-100 (escala uniforme, centrado), así la forma propia se dibuja y se mide como las de la biblioteca (el `clipPath path` del 2B-L). `formaParametrica(semilla, ejes)`: mulberry32 con los ejes (artesanal y lúdico: mancha de 3 a 6 lóbulos; tecnológico: superelipse), curva Catmull-Rom → Bézier |
| `biblioteca.ts` | Formas, patrones, íconos y contenedores por rubro; opacidades y overlay. E2: `CategoriaForma` suma "propias", `Patron` suma "propio"; `resolverForma(id, propias)`, `formasDeco(rubro, recursos)` y `patronesDeco(rubro, recursos)` ponen lo propio primero; `decoPorDefecto` y `decoEfectiva` los usan |
| `decoraciones.ts` | Decoraciones de plantilla (arco lateral, esquinas en diagonal) como geometría de círculos |
| `formatos.ts` | Formatos (4:5, 1:1, 9:16, 1200×630) con márgenes, zonas de interfaz y recorte de grilla, y canales (IG feed y stories, WA estados, FB feed, link) |
| `pieza.ts` | Objeto `Pieza` (con `aceptaciones?: Aceptacion[]`, `aceptarControl`, `quitarAceptacion`), plantillas por variante (1, 2, 2B-L, 2B-S, 3, 4, P) y ajustes por formato, capa decorativa efectiva, geometría del 2B-L. `piezasDeGrilla` (E13) arma las 9 piezas del feed de la presentación: rota variantes empezando por las prioritarias del rubro y sigue la secuencia de modos |
| `carrusel.ts` | `Carrusel`/`Slide`, `piezaDeSlide` (cada slide pasa a ser una pieza simple), modos por rol, `evaluarCarrusel` |
| `checklist.ts` | `evaluarPieza(marca, pieza, medicion)`: controles de color, tipografía, composición, zonas seguras y contenido. Estado `ok`, `rechazado` o `revision_manual`, con controles *aceptados* (decisión del cliente) y *avisos*. Cada `Control` lleva un `nivel` (`NivelRegla`: `bloqueante`, `aviso` o `sugerencia`; `add` usa `aviso` por defecto). `estadoDe` da `ok` si cada control cumple, está aceptado o es sugerencia. `aplicarAceptaciones` marca `aceptado` + `justificacion` solo en avisos que fallan; la excepción v1.1 de color acepta los controles de color que fallan salvo los bloqueantes (`nivelTexto(valor)`: bajo `MIN_GRAFICO` es bloqueante, si no aviso) |
| `versiones.ts` | Versiones y aprobación (E13, cap. 9). Tipos `VersionIdentidad` y `EstadoMarca` (en_diagnostico, en_identidad, aprobada, en_produccion); `estadoMarca(m)` (deduce "aprobada" o "en_identidad" si no se fijó). `guardarVersion`, `restaurarVersion` (la versión sigue guardada), `marcarFavorita`, `comentarVersion`, `aprobarVersion` (autor, fecha y comentario; fija `version_aprobada` y estado), `marcaParaPublicar`, `cambiosSinAprobar`, `diferencias(a, b)` (lista legible: colores por rol en HEX, tipografías, íconos, fotos, paleta extendida, logo). Deshacer puro: `deshacerNuevo`, `registrarPaso` (descarta lo deshecho, hasta 50 pasos), `deshacer`, `rehacer` |
| `logo.ts` | Recoloreo de SVG para las versiones monocromas |

## 5. Del dato al PNG
1. `components/Pieza.tsx` dibuja la pieza a tamaño real (por ejemplo 1080×1350). Lo hace a partir de `Marca` + `Pieza` y `plantillaPara(variante, formato)`. H1 y H2 van en la familia display (`familia_variable`); body, CTA, contacto e ítems del catálogo, en la de texto (`familiaTexto`). `PiezaMuestra.tsx` y la muestra de la identidad hacen lo mismo.
2. Antes de medir, `Pieza.tsx` espera `lib/fuentes.ts › cargarFuentePropia` y `asegurarFamilias([display, texto])` (pide las familias con `document.fonts.load`, porque `document.fonts.ready` no espera una fuente que nadie pidió todavía) y recién después `document.fonts.ready`. Así `/api/render` también mide con la fuente real. `fontFamily()` nombra tal cual las familias que no son del catálogo (la propia).
3. Al montarse, `lib/medicion.ts › ajustarTexto` hace una búsqueda binaria del tamaño del H1, el body y el CTA contra las cajas reales de las letras. Respeta:
   - la jerarquía (H1 ≥ 2× body y CTA);
   - las líneas máximas;
   - el contorno real de la capa decorativa.

   En el 2B-L también elige la posición del círculo.
4. `medirPieza` arma la `Medicion` y `evaluarPieza` corre el checklist. La pieza marca `data-listo="true"`.
5. **Vista previa:** la misma pieza escalada con CSS. **Exportación:** `lib/exportar.ts › renderizar` hace un POST a `/api/render`. Ese endpoint:
   - abre `/render` en Playwright;
   - inyecta `window.__RENDER__` y espera `window.__RESULTADO__`;
   - devuelve el PNG solo si el estado es `ok`. Si no, responde 422 con el checklist.

## 6. Datos
- `Marca` (ver `engine/diagnostico.ts`) tiene en la raíz solo `id`, `organizacion_id`, `nombre`, `rubro`, `diagnostico`, `version_manual` y `creada`. Todo lo visual vive en `marca.identidad` (tipo `Identidad`, `engine/identidad.ts`):
  - `color`: `modo`, `base`, `version_funcional`, `banda_prohibida` y `solo_heredado`;
  - `paleta`;
  - `paleta_calculada` y `ajustes_manuales`, con lo que la fórmula había calculado y qué se cambió a mano;
  - `tipografia` (`familia_variable` = display, `familia_texto?` para body, CTA, contacto e ítems, y `propia?: { nombre, archivo (data URL), clase }` con la fuente subida) y `logo` (data URL);
  - `graficos`, obligatorio: `{ estilo_iconos }`;
  - `recursos?` (E2, `engine/recursos.ts`): `{ formas, patron_propio?, detalle?: "subrayado" | "marco" | null }`. `Pieza.tsx` y los componentes `FormaSvg`, `FormaRellena`, `FotoEnForma` y `PatronSvg` (Graficos) reciben las formas propias; la forma de fondo usa la principal (sin propias, el círculo, con la misma opacidad segura); el detalle se dibuja en `Pieza.tsx` (subrayado del H1 con `text-decoration`, 0,07 em de grosor y 0,12 em de desplazamiento; marco de 6 px a la mitad de la `zonaMinima`), en el acento si contrasta 3:1 con el fondo o en el color del texto. El editor de la capa decorativa de Publicaciones muestra primero lo propio;
  - `fotos_habilitadas`;
  - `paleta_extendida?` (E3a): `{ armonia, secundarios[2], neutro_oscuro }`, opcional. Se recalcula con `revalidarExtendida` al ajustar un color a mano o aplicar una alternativa.

  Los lectores (`Pieza.tsx`, `EditoresPieza.tsx`, `checklist.ts`, `pieza.ts` y Publicaciones) leen de `marca.identidad.*`.
- `Pieza.color_decoracion?: number | null` (`engine/pieza.ts`): índice del secundario de `paleta_extendida` con el que se dibuja la decoración de plantilla; `null` o ausente es el tono de apoyo. `Pieza.tsx` lo usa con la misma `opacidadSegura` de Modo A; el editor de decoración de Publicaciones lo muestra solo si la marca tiene paleta extendida.
- `Marca.versiones?: VersionIdentidad[]` (`{ id, nombre, autor, fecha, identidad, favorita?, comentarios?, aprobacion? }`), `Marca.version_aprobada?` y `Marca.estado?: EstadoMarca` (E13, `engine/versiones.ts`). `/marcas` muestra la etiqueta de estado en cada tarjeta y un selector de estado en los datos. `reconstruirMarca` (edición del diagnóstico) conserva versiones, versión aprobada y estado.
- `Marca.historial?: EntradaHistorial[]`: decisiones de la marca, `{ tipo: "aceptacion", control, motivo, autor, fecha, pieza }`. Al aceptar un aviso en Publicaciones (`app/publicar/page.tsx`) se guarda la marca con la entrada; `/marcas` la muestra en "Historial de decisiones". La aceptación misma vive en `Pieza.aceptaciones` y viaja a `/api/render`, por eso el render del servidor la respeta y exporta.
- `components/Checklist.tsx` muestra una etiqueta de nivel en cada control que falla. En los avisos, si recibe `onAceptar`, ofrece "Aceptar con justificación" (campo de motivo); los aceptados muestran autor, fecha y motivo con "Quitar", y los bloqueantes avisan que no se pueden aceptar. Publicaciones conecta `onAceptar`/`onQuitar` (autor: email de la sesión o "estudio (modo local)"); el carrusel todavía no lo conecta.
- **Migración** (`engine/identidad.ts › migrarMarca`): lleva una marca guardada antes de E1 (`MarcaV1`, con lo visual en la raíz) al formato nuevo sin perder datos. Si no tenía `graficos`, fija el estilo de íconos del rubro, que era lo que valía por defecto. Las marcas ya migradas pasan tal cual (misma referencia); `esMarcaV1` detecta el formato viejo. Se aplica en:
  - `lib/marcas.ts › marcasDelNavegador`: migra y reescribe `localStorage` una sola vez, sin emitir evento;
  - `cargarRemotas` (Supabase): migra al leer; la fila queda en el formato nuevo en el próximo guardado;
  - `/api/render`: un JSON viejo se migra antes de renderizar.

  `migrarMarca` también migra el diagnóstico anterior a E12 (sin `ejes`): ejes con `ejesDesdePersonalidad(rubro, tono, valor)` (la semilla corrida por cada respuesta), `rubro_secundario` y `rubro_libre` en null, contenido vacío. La identidad guardada no cambia.
- `Diagnostico.ejes`, `rubro_secundario`, `rubro_libre` y `contenido` (`oferta` hasta 4, `mensaje`, `apoyo`, `cta`) se guardan en `marca.diagnostico`; `personalidad` (tono y valor) sigue guardándose, derivada de los ejes.
- Almacenamiento (`lib/marcas.ts`):
  - **con Supabase:** tablas `organizaciones`, `miembros` y `marcas`, con RLS por `mi_organizacion()`;
  - **sin Supabase:** la clave `hualito.marcas.v1` en `localStorage`;
  - **marca activa:** la clave `hualito.marcaActiva`.
- Configuración de Supabase: `docs/configurar-supabase.md`. Las claves van en `app/.env.local`, nunca en el repo.

## 7. Tests y verificación
- `npm test`: más de 120 tests (138 con E2, con `recursos.test.ts`: normalización, determinismo de la paramétrica, lo propio primero y dos marcas del mismo rubro con capas distintas) del motor, entre ellos:
  - toda la rueda de matices por rubro;
  - grillas de colores heredados;
  - el checklist con mediciones sintéticas;
  - el carrusel;
  - las sugerencias de color;
  - el laboratorio (`laboratorio.test.ts`): armonías, secundarios, regeneración con semilla, extracción y daltonismo.
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
