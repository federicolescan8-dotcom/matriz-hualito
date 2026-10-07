# Replanteo: de creadora de publicaciones a herramienta de identidad

## Por qué
Hoy el orden es **rubro → fórmula → marca**: el rubro define casi todo y la fórmula garantiza que la pieza sea
correcta. El resultado son marcas **correctas pero parecidas**: dos panaderías salen casi iguales, porque comparten la
familia tipográfica del rubro, sus formas, sus patrones y su estructura.

El replanteo invierte el orden: **marca → rasgos propios → sistema**.
1. Del logo y de los atributos de la marca salen 2 o 3 caminos de identidad.
2. El cliente elige un camino, y de ese camino salen sus **rasgos propios**: forma, patrón, tratamiento de foto y
   tipografía en par.
3. Con la identidad armada se generan las publicaciones, organizadas por tipo de contenido.

El motor actual de reglas (contraste, jerarquía, zonas seguras, formatos, checklist) **no se tira**. Queda como el
control de calidad que corre debajo de todo, no como lo que define cómo se ve la marca.

## Principios
- **Lo que hace única a la marca va primero.** La biblioteca del rubro es un punto de partida, no el resultado.
- **Explorar antes de decidir.** Se presentan caminos alternativos, no una sola fórmula con variantes de matiz.
- **Entregar identidad, no solo PNG:** manual de marca, kit de archivos y plantillas editables.
- **Pensar por tipo de contenido.** El cliente piensa en "promo" o "testimonio", no en "variante 2B-L".
- **El rigor no se negocia, pero se puede justificar.** Romper una regla a propósito queda registrado, no bloqueado.
- **La herramienta no reemplaza al diseñador.** Lo que un diseñador resuelve mejor y más rápido con Illustrator,
  Photoshop o Corel (vectorizar, dibujar el logo y sus versiones, la forma propia) se hace afuera y se carga. La
  herramienta lo pide con un brief, lo controla y lo aplica.

## Etapas
Cada etapa es una issue de GitHub. Al cerrarla, el subagente `manual` marca la etapa como hecha acá y actualiza los
manuales.

### E1 · Reordenar la aplicación: Marca → Identidad → Publicaciones · [x] hecha
- **Objetivo:** que la navegación cuente el proceso nuevo.
  - *Marca*: diagnóstico y datos.
  - *Identidad*: el sistema visual, en una vista dedicada en lugar de la ficha de hoy.
  - *Publicaciones*: lo que hoy es Publicar.
- **Alcance:**
  - nueva ruta `/identidad/[marca]` con secciones de color, tipografía, logo, recursos gráficos y fotografía (al principio, las de hoy reordenadas);
  - `Marca` gana un campo `identidad` que agrupa lo visual, con migración de las marcas guardadas;
  - Publicar lee solo de `identidad`.
- **Aceptación:**
  - las marcas existentes cargan sin perder datos;
  - la navegación sigue el orden nuevo;
  - tests y checklist igual que antes.

### E9 · Niveles de regla y control con justificación · [x] hecha · depende de E1
- **Quedó:** `NivelRegla` en cada `Control`, `Pieza.aceptaciones` (viaja al render), `Marca.historial` y "Historial de decisiones" en `/marcas`, etiquetas y "Aceptar con justificación" en `Checklist.tsx`. Pendiente: el carrusel aún no permite aceptar avisos.
- **Por qué va acá:** es chica y habilita todo lo demás. Sin ella, cada decisión creativa que se sale de la fórmula
  choca contra un control que bloquea.
- **Alcance:**
  - **tres niveles de regla**, visibles en la interfaz y en el checklist:
    - **bloqueante**: legibilidad crítica (texto bajo 3:1, texto tapado, fuera de la zona de la plataforma). No se
      puede aceptar;
    - **aviso**: contraste bajo 4,5:1 por decisión del cliente y reglas de estilo. Se puede aceptar con justificación;
    - **sugerencia**: lo que hoy fija el rubro (rango de matiz, familia, alineación). Se muestra, no frena;
  - un control que falla en nivel *aviso* se **acepta con justificación**: queda registrado quién, cuándo y por qué,
    igual que hoy los ajustes manuales de paleta.
- **Aceptación:**
  - cada control del checklist tiene su nivel;
  - la pieza aceptada se exporta y la justificación aparece en el checklist y en el historial.

### E12 · Diagnóstico abierto · [x] hecha · depende de E9
> Quedó: 6 ejes continuos (`engine/ejes.ts`) que deciden familia, rango de matiz y acento; rubro como semilla con mezcla y rubro libre; contenido real en las vistas previas; migración de marcas anteriores; diagnóstico editable (`/?editar=<id>`) con navegación libre. Falta: las fotos del cliente en las vistas previas (E6).
- **Por qué:** hoy el diagnóstico es un menú cerrado (4 rubros, 2 tonos, 4 valores) y el rubro decide casi todo. Dos
  marcas del mismo rubro arrancan iguales.
- **Alcance:**
  - **ejes continuos** de personalidad, en lugar de tono y valor: clásico ↔ moderno, sobrio ↔ expresivo,
    artesanal ↔ tecnológico, cálido ↔ frío, accesible ↔ premium, serio ↔ lúdico;
  - el **rubro es una semilla**: precarga los ejes y la biblioteca, se puede **mezclar** (café + librería) o elegir
    "otro";
  - las decisiones salen de los ejes y no del rubro (por ejemplo, cálido ↔ frío y energía → rango de matiz;
    clásico ↔ moderno y sobrio ↔ expresivo → familia). Los presets de hoy quedan como valores por defecto y como
    *sugerencia* (E9);
  - **contenido real del cliente desde el inicio**: nombre, productos o servicios, fotos. Todas las vistas previas lo
    usan en lugar de los textos de ejemplo;
  - el diagnóstico es **editable después** y se recorre sin orden fijo: cambiar un eje regenera lo que sale de él y
    respeta lo fijado a mano.
- **Aceptación:**
  - dos marcas del mismo rubro con ejes distintos arrancan con paleta y tipografía distintas;
  - las marcas existentes se migran a ejes equivalentes a su tono y valor, sin cambiar su identidad.

### E3 · Laboratorio de color y tipografía en par · [x] hecha · depende de E9
- **Estado:** E3a hecha: laboratorio de color (armonías, bloquear y regenerar, extraer de logo, foto o pantalla, daltonismo) y paleta extendida (2 secundarios y neutro oscuro, usados como color de la decoración de plantilla). E3b hecha: catálogo de 12 familias con clases, par display + texto con regla de combinación en vivo y pares sugeridos, y fuente propia (WOFF2, WOFF, TTF u OTF) subida desde la identidad.
- **Alcance:**
  - **laboratorio de color**, para explorar en vivo:
    - selector libre (rueda, HEX y cuentagotas sobre el logo o una foto) y **armonías** (análoga, complementaria,
      triádica, complementaria dividida);
    - **bloquear y regenerar**: se fija un color y se piden otras opciones para el resto;
    - el validador acompaña sin frenar: contraste en vivo y el color válido más cercano (`colorValidoCercano`,
      `colorPorContraste`) como sugerencia;
    - **extraer la paleta** de un logo, una foto o el moodboard;
    - **simulación de daltonismo** de la paleta;
  - **paleta extendida:** 2 o 3 secundarios armónicos, un neutro oscuro y varios colores heredados respetados a la vez,
    todo validado con `controlesPaleta`;
  - **tipografía:**
    - catálogo curado más amplio que las 6 familias de hoy, etiquetado por los ejes de E12;
    - par display + texto (por ejemplo, Fraunces en títulos e Inter en texto), con reglas de combinación, comparado en
      vivo con los textos del cliente;
    - **tipografía propia:** subir una fuente (WOFF2) a la marca.
- **Aceptación:**
  - se puede llegar a una paleta que no salió de la fórmula y el sistema dice qué cumple y qué no;
  - las piezas usan los secundarios con reglas de rol (nunca en texto si no contrastan);
  - el par tipográfico respeta la jerarquía del H1;
  - el manual de diseño suma las reglas.

### E13 · Modo sesión con el cliente y versiones · [x] hecha · depende de E3
> Quedó: versiones con nombre, favorita, comparación de 2 o 3 con lista de diferencias, deshacer/rehacer del borrador (`engine/versiones.ts`, `PanelVersiones`); modo presentación `/presentacion/[marca]` con portada, colores, tipografía, feed de 9, story, tarjeta, cartel y aprobación (autor, fecha, comentario); estado de la marca; Publicaciones usa la versión aprobada. Falta: el link para que el cliente vea la presentación desde su casa, que necesita acceso sin login (hoy se presenta en la computadora del estudio o con la sesión del equipo en Supabase). "Otra variación" la da el laboratorio de color (E3a, "Otras opciones").
- **Por qué:** la herramienta se usa con el cliente al lado. Hoy sirve para que el diseñador arme, no para decidir
  juntos.
- **Alcance:**
  - **versiones de la identidad**: instantáneas con nombre, deshacer y rehacer, volver a una versión y comparar dos;
  - **comparar 2 o 3 opciones lado a lado**, marcar favoritas y pedir "otra variación";
  - **modo presentación**: pantalla completa, sin jerga técnica (ΔE, HSL, ratios), con piezas grandes y el contenido
    real del cliente;
  - **mockups en contexto**: grilla de 9 posts del feed de Instagram, story en un teléfono, tarjeta y cartel;
  - **aprobación**: link para compartir, comentarios y registro de quién aprobó qué versión y cuándo (con Supabase);
  - **estado de la marca**, para trabajar como estudio: en diagnóstico, en identidad, aprobada, en producción.
- **Aceptación:**
  - en una sesión se pueden probar opciones, volver atrás sin perder nada y dejar aprobada una versión;
  - la versión aprobada es la que usa Publicaciones.

### E2 · Rasgos propios de la marca · [x] hecha · depende de E3
> Quedó: `engine/recursos.ts` (formas propias normalizadas a la caja 0-100, paramétricas con semilla desde los ejes, patrón propio, detalle subrayado o marco), carga de SVG del diseñador (`contornoDeSvg`), `RasgosPropios.tsx` en Recursos gráficos, y lo propio primero en la capa 2B, los patrones y la forma de fondo. El detalle recurrente quedó en subrayado y marco (el sticker no se hizo).
- **Objetivo:** que cada marca tenga recursos que solo tenga ella.
- **Alcance:**
  - **forma propia** y **patrón propio**: los dibuja el diseñador (Illustrator, Corel) y **se cargan como SVG** a la
    marca. La herramienta no vectoriza ni simplifica el logo;
  - como atajo opcional, **formas paramétricas con semilla** (mancha orgánica, radio de esquina, trazo) derivadas de
    los ejes de E12;
  - **detalle recurrente**: subrayado, sticker o marco con la tinta de la marca.

  La capa decorativa (2B), las decoraciones de plantilla y la forma de fondo usan primero los recursos propios.
- **Aceptación:**
  - dos marcas del mismo rubro, con recursos propios distintos, generan piezas reconociblemente distintas, comparadas
    lado a lado en un panel;
  - los recursos cargados se respetan en todos los formatos y el checklist mide su contorno real.

### E4 · Logo como sistema · [x] hecha · depende de E1
> Quedó: versiones del logo (horizontal, vertical, símbolo, monograma) elegidas por pieza según el lugar (`elegirVersionLogo`), monocromo derivado de los SVG, logo sobre foto en mono, placa o sombra, tres avisos en el checklist (tamaño mínimo, área de seguridad y contraste con el fondo), `engine/entregables.ts` (brief del logo y paleta en ASE, CSS y JSON) y `SistemaLogo.tsx` en la identidad. Observación pendiente, ya existía antes de E4: en 1200×630 la variante 2 con un logo cargado da "Contenido dentro del margen" (bloqueante).
- **Criterio:** el logo y sus versiones los hace un diseñador con Illustrator, Photoshop o Corel. La herramienta
  **pide, recibe y controla**; no genera versiones.
- **Alcance:**
  - **pedido al diseñador**: un brief generado con las versiones que hacen falta, los colores exactos, el área de
    seguridad y el tamaño mínimo por formato;
  - **ranuras de carga** en SVG: horizontal, vertical, solo símbolo, monograma, y sus monocromos claro y oscuro;
  - **exportar la paleta en ASE** (además de JSON y CSS) para usar los colores exactos en Illustrator, Photoshop o
    Corel;
  - reglas para usar el logo sobre foto (placa, versión mono o sombra);
  - el checklist mide el área de seguridad, el tamaño mínimo y el contraste del logo sobre cada fondo.
- **Aceptación:** cada pieza elige la versión cargada que corresponde según el espacio y el fondo, y el checklist lo
  verifica.

### E11 · Rescate de marca existente · [x] hecha · depende de E3 y E4
> Quedó: `engine/rescate.ts` y `components/RescateMarca.tsx` (sección "Rescate" de la identidad): grado de cambio, carga múltiple de referencias, agrupación por ΔE < 10, informe, canónicos por grado aplicados a roles o secundarios, brief del diseñador y antes y después (guardar el antes, comparación A/B, HTML descargable). No se hizo: vectorizar el logo ni detectar la tipografía (los resuelve el diseñador con el brief), ni la recomendación automática de tipografía.
- **Por qué:** la mayoría de los clientes ya tiene logo y colores, pero mal resueltos. Aparecen:
  - logos en baja resolución, distintos en cada red o hechos con IA con detalles que no escalan;
  - el "mismo" color en varios tonos (Instagram, cartel, Canva, imprenta);
  - tipografías mezcladas.

  Piden un rebranding que no se aleje de lo que ya tienen. No se crea una identidad nueva: se **audita, se normaliza y
  se evoluciona** lo existente.
- **Grado de cambio**, que se acuerda con el cliente y define cuánto puede mover la fórmula:

  | Grado | Qué cambia | Libertad de la fórmula |
  |---|---|---|
  | **Rescate** | Nada visible: se limpia y se fija lo que existe | Todo heredado. Lo que no cumple queda como aviso |
  | **Refresco** | Ajustes finos: color más preciso, tipografía de apoyo, logo redibujado fiel | Sugerencias del color válido más próximo dentro del grupo de tonos del cliente |
  | **Evolución** | Cambios notorios pero reconocibles: logo simplificado, otro color, otra tipografía | Sugerencias libres, siempre comparadas contra lo actual |

- **Se divide en tres partes:**
  - **E11a · Auditoría de color** (automática, barata: el código ya existe):
    - **carga múltiple de referencias:** logos en todas sus versiones, capturas de redes y fotos de cartel, packaging o
      tarjetas;
    - se muestrean los colores de todas las fuentes y se agrupan por ΔE (`distanciaColor`). Los tonos a menos de ~10 se
      toman como el mismo color que se fue corriendo. El informe dice, por ejemplo, "tu verde aparece en 4 tonos";
    - **color canónico por grupo:** en rescate, el más usado o el del logo original; en refresco, el más cercano al
      grupo que cumpla los contrastes (`colorValidoCercano`). Si la marca usa de verdad 2 o 3 colores distintos, se
      respetan todos con roles: marca, apoyo y acento (paleta extendida de E3);
  - **E11b · Logo y tipografía** (los resuelve el diseñador, guiado por un brief que arma la herramienta):
    - el brief incluye las versiones que circulan, la de referencia sugerida, los colores canónicos y el grado de
      cambio acordado;
    - el diseñador vectoriza, limpia (curvas irregulares, letras deformadas por IA, degradados que no escalan), rearma
      el texto con la tipografía más parecida y entrega las versiones de E4;
    - la regla del refresco: puestos lado a lado, el logo nuevo y el viejo tienen que leerse como el mismo, pero más
      prolijo;
    - **tipografía:** la del logo, o la más parecida, pasa a ser la display, en par con una de texto del catálogo (E3).
      Si el cliente ya usa una de Canva en todas partes, en rescate se mantiene o se reemplaza por su equivalente web;
      en refresco, por la más parecida con buen rango de pesos;
  - **E11c · Antes y después:** las piezas actuales del cliente al lado de las nuevas, como herramienta de venta y de
    aprobación (usa las versiones de E13).
- **Aceptación:**
  - con referencias inconsistentes, el sistema detecta los grupos de color y propone un canónico por grupo;
  - el grado elegido limita cuánto se aleja la identidad final de lo actual;
  - el brief del logo sale completo y el logo cargado pasa los controles de E4;
  - el antes y después se puede exportar.
- **Relación con E5:** en una marca existente, la exploración de caminos pasa a ser la elección del grado de cambio.
  E5 queda para marcas nuevas.

### E5 · Exploración de caminos · [x] hecha · depende de E12, E2, E3 y E4
> Quedó: `engine/caminos.ts` y, en el diagnóstico, "Referencias del cliente" (moodboard por colores extraídos y competencia, que extiende la banda prohibida del color de marca) y "Ver caminos": 3 caminos deterministas (fiel, más expresivo, más sobrio y, con moodboard, uno desde su matiz dominante) con ejes, color, par tipográfico y forma propia, que difieren en matiz o familia; el elegido pasa a ser la identidad. No se hizo: la pieza de ejemplo completa por camino ni su presentación con el modo sesión de E13 (hoy son tarjetas con muestras A y B), subir referencias por opciones sin imagen, y que el acento evite la competencia.
- **Alcance:**
  - moodboard: el cliente sube referencias o elige entre opciones;
  - competencia: colores y estilos a evitar, que extienden la banda prohibida.

  Con eso y los ejes de E12 se generan **2 o 3 caminos**, cada uno con paleta, tipografía, recursos propios y una pieza
  de ejemplo, presentados con el modo sesión de E13. El cliente elige uno.
- **Aceptación:** los caminos difieren de forma visible y el elegido se guarda como la identidad de la marca.

### E6 · Fotografía de marca · [x] hecha · depende de E1
> Quedó: `engine/fotografia.ts` (tratamiento natural, gradación y duotono generado de la paleta con `feColorMatrix`, igual en pieza, PNG y medición; encuadre con punto focal; protección degradado, placa o zona limpia; dirección de arte). Variante F "Texto sobre foto" (solo con fotos habilitadas) y contraste medido sobre la imagen real (`medirContrasteSobreFoto`, percentil 5%) con los controles "H1 grande sobre la foto" (3:1) y "Body sobre la foto" (4,5:1). En Identidad › Fotografía, selector con vista previa, intensidad y guía. No se hizo: quitar el fondo de las fotos ni detectar automáticamente la zona limpia (se elige a mano).
- **Alcance:**
  - **tratamiento propio:** gradación de color de la marca, duotono y recorte de fondo;
  - **recorte inteligente:** con punto focal;
  - **variante nueva "texto sobre foto":** con protección de contraste mediante degradado, placa o zona limpia, medida por el checklist.
  - **dirección de arte**: qué fotos sí y cuáles no (luz, encuadre, fondo), para el manual de marca (E8).
- **Aceptación:** una foto cargada sale con el mismo tratamiento en todas las piezas, y el texto sobre foto cumple 4,5:1 medido sobre la imagen real.

### E7 · Plantillas por tipo de contenido · [x] hecha · depende de E6
> Quedó: `engine/contenidos.ts` con los 7 tipos (campos propios con límite, variante sugerida y respaldo por marca), `textoSugerido` con el contenido real del cliente y `armarPieza`. Publicaciones arranca por tarjetas de tipo, con campos prellenados y "Sin tipo" para el modo anterior; el tip ofrece el carrusel. Pestaña "Grilla del feed" (pieza actual más 8 de `piezasDeGrilla`) con `PiezaEscalada`. Los 7 tipos aprueban con sus textos sugeridos en dos marcas. Observación: la variante 4 da revisión manual ("el texto no entra") si el body es null, por eso antes y después lleva "Qué cambió" en el body. No se hizo: grilla con piezas ya exportadas ni persistencia del tipo y sus campos.
- **Alcance:** Publicaciones arranca por el tipo de contenido:
  - promoción (con precio y vigencia);
  - testimonio;
  - tip o educativo (encaja con el carrusel);
  - lanzamiento;
  - evento (fecha, hora y lugar);
  - preguntas frecuentes;
  - antes y después.

  Cada tipo sugiere variante, formato y campos, y reutiliza las variantes actuales.

  Suma la **vista de grilla del feed**: las próximas publicaciones en la grilla de Instagram, para revisar el ritmo de
  modos y la coherencia entre piezas.
- **Aceptación:** elegir un tipo arma una pieza completa con campos propios, y el texto sugerido entra en los límites de la variante.

### E8 · Entregables de identidad · [x] hecha · depende de E2, E3, E4 y E13
> Quedó: manual de marca en PDF A4 vertical (`/api/manual` fotografía `/manual/[marca]` con Playwright, mismo motor que el PNG) con portada que declara la versión aprobada, colores (HEX, RGB y roles), tipografía, logo y reglas, recursos propios y fotografía (si la marca los tiene) y 4 ejemplos de `piezasDeGrilla`. Kit ZIP con `logos/` (SVG, versiones, monocromos y PNG de 1000 px), `paleta/` (ASE, JSON, CSS y `tokens-figma.json` W3C), `tipografias/` (enlaces a Google Fonts y fuente propia), `recursos/` (formas y patrón en SVG), `brief-logo.md` y `LEEME.txt`. Botones en Identidad. No se hizo: plantillas SVG editables (opcionales) ni foto de muestra del tratamiento en el manual. Corrección de paso: `piezasDeGrilla` pasa el body a la variante 4.
- **Alcance:**
  - **manual de marca en PDF**, generado con el mismo motor de render: portada, paleta con códigos, tipografía, logo y sus reglas, recursos y ejemplos de piezas;
  - **kit en ZIP:**
    - los logos cargados en E4, en SVG y PNG, en todas sus versiones;
    - la paleta en ASE, JSON y CSS, y los tokens en un formato que Figma pueda importar;
    - las tipografías o sus enlaces;
    - los recursos propios de E2;
    - plantillas editables en SVG (opcional: el diseñador las puede rearmar con los recursos del kit).
- **Aceptación:** una marca completa exporta el manual y el kit, y el PDF refleja la versión aprobada de la identidad (E13).

### E14 · Identidad verbal · [ ] pendiente · depende de E12
- **Por qué:** una identidad no es solo visual. Cómo habla la marca define tanto como sus colores.
- **Alcance:**
  - tono de voz derivado de los ejes de E12, con ejemplos de "así sí / así no";
  - tagline, palabras propias y palabras prohibidas, vocabulario de CTA;
  - los textos sugeridos de E7 y los textos alternativos de las imágenes respetan el tono (se puede apoyar en la API
    de Claude para proponer copys);
  - una sección en el manual de marca (E8).
- **Aceptación:** los textos sugeridos de dos marcas con ejes distintos suenan distinto y entran en los límites de cada
  variante.

### E10 · Movimiento y formatos nuevos · [ ] pendiente · depende de E7
- **Alcance:**
  - animaciones simples de entrada (texto y forma) para stories y portadas de Reel, exportadas a MP4 o GIF;
  - formatos del roadmap: portada de Reel 9:16, portadas de Destacadas de Instagram, portada de Facebook (1640×624), banner de LinkedIn (1584×396) y posts de LinkedIn.
- **Aceptación:** cada formato nuevo tiene zonas seguras, checklist y render verificados.

## Orden sugerido
E1 → **E9** → **E12** → E3 → **E13** → E2 → E4 → E11 (a, b, c) → E5 → E6 → E7 → E8 → **E14** → E10.
- **E9 primero:** es chica y libera las decisiones creativas que hoy chocan contra un control que bloquea.
- **E12 y E3 antes que E2:** el diagnóstico abierto, el color y la tipografía son lo que más diferencia a una marca y
  lo más barato de construir.
- **E13 temprano:** la herramienta se usa con el cliente al lado; comparar, volver atrás y aprobar hacen falta desde
  la primera sesión.
- **E11 antes que E5:** la mayoría de los clientes ya tiene una marca, así que el rescate es el caso más frecuente.
- **E10 al final:** depende de E7.
