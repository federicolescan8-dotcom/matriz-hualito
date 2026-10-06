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

## Etapas
Cada etapa es una issue de GitHub. Al cerrarla, el subagente `manual` marca la etapa como hecha acá y actualiza los
manuales.

### E1 · Reordenar la aplicación: Marca → Identidad → Publicaciones · [ ] pendiente
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

### E2 · Rasgos propios de la marca · [ ] pendiente · depende de E1
- **Objetivo:** que cada marca tenga recursos que solo tenga ella.
- **Alcance:**
  - **forma propia**: se elige o se genera a partir del logo (vectorizar el SVG y simplificar una curva o la silueta de una letra);
  - **patrón propio**: repetición de la forma propia o de un detalle del logo;
  - **detalle recurrente**: subrayado, sticker o marco con la tinta de la marca.

  La capa decorativa (2B), las decoraciones de plantilla y la forma de fondo usan primero los recursos propios.
- **Aceptación:**
  - dos marcas del mismo rubro, con logos distintos, generan piezas reconociblemente distintas;
  - los recursos se respetan en todos los formatos y el checklist mide su contorno real.

### E3 · Paleta extendida y tipografía en par · [ ] pendiente · depende de E1
- **Alcance:**
  - **paleta:** 2 o 3 secundarios armónicos, un neutro oscuro y varios colores heredados respetados a la vez, todo validado con `controlesPaleta`;
  - **tipografía:** par display + texto (por ejemplo, Fraunces en títulos e Inter en texto), con reglas de combinación;
  - **tipografía propia:** subir una fuente (WOFF2) a la marca.
- **Aceptación:**
  - las piezas usan los secundarios con reglas de rol (nunca en texto si no contrastan);
  - el par tipográfico respeta la jerarquía del H1;
  - el manual de diseño suma las reglas.

### E4 · Logo como sistema · [ ] pendiente · depende de E1
- **Alcance:**
  - versiones horizontal, vertical, solo símbolo y monograma;
  - área de seguridad y tamaño mínimo por formato;
  - reglas para usarlo sobre foto (placa, versión mono o sombra);
  - el checklist mide el área de seguridad.
- **Aceptación:** cada pieza elige la versión correcta según el espacio y el fondo, y el checklist lo verifica.

### E11 · Rescate de marca existente · [ ] pendiente · depende de E3 y E4
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

- **Alcance:**
  - **carga múltiple de referencias:** logos en todas sus versiones, capturas de redes y fotos de cartel, packaging o tarjetas;
  - **auditoría de color:** se muestrean los colores de todas las fuentes y se agrupan por ΔE (`distanciaColor`). Los tonos a menos de ~10 se toman como el mismo color que se fue corriendo. El informe dice, por ejemplo, "tu verde aparece en 4 tonos";
  - **color canónico por grupo:**
    - en rescate, el más usado o el del logo original;
    - en refresco, el más cercano al grupo que cumpla los contrastes (`colorValidoCercano`).

    Si la marca usa de verdad 2 o 3 colores distintos, se respetan todos con roles: marca, apoyo y acento (paleta extendida de E3);
  - **logo:**
    - se elige la versión de referencia comparando las que circulan;
    - se vectoriza de forma asistida (PNG → SVG) con limpieza de defectos: curvas irregulares, letras deformadas por IA, degradados que no escalan;
    - se detecta la tipografía más parecida para rearmar el texto del logo;
    - se arma el sistema completo de E4.

    La regla del refresco: puestos lado a lado, el logo nuevo y el viejo tienen que leerse como el mismo, pero más prolijo;
  - **tipografía:** la del logo, o la más parecida, pasa a ser la display para títulos, en par con una de texto del catálogo (E3). Si el cliente ya usa una de Canva en todas partes, en rescate se mantiene o se reemplaza por su equivalente web; en refresco, por la más parecida con buen rango de pesos;
  - **antes y después:** las piezas actuales del cliente al lado de las nuevas, como herramienta de venta y de aprobación.
- **Aceptación:**
  - con referencias inconsistentes, el sistema detecta los grupos de color y propone un canónico por grupo;
  - el grado elegido limita cuánto se aleja la identidad final de lo actual;
  - el logo de referencia sale vectorizado con su sistema de versiones;
  - el antes y después se puede exportar.
- **Relación con E5:** en una marca existente, la exploración de caminos pasa a ser la elección del grado de cambio.
  E5 queda para marcas nuevas.

### E5 · Exploración de caminos en el diagnóstico · [ ] pendiente · depende de E2, E3 y E4
- **Alcance:**
  - moodboard: el cliente sube referencias o elige entre opciones;
  - competencia: colores y estilos a evitar, que extienden la banda prohibida;
  - atributos de personalidad.

  Con eso se generan **2 o 3 caminos**, cada uno con paleta, tipografía, recursos propios y una pieza de ejemplo. El cliente elige uno.
- **Aceptación:** los caminos difieren de forma visible y el elegido se guarda como la identidad de la marca.

### E6 · Fotografía de marca · [ ] pendiente · depende de E1
- **Alcance:**
  - **tratamiento propio:** gradación de color de la marca, duotono y recorte de fondo;
  - **recorte inteligente:** con punto focal;
  - **variante nueva "texto sobre foto":** con protección de contraste mediante degradado, placa o zona limpia, medida por el checklist.
- **Aceptación:** una foto cargada sale con el mismo tratamiento en todas las piezas, y el texto sobre foto cumple 4,5:1 medido sobre la imagen real.

### E7 · Plantillas por tipo de contenido · [ ] pendiente · depende de E6
- **Alcance:** Publicaciones arranca por el tipo de contenido:
  - promoción (con precio y vigencia);
  - testimonio;
  - tip o educativo (encaja con el carrusel);
  - lanzamiento;
  - evento (fecha, hora y lugar);
  - preguntas frecuentes;
  - antes y después.

  Cada tipo sugiere variante, formato y campos, y reutiliza las variantes actuales.
- **Aceptación:** elegir un tipo arma una pieza completa con campos propios, y el texto sugerido entra en los límites de la variante.

### E8 · Entregables de identidad · [ ] pendiente · depende de E2, E3 y E4
- **Alcance:**
  - **manual de marca en PDF**, generado con el mismo motor de render: portada, paleta con códigos, tipografía, logo y sus reglas, recursos y ejemplos de piezas;
  - **kit en ZIP:**
    - logos en SVG y PNG en todas sus versiones;
    - la paleta en ASE, JSON y CSS;
    - las tipografías o sus enlaces;
    - plantillas editables en SVG.
- **Aceptación:** una marca completa exporta el manual y el kit, y el PDF refleja la identidad actual.

### E9 · Control con justificación · [ ] pendiente
- **Alcance:** un control del checklist que falla puede **aceptarse con justificación**. Queda registrado quién lo aceptó, cuándo y por qué, igual que hoy pasa con los ajustes manuales de paleta. Los controles de legibilidad crítica (texto bajo 3:1, texto tapado o fuera de la zona de la plataforma) no se pueden aceptar.
- **Aceptación:** la pieza aceptada se exporta y la justificación aparece en el checklist y en el historial.

### E10 · Movimiento y formatos nuevos · [ ] pendiente · depende de E7
- **Alcance:**
  - animaciones simples de entrada (texto y forma) para stories y portadas de Reel, exportadas a MP4 o GIF;
  - formatos del roadmap: portada de Reel 9:16, portadas de Destacadas de Instagram, portada de Facebook (1640×624), banner de LinkedIn (1584×396) y posts de LinkedIn.
- **Aceptación:** cada formato nuevo tiene zonas seguras, checklist y render verificados.

## Orden sugerido
E1 → E2 → E3 → E4 → **E11** → E5 → E6 → E7 → E8 → E9 → E10. E11 va antes de E5 porque la mayoría de los clientes
ya tiene una marca: el rescate es el caso más frecuente. E9 es independiente y se puede hacer en cualquier momento.
