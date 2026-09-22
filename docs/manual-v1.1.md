 Sistema de diseño gráfico automatizado

# Manual de criterio y especificación técnica

**Hualito · Versión 1.1**

Documento interno — agencia y desarrollo

---

## Índice

**Parte I — Manual de criterio**

- Capítulo 1 — Objetivo y alcance del sistema
- Capítulo 2 — Proceso de diagnóstico con el cliente
- Capítulo 3 — Fórmula de paleta de colores
- Capítulo 4 — Sistema tipográfico
- Capítulo 5 — Biblioteca de elementos gráficos
- Capítulo 6 — Grillas de layout por plataforma
- Capítulo 7 — Variantes por rubro
- Capítulo 8 — Checklist de control de calidad

**Parte II — Anexo técnico**

- Capítulo 9 — Especificación técnica para el automatizador
- A.2 a A.8 — Esquemas de datos por capítulo

**Cómo leer este documento.** La Parte I es la de uso comercial: contiene el criterio, las fórmulas y las tablas que se aplican en la reunión con el cliente. La Parte II es la de implementación: reúne el contrato de datos y todos los esquemas que el programador necesita, sin texto explicativo. Cada esquema del anexo corresponde al capítulo del mismo número.

---

## Cambios respecto de la versión 1.0

Resumen breve de los cambios aplicados en esta edición. El detalle de cada uno está marcado en el cuerpo del manual con la nota *(v1.1)*.

1. **Texto sobre fondo acento** — deja de ser blanco fijo: se elige entre blanco, color de marca y tinta de marca (el matiz de la marca a L15), el primero que alcance ≥4,5:1. La tinta se agregó al implementar: con solo blanco o color de marca, casi todas las marcas terminaban con acento amarillo y varios matices dentro del rango de su rubro caían en revisión manual. *(Cap. 3, Cap. 8, A.3, A.8)*
2. **Nuevo Paso 4b — Ajuste del acento** — el acento conserva siempre su matiz y ajusta su L según sea cálido/claro (texto de color de marca) o frío/oscuro (texto blanco), tomando como criterio marcas reales. *(Cap. 3, A.3)*
3. **Complementario corregido a H+180** (antes H+165) y elección de complementario vs. análogo según la pregunta de personalidad 2, con default por rubro. *(Cap. 3, A.3, A.7)*
4. **Preguntas de personalidad ligadas a variables concretas**: la pregunta 1 (seria/cercana) elige la familia tipográfica dentro del par de rubro; la pregunta 2 elige el tipo de acento. *(Cap. 2, Cap. 4, Cap. 7, A.2, A.4, A.7)*
5. **Se elimina la L del color de marca como dato de preset por rubro** — la L siempre sale de la tabla por banda de matiz del capítulo 3. *(Cap. 7, A.7)*
6. **Itálica condicionada también por la familia tipográfica**: `italic_habilitado = rubro lo permite AND la familia tiene itálica`. Sora, Manrope y Space Grotesk no tienen itálica. *(Cap. 4, Cap. 7, A.4, A.7)*
7. **Peso del H1 calculado por cantidad de caracteres** en vez de rango libre 700-900. *(Cap. 4, Cap. 8, A.4, A.8)*
8. **Posición del logo**: coherente por variante, no por marca completa. *(Cap. 8)*
9. **Diagnóstico visual**: los chips de color se muestran aplicados sobre una pieza de ejemplo, no como muestras sueltas. *(Cap. 2, Cap. 3)*
10. **Alcance**: se aclara que el sistema genera piezas pero no las publica. *(Cap. 1)*
11. **Modo heredado sin revisión manual**: versión funcional profundizada (paso 8, 2b) y acento con rango de L ampliado (paso 8, 4). *(Cap. 3)*
12. **Peso del H1 limitado al máximo real de cada familia** (Manrope, Sora y Newsreader 800; Space Grotesk 700). *(Cap. 4)*
13. **Ajuste manual de la paleta en la ficha de marca**: cualquier rol se puede corregir por HEX si el resultado no convence. La paleta calculada se conserva para volver atrás; el texto sobre el acento se vuelve a elegir solo, y los contrastes que no cumplen quedan marcados y bloquean la publicación hasta corregirlos. *(Cap. 3, A.3)*
14. **CTA en Modo B con contorno o invertido**: si el acento no alcanza 3:1 contra el color de marca (p. ej. rojo y verde de luminosidad parecida), el CTA de Modo B se separa con fondo neutro en vez de rechazar la paleta. *(Cap. 3, Cap. 8, A.3)*
15. **CTA en Modo A con contorno**: un acento claro sobre el fondo neutro claro lleva un contorno fino en el color de marca. *(Cap. 3, Cap. 8)*
16. **Proporciones por formato**: tamaños de H1, body, CTA y logo definidos por formato y variante; el ajuste de texto usa las cajas reales de las letras para no pisar el margen. *(Cap. 6, A.6)*
17. **Correcciones de numeración de la extracción del PDF**: cascada del paso 5 (cap. 3), cascada del modo heredado (cap. 3), capas del cap. 9 y pipeline del cap. 9, y limpieza de números de página sueltos.

---

# Parte I

## Manual de criterio

---

## Capítulo 1 — Objetivo y alcance del sistema

### Objetivo del manual

Este documento define el sistema de diseño gráfico que la agencia utiliza para generar, de forma automatizada y consistente, todas las piezas de marca de un cliente a partir de un número mínimo de decisiones tomadas junto a él en la primera reunión.

El sistema no busca reemplazar el criterio de diseño, sino codificarlo en reglas repetibles, de modo que:

- El cliente pueda ver su identidad definida en una sola sesión de trabajo.
- El resultado sea profesional y coherente sin depender de que un diseñador intervenga pieza por pieza.
- El programador tenga un esquema de datos claro para automatizar la generación.

### Alcance

El sistema cubre la generación de piezas gráficas estáticas sobre la siguiente matriz de formatos:

| Plataforma | Formato | Medida | Zona segura |
|---|---|---|---|
| Instagram Feed (post) | 1080×1350 px (4:5) | — | 10-12% de margen en bordes |
| Instagram Feed cuadrado | 1080×1080 px (1:1) | — | 10-12% de margen en bordes |
| Instagram / Facebook | Story | 1080×1920 px (9:16) | 15% superior e inferior reservados |
| WhatsApp | Estado | 1080×1920 px (9:16) | 15% superior e inferior reservados |
| Facebook | Feed (link post) | 1200×630 px | 10% de margen en bordes |

Cada pieza, sea cual sea el formato, se construye a partir de las mismas cuatro variables definidas por el sistema: color, tipografía, elemento gráfico y layout. Lo que cambia entre formatos no es la identidad, sino cómo se reacomoda esa identidad dentro de cada relación de aspecto.

Además, el sistema define la identidad visual mínima viable de cada marca (paleta, tipografía, elementos gráficos de apoyo y layout) y cuatro variantes de configuración según el rubro del cliente: servicios/B2B, gastronomía/retail, belleza/lifestyle y tech/digital.

### Fuera de alcance

- Video o animación.
- Diseño de logo desde cero. El sistema asume que el cliente ya tiene logo, o que se resuelve aparte.
- Piezas para impresión (tarjetas, folletería física).
- **Publicación de las piezas.** El sistema genera el archivo final de cada pieza, pero no la publica: la publicación automática por API queda fuera de alcance. Además, los estados de WhatsApp no tienen API de publicación disponible, por lo que ese canal nunca podría automatizarse de punta a punta aunque se decidiera incorporar publicación automática a futuro. El estado de serie por canal (modo, alineación, variante) se sigue registrando igual, aunque la publicación en sí la haga una persona. *(v1.1)*

### Principio rector

Toda pieza, en cualquiera de los formatos de la matriz, se construye combinando cuatro variables independientes —color, tipografía, elemento gráfico y layout— nunca decisiones sueltas. Si una variable no está definida por estas reglas, no se improvisa: se vuelve a la fórmula del capítulo correspondiente.

---

## Capítulo 2 — Proceso de diagnóstico con el cliente

### Objetivo del capítulo

Definir el procedimiento breve y estandarizado que permite, en una sola reunión, obtener toda la información necesaria para alimentar las fórmulas de los capítulos siguientes. El diagnóstico no debe durar más de 10 a 15 minutos.

### Paso 1 — Identificar el rubro

Antes de cualquier pregunta de gusto o personalidad, se clasifica al cliente en una de las cuatro variantes del sistema:

| Variante | Ejemplos de rubro |
|---|---|
| Servicios / B2B | abogados, contadores, consultoras, inmobiliarias |
| Gastronomía / retail | restaurantes, cafés, tiendas, kioscos, delivery |
| Belleza / lifestyle | estética, spa, fitness, moda, peluquería |
| Tech / digital | apps, software, e-commerce, servicios digitales |

Esta clasificación predetermina rangos de color, criterio de dependencia de imagen y estilo de layout, que se usan como punto de partida (capítulo 7). El diagnóstico posterior ajusta dentro de ese marco, no lo reemplaza.

### Paso 2 — Preguntas de personalidad de marca

Máximo tres preguntas, sin excepción. Cada una alimenta directamente una variable del sistema, no queda como dato descriptivo suelto: *(v1.1)*

1. **¿Si tu marca fuera una persona, es más seria o más cercana?** Define, junto con el rubro, cuál de las dos familias tipográficas del par asignado se usa (capítulo 4, paso 1). *(v1.1)*
2. **¿Querés transmitir confianza, energía, calma o innovación?** Define el tipo de acento: energía o innovación eligen complementario; confianza o calma eligen análogo (capítulo 3, paso 4). *(v1.1)*
3. **¿Hay un color que ya asociás con tu rubro, o uno que definitivamente no querés usar?** Define la banda prohibida y, si corresponde, activa el modo color heredado (sin cambios respecto de v1.0).

Estas preguntas no buscan una respuesta elaborada: buscan una palabra o una elección que el sistema pueda traducir directamente a un valor.

### Paso 3 — Selección visual guiada

En vez de seguir preguntando en abstracto, se le muestran al cliente cuatro chips de color y elige el que siente más cercano a su marca. La mayoría de los clientes no sabe verbalizar gusto visual, pero sí sabe señalar una preferencia cuando la ve.

Los chips no se muestran como muestras de color sueltas: se muestran aplicados sobre una pieza de ejemplo (título, fondo, acento), porque en modo optimizado los amarillos, verdes y turquesas quedan con L25 y, vistos como chip aislado, se perciben mucho más oscuros de lo que después rinden dentro de una pieza real. Si el cliente ya tiene un color previo, junto a la pieza en modo optimizado se muestra también la versión en modo heredado, para que la comparación sea directa. *(v1.1)*

### Paso 4 — Confirmar insumos existentes

**Logo.** No se registra como dato binario sino como un set de versiones. Se le piden al cliente tres:

| Versión | Uso |
|---|---|
| Color | piezas en Modo A, sobre fondo neutro |
| Monocromo claro (blanco o casi blanco) | piezas en Modo B, sobre color de marca |
| Monocromo oscuro (negro o gris oscuro) | fondos claros donde la versión color no contrasta |

Si el cliente solo tiene la versión color, se genera el par monocromo a partir de ella antes de habilitar la marca en el sistema. Es un trabajo de una sola vez por cliente, y sin él la marca no puede operar en Modo B.

**Formato del archivo.** Se requiere vectorial, SVG o PDF. Si el cliente solo tiene un PNG, se acepta con un mínimo de 1000 px de lado mayor y fondo transparente, y se anota como deuda técnica para vectorizar.

**Color corporativo.** Si el cliente ya tiene un color de marca, se registra su valor HEX y se deja asentada la decisión que tome en el capítulo 3: usar el chip optimizado del sistema o conservar su color tal cual.

**Fotografía y tipografía previas.** Se registra si el cliente tiene fotos propias de calidad usable y si tiene una tipografía ya asociada a su marca.

### Salida del diagnóstico

Al terminar los cuatro pasos deben quedar registrados: rubro, matiz elegido, decisión de color (chip optimizado o heredado), personalidad (tono y valor), set de versiones del logo con su formato, disponibilidad de fotos propias y tipografía previa. El esquema exacto está en el anexo A.2.

---

## Capítulo 3 — Fórmula de paleta de colores

### Objetivo del capítulo

Generar, a partir de una sola elección del cliente, una paleta completa de cuatro roles funcionales con contraste garantizado en cualquier matiz del círculo cromático, sin conflicto con colores excluidos y con dos modos de aplicación.

### Los cuatro roles de color

| Rol | Función |
|---|---|
| Color de marca | el tono distintivo y saturado que identifica a la marca |
| Tono de apoyo | variante intermedia para masas de forma, nunca para texto ni íconos |
| Fondo neutro | base de baja saturación y alta luminosidad, espacio negativo |
| Acento | CTA, precio, llamado a la acción |

### Paso 1 — Matiz base

Se le muestran al cliente los cuatro chips anclados al rango de matiz de su personalidad de marca, según la tabla del capítulo 7. El matiz elegido (H) es la única variable libre del sistema.

Si el cliente ya tiene un color corporativo, el procedimiento es el mismo: primero se le presentan los chips optimizados, mostrándole la versión de su matiz ya ajustada por el sistema. El modo por defecto es siempre el chip optimizado, porque garantiza legibilidad y rendimiento en pantalla sin trabajo adicional. El modo heredado (paso 8) se activa solo si, después de ver la propuesta optimizada, el cliente decide expresamente conservar su color tal cual.

Como se describe en el capítulo 2, paso 3, los chips no se muestran como muestras sueltas: se muestran aplicados sobre una pieza de ejemplo, porque en modo optimizado los amarillos, verdes y turquesas rinden distinto sobre superficie que en un chip pequeño. Si el cliente tiene color previo, se agrega al lado la versión en modo heredado sobre la misma pieza de ejemplo. *(v1.1)*

### Paso 2 — Bandas prohibidas

Si el cliente excluyó un color, se registra como una banda de 50°: el matiz mencionado, más y menos 25°. Esta banda se valida sobre el acento en el paso 5.

### Paso 3 — Luminosidad del color de marca según banda de matiz

Con saturación 70%, la luminosidad del color de marca se toma de esta tabla, que garantiza un contraste de entre 5,0:1 y 5,6:1 contra el fondo neutro del mismo matiz:

| Banda de H | Color | L | Contraste |
|---|---|---|---|
| 0-20 | rojos | 42% | 5,2:1 |
| 20-45 | naranjas, terracota | 32% | 5,4:1 |
| 45-70 | amarillos, dorados | 25% | 5,6:1 |
| 70-160 | verdes | 25% | 5,6:1 |
| 160-200 | turquesas | 25% | 5,3:1 |
| 200-250 | azules | 40% | 5,5:1 |
| 250-320 | violetas | 45% | 5,4:1 |
| 320-360 | rosas, magentas | 42% | 5,0:1 |

Un valor fijo de luminosidad no sirve para todo el círculo cromático: la luminosidad percibida cambia de forma continua y los verdes, amarillos y turquesas se leen mucho más claros que un azul o un violeta con la misma L.

Esta tabla es la única fuente de la L del color de marca en todo el sistema: no hay un valor de L por rubro que la reemplace ni la complemente (ver capítulo 7). *(v1.1)*

### Paso 4 — Generación de la paleta

| Rol | HSL |
|---|---|
| Color de marca | H, S 70%, L según tabla del paso 3 |
| Tono de apoyo | H, S 50-55%, L = punto medio entre L(marca) y L(fondo neutro), con tope L ≤ 67% |
| Fondo neutro | H, S 20-30%, L 90-95% |
| Acento | H+180 (complementario) o H+30 (análogo), S 85-90%, L según paso 4b *(v1.1)* |

El tope del tono de apoyo evita que en matices claros quede indistinguible del fondo.

**Elección de complementario vs. análogo.** La elige la pregunta de personalidad 2 (capítulo 2, paso 2): energía o innovación → complementario (H+180, antes H+165 en v1.0, corregido en esta versión); confianza o calma → análogo (H+30). Si el cliente no da una respuesta clara, se usa el default por rubro: gastronomía y tech → complementario; servicios y belleza → análogo (ver capítulo 7 y A.7, campo `acento_default`). *(v1.1)*

### Paso 4b — Ajuste del acento *(v1.1)*

El acento arranca en S85 L50 y **conserva siempre su matiz** — el ajuste de este paso solo mueve la L, nunca el H. El criterio de ajuste sale de observar marcas reales: los acentos cálidos y claros (amarillo de Mercado Libre o de IKEA, naranja de Amazon) funcionan con texto oscuro encima; los acentos fríos y oscuros funcionan con texto blanco.

- **Matiz del acento entre ~35 y 200** (naranjas, amarillos, verdes, cianes): el acento se mantiene luminoso, con L entre 50 y 65, y el texto que va sobre él es del color de marca. Si falta contraste, se sube la L de a 2 puntos dentro de ese rango.
- **Resto de matices** (rojos, rosas, violetas, azules): el texto sobre el acento es blanco. Si falta contraste, se baja la L de a 2 puntos, con un mínimo de L35.

- **Tinta de marca** *(v1.1, agregada en la implementación)*: si el color de marca no alcanza 4,5:1 sobre el acento, el texto pasa a la tinta de marca, que es el mismo matiz de la marca con L15 (S mínima 40). Se sigue leyendo como color de la marca. Sin esta opción, el 3:1 del acento sobre una marca oscura en Modo B obliga a un acento tan claro que el color de marca no llega a 4,5:1 como texto, y el sistema terminaba eligiendo amarillo para casi todas las marcas. Con la tinta, ningún matiz del círculo cromático cae en revisión manual y la personalidad (complementario o análogo) se respeta.

Orden de prueba para cada matiz: primero el camino preferido según el matiz (texto color de marca o blanco, como arriba), después la tinta de marca y por último el camino alternativo.

En todos los casos, el ajuste de L nunca puede romper el mínimo de 3:1 del acento contra el color de marca en Modo B. Si ninguna L dentro del rango permitido cumple a la vez el contraste del texto y el 3:1 contra el color de marca, se pasa al siguiente matiz de la cascada del paso 5, y como último recurso, a revisión manual.

El resultado de este paso fija el campo `texto_sobre_acento` de la paleta (ver A.3): `"blanco"`, `"color_marca"` o `"tinta_marca"`.

### Paso 5 — Validación de bandas prohibidas sobre el acento

Si el acento cae dentro de la banda prohibida, se recalcula en este orden: *(v1.1 — numeración corregida y cascada adaptada al tipo de acento)*

1. Extremo opuesto del rango análogo (H−30 en vez de H+30) si el tipo de acento vigente era análogo.
2. Split-complementario (H+150 o H+210, a partir del complementario H+180) si el tipo de acento vigente era complementario o si el extremo opuesto del análogo también cae en la banda.
3. Si ningún desplazamiento resuelve el conflicto, se mantiene el matiz del color de marca y se diferencia el acento por saturación y luminosidad, más oscuro y más saturado.

### Paso 6 — Función de ajuste de contraste

Se ejecuta siempre, aunque la tabla del paso 3 ya dé un valor válido: mientras el contraste entre color de marca y fondo neutro sea menor a 4,5:1, se baja la luminosidad de a 2 puntos. Si llega a L menor que 15 sin alcanzar el mínimo, se eleva a revisión manual.

Como el Modo B usa el mismo par de colores invertido, y el contraste entre dos colores es idéntico en cualquier orden, esta única validación cubre los dos modos.

El acento tiene su propia validación según el uso: mínimo 4,5:1 como fondo de botón con su texto encima (blanco, color de marca o tinta de marca, según el paso 4b), y mínimo 3:1 sobre el color de marca en Modo B. Con texto blanco fijo estas dos reglas eran matemáticamente incompatibles entre sí para marcas con L entre 25 y 45: no existe una L de acento que a la vez dé ≥4,5:1 contra blanco y ≥3:1 contra un color de marca oscuro. Permitir texto de color de marca sobre el acento (paso 4b) es lo que resuelve esa incompatibilidad. *(v1.1)*

### Paso 7 — Los dos modos de aplicación

- **Modo A (claro):** fondo neutro 60%, color de marca 30%, acento 10%. El tono de apoyo se usa dentro del 30%.
- **Modo B (bold):** color de marca 60% como fondo dominante, fondo neutro 30% como texto, acento 10%.

La secuencia de uso de cada modo la define el capítulo 7, con conteo independiente por canal.

### Paso 8 — Modo color heredado

**Activación.** El cliente vio los chips optimizados y eligió mantener su color corporativo sin modificar. La decisión se registra en el diagnóstico. No se activa por el simple hecho de que el cliente tenga un color previo.

**Qué queda fijo.** El color de marca, con su H, S y L reales convertidos desde el HEX del cliente. No se le aplica la tabla del paso 3 ni la función de ajuste del paso 6.

**Qué se deriva normalmente.** Fondo neutro, tono de apoyo y acento se calculan desde el matiz del cliente con los valores de la fórmula. Si el color corporativo es muy desaturado, la saturación la aporta el acento.

**Qué no cambia.** El preset de rubro del capítulo 7 sigue definiendo tipografía, formas, patrón, alineación, variantes prioritarias y secuencia de modo. El rubro nunca sobrescribe el matiz heredado. Si el color choca con la personalidad del rubro, la compensación va por tipografía, layout y espacio negativo, nunca por color.

**Cascada de validación de contraste.** El color heredado no se modifica: se ajusta lo que lo rodea. *(v1.1 — numeración corregida)*

1. Ajustar la luminosidad del fondo neutro dentro del rango 85-100%. Resuelve los casos límite, entre 3,5:1 y 4,5:1.
2. Generar una versión funcional del color de marca: mismo matiz y saturación, con la luminosidad de la tabla del paso 3. Se usa en texto, íconos y elementos finos. El color original se reserva para logo, masas grandes, badges y fondo de Modo B, donde el mínimo exigido es 3:1.
2b. **Profundizar la versión funcional** *(v1.1)*. Si ni el fondo neutro ni la versión funcional alcanzan 4,5:1 como texto sobre el color original (Modo B), se baja la L de la versión funcional de a 2 puntos, hasta L6 como mínimo. Se elige la primera L que dé 4,5:1 contra el original; si ninguna llega, la primera que dé 3:1. Resuelve sin intervención los colores de tono medio (ej. turquesa #0B9EBF), que antes no servían ni como texto ni como fondo: el original queda para masas y fondos, y la versión funcional hace de texto sobre el neutro y sobre el original. En Modo B el texto usa el que más contraste dé entre el fondo neutro y la versión funcional.
3. Si la luminosidad del color heredado supera el 70%, invertir el modo predominante de esa marca: el Modo B pasa a ser el principal y la secuencia del capítulo 7 se invierte, porque un color claro rinde mejor como fondo que como texto.
4. **Acento con rango ampliado** *(v1.1)*. Si la cascada del acento (pasos 4b y 5) no encuentra un acento dentro de L 35-65, se repite con L 15-85 en el mismo orden de matices, antes de probar el mismo matiz de la marca. Los colores de tono medio lo necesitan: para separarse de ellos, el acento tiene que ser muy claro o muy oscuro.
5. Revisión manual: queda solo como resguardo. Con los pasos 2b y 4, toda la grilla de colores heredados probada (H cada 10°, S cada 20%, L cada 5%, en los cuatro rubros) se resuelve de forma automática.

Ejemplo con amarillo corporativo H45, S90%, L60%:

| Rol | Valor | Contraste vs. fondo neutro |
|---|---|---|
| Color de marca original | H45 S90 L60 | ≈1,5:1 — no apto para texto |
| Versión funcional | H45 S90 L25 | ≈5,6:1 — apta para texto |
| Fondo neutro | H45 S30 L92 | base |
| Acento | H225 S85 L(paso 4b) — complementario corregido a H+180 *(v1.1)* | — |

La marca se sigue leyendo como amarilla porque el amarillo ocupa superficie, no porque esté en los titulares.

### Paso 8b — CTA en Modo B *(v1.1)*

El mínimo de 3:1 del acento sobre el color de marca existe para que el CTA se vea cuando el fondo es la marca (Modo B). Lo que exige la norma de accesibilidad (WCAG 1.4.11) es que el botón se separe de lo que tiene **inmediatamente alrededor**, no necesariamente del fondo de la pieza. Por eso, cuando el acento no llega a 3:1 contra la marca, el CTA de Modo B se resuelve con uno de estos tratamientos, en este orden:

| Tratamiento | Cómo se ve | Controles |
|---|---|---|
| Directo | botón en acento sobre la marca | texto sobre acento ≥ 4,5:1; acento vs. marca ≥ 3:1 |
| Con contorno | botón en acento con un anillo de fondo neutro (8 px en lienzo de 1080) | texto sobre acento ≥ 4,5:1; acento vs. neutro ≥ 3:1; neutro vs. marca ≥ 3:1 |
| Invertido | botón en fondo neutro con el texto en acento | acento vs. neutro ≥ 4,5:1; neutro vs. marca ≥ 3:1 |

Se usa el primero que cumpla todos sus controles, y se puede fijar otro a mano desde la ficha de marca (`cta_modo_b`).

**Modo A** *(v1.1)*. El mismo problema aparece al revés con los acentos claros (amarillos, cianes): el texto sobre el botón se lee bien, pero el botón se funde con el fondo neutro claro. Si el acento no alcanza 3:1 contra el fondo neutro, el CTA de Modo A lleva un contorno fino (4 px en lienzo de 1080) en el color de texto de la marca, que sí contrasta con el neutro. Es el recurso de los botones claros con borde de las marcas reales.

Caso típico: un acento complementario con la misma luminosidad que la marca, como un rojo sobre un verde. Se distinguen solo por matiz, y esa diferencia se pierde para quien tiene daltonismo rojo-verde. El contorno o la inversión agregan diferencia de luminosidad sin cambiar los colores de la marca.

### Paso 9 — Ajuste manual *(v1.1)*

Si en la reunión algún color del resultado no convence, se puede corregir cualquiera de los roles (color de marca, versión funcional, tono de apoyo, fondo neutro, acento) escribiendo su HEX. Reglas:

- La paleta calculada por la fórmula se guarda aparte, junto con la lista de roles ajustados a mano (`paleta_calculada`, `ajustes_manuales`). Cada rol se puede volver al valor calculado, o toda la paleta de una vez.
- El texto sobre el acento se vuelve a elegir con el criterio del paso 4b cada vez que cambia el acento o la marca.
- Los colores ajustados no pasan por la fórmula: los contrastes se muestran en vivo y los que no alcanzan el mínimo quedan marcados. Una marca con contrastes en falta no puede publicar hasta corregirlos (capítulo 8).

---

## Capítulo 4 — Sistema tipográfico

### Objetivo del capítulo

Definir cómo se elige y aplica la tipografía de cada marca con el mismo criterio que la paleta: una sola variable de entrada, reglas fijas, resultado consistente sin intervención manual pieza por pieza.

### Principio base: una sola familia variable

El sistema usa una única familia tipográfica variable por marca, donde la jerarquía se resuelve exclusivamente por el eje de peso, nunca mezclando familias distintas. Esto reduce el diseño tipográfico a una sola decisión y elimina el riesgo de incompatibilidad visual entre título y texto.

### Paso 1 — Selección de familia por rubro

Cada rubro tiene un par de familias variables. Cuál de las dos se usa lo decide la pregunta de personalidad 1 (seria/cercana, capítulo 2 paso 2): *(v1.1)*

| Variante | Familia (seria) | Familia (cercana) | Carácter |
|---|---|---|---|
| Servicios / B2B | Inter Variable | Manrope Variable | neutro, preciso, confiable |
| Gastronomía / retail | Sora Variable | Fraunces Variable | cálido, con personalidad |
| Belleza / lifestyle | Newsreader Variable | Fraunces Variable | editorial, elegante |
| Tech / digital | Sora Variable | Space Grotesk Variable | geométrico, moderno |

Si el cliente tiene tipografía previa y existe en versión variable, se prioriza esa sobre la tabla.

### Paso 2 — Jerarquía y pesos

| Nivel | Uso | Peso | Tamaño mínimo (feed) |
|---|---|---|---|
| H1 | mensaje principal | calculado según longitud, ver fórmula abajo — máximo 900 *(v1.1)* | 48-64 px |
| H2 | dato de apoyo, subtítulo | Semibold (600) | 32-40 px |
| Body | texto secundario | Regular (400) | 24-28 px |
| Caption | datos mínimos | Regular (400) | 18-20 px |

**Peso del H1 *(v1.1)*.** Deja de ser un rango libre 700-900 elegido a criterio: se calcula según la cantidad de caracteres *n* del texto del H1:

```
peso_H1 = clamp(900 − 200 · (n − 15) / 30, 700, 900)
```

redondeado al múltiplo de 50 más cercano. Un H1 de hasta 15 caracteres da 900 (Black); uno de 45 caracteres o más da 700 (Bold); entre esos dos puntos el peso baja de forma lineal. El máximo sigue siendo 900, nunca se excede.

**Tope por familia *(v1.1)*.** El peso calculado se limita al máximo real del eje de peso de la familia: Inter y Fraunces llegan a 900; Manrope, Sora y Newsreader a 800; Space Grotesk a 700. En Space Grotesk el H1 queda siempre en 700 y el largo del texto se compensa solo con el tamaño.

**Regla dura.** Dentro de una misma pieza no se combinan dos pesos en el mismo nivel jerárquico, ni se resalta una palabra suelta con un peso mayor al asignado a ese nivel. Si hace falta destacar un dato, el destaque se resuelve con el color acento o con un tamaño mayor dentro del mismo nivel, nunca con un salto de peso. Esto se mantiene sin cambios: el H1 calculado sigue siendo un único peso para toda la pieza. *(v1.1)*

En formato story y estado, todos los tamaños se escalan entre 15% y 20% respecto del feed.

### Paso 3 — Reglas de uso de la itálica

La itálica se habilita solo en belleza/lifestyle y gastronomía/retail, y además solo si la familia tipográfica elegida para esa marca tiene itálica disponible. En servicios/B2B y tech/digital no se habilita nunca, porque debilita la percepción de seriedad y precisión que buscan esos rubros.

```
italic_habilitado = rubro_lo_permite AND familia_tiene_italica
```

Sora, Manrope y Space Grotesk no tienen itálica. En consecuencia, una marca de gastronomía a la que la pregunta de personalidad 1 le asignó Sora (respuesta "seria") queda sin itálica habilitada, aunque el rubro en general sí la permita. *(v1.1)*

Reglas de uso dentro de los rubros y familias habilitadas:

- Solo en peso Regular. Nunca en Semibold, Bold o Black.
- Solo en los niveles Body y Caption. En H2 se permite si el subtítulo tiene menos de 6 palabras. Nunca en H1.
- Función exclusiva de tono, no de jerarquía: da calidez o carácter editorial, nunca señala importancia o urgencia. Esa función la cumple el color acento.
- Máximo un bloque de texto en itálica por pieza.
- Nunca en datos duros: precios, porcentajes, fechas, condiciones y CTA van siempre en vertical.

### Paso 4 — Color de la tipografía

El color del texto no es una variable libre, se deriva de los roles de paleta: sobre fondo neutro, el texto va en color de marca; sobre fondo bold (Modo B), en fondo neutro; el CTA y los precios siempre en color acento, con el texto sobre ese acento en blanco o color de marca según lo resuelto en el paso 4b del capítulo 3. *(v1.1)* Antes de dar una pieza por válida se valida el contraste específico de esa combinación, con mínimo 4,5:1 para Body y Caption, y 3:1 para H1 grande en bold.

---

## Capítulo 5 — Biblioteca de elementos gráficos

### Objetivo del capítulo

Definir el conjunto fijo de plantillas vectoriales recoloreables que resuelven el soporte visual de cada pieza sin depender de fotografía. No es un banco de archivos por cliente: es un set cerrado y chico que genera variedad combinando pocos elementos con la paleta de cada marca.

### Principio base

Ningún elemento de la biblioteca tiene color propio. Todos se diseñan en trazo neutro y reciben color en el momento de generar la pieza, según el rol que les corresponde. Un mismo set sirve para cualquier cliente sin producir archivos nuevos.

### Set de formas

| Categoría | Ejemplos | Uso |
|---|---|---|
| Geométricas puras | círculo, cuadrado redondeado, triángulo | contención de foto, marcos, contenedores de dato |
| Orgánicas / blobs | 4-5 variantes de forma libre | fondo suave, capa decorativa |
| Lineales | subrayados, flechas, separadores | destaque, dirección de lectura |
| Contenedores | banda, badge, chip | precio, oferta, etiqueta, fondo de logo |

El set total es de 15 a 20 formas en SVG.

### Set de íconos

- Una sola librería para todo el sistema (Phosphor, Lucide o Feather), nunca mezcladas.
- Un solo estilo por marca, lineal o sólido, nunca ambos.
- Subset curado de 40 a 60 íconos de uso frecuente en marketing.
- Color: siempre color de marca o acento. Nunca tono de apoyo, salvo en uso decorativo, donde va en tono de apoyo o fondo neutro con opacidad 15-25%.

### Set de patrones

Cinco a ocho patrones repetibles generados por código: puntos, líneas diagonales, ondas, grilla y ruido sutil. Se usan con opacidad 10-20%, en color de marca o tono de apoyo, nunca en acento.

### Las tres funciones de un elemento gráfico

| Función | Dónde | Reglas |
|---|---|---|
| Estructural | todas las variantes | forma de fondo o contención, en color de marca, tono de apoyo o fondo neutro según el modo |
| Decorativa | variantes 2B-L y 2B-S | una sola por pieza, siempre detrás del texto; ícono con opacidad 15-25%, foto con overlay de color de marca 60-70% |
| Informativa | variantes 3 y 4 | íconos de contacto, o foto e ícono por ítem de catálogo; en color de marca o acento, sin opacidad reducida |

Un mismo elemento nunca cumple dos funciones en la misma pieza. Un ícono decorativo no lleva dato asociado, y un ícono informativo no se usa a escala grande ni con opacidad baja.

### Reglas de fotografía

- La dependencia de foto la define el rubro. La habilitación la define el cliente. Con fotos disponibles se puede usar foto en cualquier rubro, incluso en los de dependencia nula.
- Toda foto va dentro de una forma de contención de la biblioteca.
- En uso decorativo lleva overlay de color de marca al 60-70%.
- En uso informativo va sin overlay, recortada en la forma del ítem.
- Fallback: toda pieza se genera completa sin foto. La foto es siempre una capa opcional.

---

## Capítulo 6 — Grillas de layout por plataforma

### Objetivo del capítulo

Definir las plantillas de posicionamiento que ordenan los elementos ya resueltos por los capítulos 3, 4 y 5 dentro de cada formato de la matriz, garantizando resultado minimalista y sin ambigüedad para el automatizador.

### Principio base: sistema de slots fijos

Un layout no es un lienzo libre: es una plantilla con posiciones predefinidas. Cada slot admite un solo tipo de elemento, y un slot no utilizado queda vacío, nunca se rellena por tener espacio disponible. El layout solo decide posición y proporción; color, peso y elemento gráfico ya vienen resueltos por los capítulos anteriores.

### Los slots del sistema

| Slot | Contenido | Variantes que lo usan |
|---|---|---|
| Fondo | forma de contención o patrón | todas |
| Logo | logo de marca, siempre dentro del margen seguro | todas |
| H1 | mensaje principal | todas |
| Body | dato de apoyo o texto secundario | todas |
| Capa decorativa | ícono grande, forma o patrón protagonista, o foto con overlay | 2B-L, 2B-S |
| CTA | llamado a la acción, precio u oferta | 1, 2B-L, 2B-S, 4 |
| Contacto | íconos y datos de ubicación, teléfono y redes | 3 |
| Ítem | foto o ícono más dato corto, repetible | 4 |

### Reglas duras de combinación

- Máximo una forma de fondo y un patrón, nunca ambos como protagonistas a la vez.
- Máximo dos íconos por pieza en las variantes 1, 2 y 2B. Las variantes 3 y 4 tienen su propio límite.
- Mínimo 30-40% de espacio negativo sobre el área visible.
- Orden de capas fijo: fondo y patrón, forma de contención, capa decorativa o foto, texto e íconos.
- El logo nunca sale del margen seguro, en ningún formato.
- El layout nunca decide color ni tipografía.

### Funciones de la imagen

| Función | Variantes | Rol |
|---|---|---|
| Ninguna | 1, 2 | mensaje puro: tipografía y color |
| Decorativa | 2B-L, 2B-S | refuerza el impacto del H1, no informa |
| Informativa | 3, 4 | comunica un dato: contacto o producto |

### Reglas de la capa decorativa

- Se usa una sola opción por pieza: ícono, forma o patrón, o foto. Nunca combinadas.
- Ícono: tamaño grande, opacidad 15-25%, en tono de apoyo o fondo neutro. Nunca en color de marca ni acento.
- Foto: siempre con overlay de color de marca al 60-70% para garantizar contraste.
- Fallback: si se quita la capa decorativa, la pieza tiene que seguir funcionando completa.

### Las seis variantes de layout

| Variante | Orden de slots | Proporciones | Uso |
|---|---|---|---|
| 1 · Base | logo → H1 → body → CTA | H1 hasta 50% del alto | pieza estándar |
| 2 · H1 protagonista | H1 → body → logo | H1 60-70% | frase o dato de alto impacto, sin CTA |
| 2B-L · Deco lateral | [H1 + body \| deco] → CTA → logo | sector mensaje: H1 65% / body 35%; mensaje a la izquierda, deco a la derecha | impacto con refuerzo visual |
| 2B-S · Deco inferior | [H1 + body / deco] → CTA → logo | sector mensaje: H1 65% / body 35%; deco debajo del mensaje | impacto con refuerzo visual |
| 3 · Contacto | H1 → body → contacto → logo en bloque | contacto con hasta 3-4 íconos | ficha institucional, sin CTA |
| 4 · Catálogo | logo + H1 → ítems → CTA | hasta 3-4 ítems en feed y story | varios productos o servicios |

**Regla de cierre.** El CTA es el último elemento en las variantes 1 y 4. En las variantes 2B el logo cierra la pieza y el CTA va inmediatamente antes.

### Alineación del mensaje (variantes 2 y 3)

- Valores permitidos: izquierda o centrado. La alineación derecha y el justificado quedan prohibidos en todo el sistema, para no romper la lógica de atención del público.
- Belleza/lifestyle y gastronomía/retail: izquierda o centrado. Servicios/B2B y tech/digital: solo izquierda.
- H1 y body siempre comparten alineación, nunca se mezclan dentro de la pieza.
- Los slots de cierre siguen el mismo eje. En la variante 3, los íconos de contacto siempre van a la izquierda del dato, en ambas alineaciones.
- Con centrado, el body se limita a 3-4 líneas.
- En los rubros con ambos valores habilitados, no se repite la misma alineación en dos piezas consecutivas de la misma variante.

### Grillas por formato

- **Feed 1080×1350 (4:5).** Margen seguro de 10-12% en los cuatro bordes. Es el formato de referencia para las proporciones de la tabla de variantes.
- **Feed 1080×1080 (1:1).** Mismas variantes, con H1 limitado a 2 líneas y catálogo limitado a 2-3 ítems por la menor altura disponible.
- **Story y estado 1080×1920 (9:16).** 15% superior e inferior reservados. Todo el contenido va en la zona segura entre el 15% y el 85%, con tamaños escalados 15-20%.
- **Facebook link 1200×630.** Los sectores verticales se reacomodan en horizontal: mensaje a la izquierda con máximo 50% del ancho, y capa decorativa, ítems o contacto a la derecha.

### Proporciones por formato *(v1.1)*

El orden de los slots no cambia entre formatos; cambian los tamaños. Valores en px sobre la escala feed (en story y estado se multiplican por 1,175):

| Formato | Variante 1 (H1 mín–máx · alto máx · logo) | Variante 2 (H1 mín–máx · alto máx · logo) | Regla particular |
|---|---|---|---|
| 4:5 | 56–120 px · 50% · 115 px | 64–170 px · 70% · 100 px | referencia |
| 1:1 | 56–104 px · 42% · 96 px | 64–140 px · 60% · 88 px | H1 en 2 líneas como máximo |
| 9:16 | 56–120 px · 42% · 115 px | 64–150 px · 55% · 100 px | contenido entre el 15% y el 85% del alto |
| 1200×630 | 48–80 px · 50% · 60 px | 56–104 px · 66% · 54 px | mensaje en el 50% izquierdo; la forma de fondo ocupa la mitad derecha |

El ajuste de texto busca el H1 más grande que entra y achica primero el body. Para decidir si entra usa las cajas reales de las letras (ascendentes y descendentes), no solo el interlineado: con tipografías de trazos altos como Fraunces, las letras pueden sobresalir del renglón y pisar el margen seguro.

### Selección de la versión del logo

No es una decisión de diseño por pieza: se deriva del modo de paleta y del elemento que queda detrás del logo.

| Fondo detrás del logo | Versión |
|---|---|
| Fondo neutro (Modo A) | color |
| Color de marca (Modo B) | mono claro |
| Tono de apoyo o forma clara | color si contrasta 3:1 o más; si no, mono oscuro |
| Foto con overlay | mono claro, siempre |

El logo se valida con el mismo mínimo que los elementos gráficos, 3:1 contra el fondo inmediato. Si ninguna de las tres versiones alcanza ese mínimo, se ubica el logo sobre una forma de contención del color que sí contrasta, y solo si eso tampoco es viable se eleva a revisión manual.

### Regla de coherencia entre formatos

La variante elegida para una pieza mantiene su orden de lectura en todos los formatos. Solo cambian las proporciones de cada zona, nunca el orden de los slots.

---

## Capítulo 7 — Variantes por rubro

### Objetivo del capítulo

Reunir en una ficha por rubro los valores por defecto de los capítulos 3 a 6. El rubro no agrega reglas nuevas: selecciona qué opciones quedan habilitadas y cuáles son prioritarias. Todo lo que no figura como habilitado para un rubro queda prohibido para ese rubro.

### Fichas por rubro

| Token | Servicios / B2B | Gastronomía / retail | Belleza / lifestyle | Tech / digital |
|---|---|---|---|---|
| Personalidad y rango de H | confiable, 200-230 | cálido, 15-40 | premium, 260-300 | innovador, 160-190 |
| Secuencia de modo | A, A, B | A, B | A, A, B | B, B, A |
| Familia variable | Inter (seria) / Manrope (cercana) *(v1.1)* | Sora (seria) / Fraunces (cercana) *(v1.1)* | Newsreader (seria) / Fraunces (cercana) *(v1.1)* | Sora (seria) / Space Grotesk (cercana) *(v1.1)* |
| Itálica | no | sí (solo con Fraunces) *(v1.1)* | sí | no |
| Tipo de acento por defecto | análogo *(v1.1)* | complementario *(v1.1)* | análogo *(v1.1)* | complementario *(v1.1)* |
| Formas | geométricas puras, lineales | contenedores, geométricas | orgánicas/blobs, lineales | geométricas puras, contenedores |
| Patrón | grilla, líneas diagonales | puntos | ondas, ruido sutil | grilla |
| Dependencia de foto | nula | alta | media | nula |
| Capa decorativa (2B) | ícono, forma geométrica | foto con overlay | blob, foto con overlay | forma, patrón de grilla |
| Alineación (variantes 2 y 3) | izquierda | izquierda o centrado | izquierda o centrado | izquierda |
| Variantes prioritarias | 1, 2, 3 | 4, 2B, 1 | 2B, 2, 1 | 1, 2B, 4 |

**Nota sobre el rango de gastronomía.** Si el cliente elige un matiz entre 15 y 20, la luminosidad del color de marca pasa a 42%, porque cae en la banda de rojos de la tabla del capítulo 3. Este es un ejemplo puntual de la regla general: la L del color de marca no es un valor de preset por rubro, sale siempre de la tabla por banda de matiz del capítulo 3, paso 3. La versión v1.0 de este manual tenía además una fila "L del color de marca" fija por rubro en esta ficha; se eliminó porque duplicaba —y en los bordes de banda, contradecía— la tabla del capítulo 3. *(v1.1)*

### Fotografía: dependencia y habilitación

Son dos cosas distintas y no se deben confundir.

- **Dependencia de foto:** la define el rubro. Indica si la pieza necesita una foto para funcionar. En servicios y tech es nula, así que el sistema nunca espera una foto.
- **Foto habilitada:** la define el cliente, según lo relevado en el diagnóstico. Si el cliente tiene fotos utilizables, se pueden usar en cualquier rubro, incluso en los de dependencia nula.

Cuando la foto está habilitada en un rubro de dependencia nula, se aplica con las reglas de los capítulos 5 y 6: dentro de una forma de contención, como capa decorativa en 2B con overlay de color de marca al 60-70%, o en los ítems del catálogo. Nunca reemplaza la estructura base, y la pieza tiene que funcionar si se quita.

### Variantes prioritarias

Las seis variantes de layout quedan habilitadas para todos los rubros. Las prioritarias son las que el automatizador elige con más frecuencia cuando el contenido no pide una variante específica. El resto se usa cuando el objetivo de la pieza lo requiere.

### Secuencia de modo con conteo por canal

Cada canal lleva su propia secuencia independiente: feed de Instagram, stories de Instagram, estados de WhatsApp y feed de Facebook. Ninguno arrastra el conteo de otro, porque la monotonía que se busca evitar es la que se percibe al recorrer un mismo canal.

---

## Capítulo 8 — Checklist de control de calidad

### Objetivo del capítulo

Reunir en un solo lugar todas las validaciones que una pieza debe pasar antes de darse por publicable. El checklist no introduce criterios nuevos: formaliza las reglas de los capítulos 3 a 7 como controles verificables, con un resultado binario y una acción definida para cada falla.

Toda validación se ejecuta automáticamente y devuelve aprobado o rechazado. Una pieza rechazada nunca se publica: se corrige con la acción asociada al control, y si la corrección no es posible, se eleva a revisión manual. El automatizador nunca publica con una advertencia pendiente.

### Bloque 1 — Color y contraste

| Control | Mínimo | Acción si falla |
|---|---|---|
| Texto body y caption sobre su fondo | 4,5:1 | función de ajuste (cap. 3, paso 6) |
| H1 y H2 grandes (≥36 px, bold) sobre su fondo | 3:1 | función de ajuste |
| Acento como fondo de botón con su texto (blanco o color de marca) | 4,5:1 | ajustar L del acento (cap. 3, paso 4b) *(v1.1)* |
| Acento sobre color de marca en Modo B | 3:1 | recalcular matiz (cap. 3, paso 5) |
| Acento fuera de la banda prohibida | — | cascada de recálculo |
| Tono de apoyo no usado en texto ni íconos | — | reasignar a color de marca |
| Patrón de fondo con opacidad 10-20% | — | corregir opacidad |
| Color heredado: versión funcional en texto | — | generar versión funcional |

### Bloque 2 — Tipografía

| Control | Regla | Acción si falla |
|---|---|---|
| Una sola familia variable por marca | sin excepción | rechazo, corregir token |
| Peso fijo por nivel jerárquico | H1 calculado por longitud (clamp 700-900, cap. 4 paso 2), H2 600, body y caption 400 *(v1.1)* | rechazo |
| Sin contraste de peso dentro de una pieza | prohibido | rechazo |
| Tamaño mínimo del elemento | menor 18 px caption, 24 px body | escalar o recortar texto |
| Escala en story y estado | +15-20% sobre feed | recalcular |
| Itálica solo en rubros y familias habilitados | belleza y gastronomía, solo si la familia tiene itálica (cap. 4, paso 3) *(v1.1)* | quitar itálica |
| Itálica en peso regular y nivel permitido | máximo 1 bloque por pieza | quitar itálica |
| Itálica ausente en precios, fechas y CTA | sin excepción | rechazo |

### Bloque 3 — Composición y layout

| Control | Regla | Acción si falla |
|---|---|---|
| Espacio negativo | mínimo 30-40% del área visible | reducir elementos o escalar tipografía |
| Elementos gráficos | 1 forma y 1 patrón, nunca ambos protagonistas | quitar uno |
| Íconos | 2 en variantes 1, 2 y 2B; 4 en contacto; 1 por ítem | quitar excedente |
| Capa decorativa | una sola opción, siempre detrás del texto | quitar excedente o corregir capa |
| Orden de capas | fondo, forma, deco o foto, texto e íconos | reordenar |
| Logo dentro del margen seguro | sin excepción | reubicar |
| Orden de slots según variante | el definido en el capítulo 6 | rechazo |
| Alineación del mensaje | izquierda o centrado según rubro | corregir |
| Líneas de body en centrado | máximo 4 | recortar texto |

### Bloque 4 — Zonas seguras por formato

| Formato | Control |
|---|---|
| Feed 4:5 y 1:1 | 10-12% libre de texto y logo en los cuatro bordes |
| Story y estado 9:16 | contenido solo entre el 15% y el 85% de la altura |
| Feed 1:1 | H1 máximo 2 líneas, catálogo máximo 3 ítems |
| Facebook 1200×630 | mensaje máximo 50% del ancho |

### Bloque 5 — Contenido

| Control | Regla |
|---|---|
| Un solo mensaje principal por pieza | 1 H1, 1 dato de apoyo, 1 CTA como máximo |
| Fallback sin foto | la pieza se genera completa sin imagen |
| Fallback sin capa decorativa | la pieza sigue siendo legible si se quita |
| Foto dentro de forma de contención | sin excepción |
| Foto decorativa | con overlay 60-70% de opacidad en color de marca |

### Bloque 6 — Coherencia de serie

Estos controles no se evalúan sobre la pieza aislada sino sobre el historial del canal:

| Control | Regla |
|---|---|
| Secuencia de modo A/B | la del preset de rubro, con conteo independiente por canal |
| Alternancia de alineación | no repetir la misma en dos piezas consecutivas de la misma variante |
| Rotación de variantes de layout | no repetir la misma variante en dos piezas consecutivas del canal |
| Posición relativa del logo | igual en todos los formatos dentro de una misma variante *(v1.1)* |

La posición del logo (arriba o abajo) puede diferir entre variantes, porque cada variante ubica el logo según su propio orden de slots (por ejemplo, arriba en la variante 4, abajo en la variante 1 o en las 2B). Lo que se exige es coherencia dentro de una misma variante a través de los formatos, no una posición única para toda la marca. *(v1.1)*

### Motivos de revisión manual

El automatizador detiene la generación y avisa en cuatro casos: cuando la función de ajuste de contraste llega a L menor que 15 sin alcanzar el mínimo, cuando un color heredado no funciona ni como texto ni como fondo, cuando el texto no entra en el slot ni siquiera en el tamaño mínimo permitido, y cuando el logo del cliente no tiene versión utilizable sobre el fondo de la pieza.

---

# Parte II

## Anexo técnico

---

## Capítulo 9 — Especificación técnica para el automatizador

### Objetivo del capítulo

Formalizar el manual como un contrato de datos: qué entra, qué se calcula y qué sale. Este capítulo es el único que el programador necesita leer para implementar el sistema. Los capítulos anteriores explican el porqué de cada valor.

### Arquitectura en tres capas

*(v1.1 — numeración corregida: 1, 2, 3)*

1. **Marca:** se define una vez por cliente, en la reunión de diagnóstico. Es el resultado de los capítulos 2, 3, 4 y 7.
2. **Pieza:** se define en cada publicación. Es el contenido más la elección de variante y formato.
3. **Render:** el motor combina marca y pieza, aplica el checklist del capítulo 8 y devuelve el archivo o el rechazo.

La separación es lo que permite que el motor no cambie nunca: un cliente nuevo es un objeto de marca nuevo, no código nuevo.

### Objeto de marca (entrada, una vez por cliente)

```
marca: {
  id, nombre,
  rubro: "servicios | gastronomia | belleza | tech",
  personalidad: { tono: "seria | cercana", valor: "confianza | energia | calma | innovacion" },  // (v1.1)
  color: {
    modo: "optimizado | heredado",
    H, S, L,
    tipo_acento: "complementario | analogo",          // (v1.1)
    version_funcional: { H, S, L },   // solo en modo heredado
    banda_prohibida: [H_min, H_max] | null
  },
  logo: { svg_color, svg_mono_claro, svg_mono_oscuro },
  tipografia: { familia_variable, italic_habilitado: bool },
  fotos_habilitadas: bool
}
```

### Paleta derivada (calculada, no ingresada)

```
paleta: {
  color_marca:  { H, S: 70, L: L_tabla(H) -> ajuste paso 6 },
  tono_apoyo:   { H, S: 55, L: min(punto_medio, 67) },
  fondo_neutro: { H, S: 30, L: 92 },   // 85-100 en modo heredado
  acento:       { H_ajustado, S: 85, L: 35-65 ajustada (paso 4b), texto_sobre_acento: "blanco | color_marca | tinta_marca" }  // (v1.1)
}
```

### Objeto de pieza (entrada, por publicación)

```
pieza: {
  marca_id,
  canal: "feed_ig | stories_ig | estados_wa | feed_fb",
  formato: "4:5 | 1:1 | 9:16 | 1200x630",
  variante: "1 | 2 | 2B-L | 2B-S | 3 | 4",
  contenido: {
    h1: string,
    body: string | null,
    cta: string | null,
    items: [{ texto, imagen_id | icono_id }] | null,   // variante 4
    contacto: [{ tipo, valor }] | null                 // variante 3
  },
  imagen: { id, uso: "decorativa | informativa" } | null
}
```

### Estado de serie (persistido por marca y canal)

```
estado_serie: {
  marca_id, canal,
  ultimo_modo: "A | B",
  posicion_secuencia: int,
  ultima_alineacion: "izquierda | centrado",
  ultima_variante: string
}
```

El estado de serie se sigue registrando por canal aunque la publicación final no la ejecute el automatizador (ver capítulo 1, "Fuera de alcance"): el registro alimenta la alternancia de modo, alineación y variante de la próxima pieza, independientemente de quién la publique. *(v1.1)*

### Pipeline de render (orden obligatorio)

*(v1.1 — numeración corregida: 1 a 12)*

1. Cargar marca y preset de rubro.
2. Calcular o recuperar la paleta derivada.
3. Resolver el modo A o B leyendo la secuencia del preset y la posición guardada en el estado de serie.
4. Resolver la alineación, respetando la alternancia y los valores habilitados por rubro.
5. Seleccionar la plantilla de slots según variante y formato.
6. Asignar color a cada slot según el modo resuelto, incluyendo el color de texto sobre el acento (`texto_sobre_acento`). *(v1.1)*
7. Seleccionar la versión del logo según el fondo inmediato.
8. Componer texto, aplicando la escala tipográfica (incluido el peso de H1 calculado por longitud) y la corrección de story si aplica. *(v1.1)*
9. Inyectar color en formas, íconos y patrones.
10. Aplicar la capa decorativa u opcional de foto, si la variante la tiene.
11. Ejecutar el checklist del capítulo 8 completo.
12. Si aprueba, renderizar y actualizar el estado de serie. Si rechaza, aplicar la acción correctiva y volver al control que falló, con un máximo de 3 reintentos antes de elevar a revisión manual.

El orden importa: el color se resuelve antes que el layout porque el layout consulta colores, y el checklist corre al final porque valida el resultado compuesto, no las partes.

### Biblioteca de assets (fija, compartida entre clientes)

```
assets: {
  formas:   [15-20 SVG sin relleno, con fill="currentColor"],
  iconos:   { libreria: unica, estilo: "lineal | solido", subset: 40-60 },
  patrones: [5-8 generados por codigo, opacidad parametrizable],
  plantillas_layout: [6 variantes x 4 formatos = 24 plantillas de slots]
}
```

Ningún asset tiene color propio. El color se inyecta en el paso 9 del pipeline.

### Salida del render

```
resultado: {
  estado: "ok | rechazado | revision_manual",
  archivo: PNG o SVG en la medida del formato,
  metadata: { marca_id, variante, modo, alineacion, timestamp },
  controles_fallidos: [] | [lista con el control y la accion aplicada]
}
```

---

## Esquemas de datos por capítulo

### A.2 — Salida del diagnóstico

```
{
  rubro: [servicios | gastronomia | belleza | tech],
  matiz_elegido: [H en HSL, 0-360],
  decision_color: [chip_optimizado | heredado],
  personalidad: { tono: "seria | cercana", valor: "confianza | energia | calma | innovacion" },  // (v1.1)
  logo: { versiones: [color, mono_claro, mono_oscuro],
          formato: [svg | pdf | png], deuda_vectorizar: [si/no] },
  tiene_fotos_propias: [si/no],
  tipografia_previa: [si/no + cual]
}
```

### A.3 — Paleta de colores

```
{
  color_marca:   { H, S: 70%, L: L_tabla(H) ajustada por paso 6 },
  tono_apoyo:    { H, S: 55%, L: min(punto_medio, 67%) },
  fondo_neutro:  { H, S: 30%, L: 92% },
  tipo_acento:   "complementario | analogo",  // (v1.1) — H+180 o H+30
  acento:        { H_ajustado, S: 85%, L: 35-65% ajustada (paso 4b),
                   texto_sobre_acento: "blanco | color_marca | tinta_marca" },  // (v1.1)
  modos: { A: { fondo: 60, marca: 30, acento: 10 },
           B: { marca: 60, fondo: 30, acento: 10 } }
}
```

```
funcion_ajuste_contraste:
  L = L_tabla(H)
  mientras contraste(marca, fondo_neutro) < 4.5:
      L = L - 2
      si L < 15: detener y elevar a revision manual
```

```
funcion_ajuste_acento (paso 4b):                              // (v1.1)
  H_acento fijo (complementario H+180 o analogo H+30, segun tipo_acento)
  caminos:
      oscuro_marca = { texto: "color_marca", L: 50 -> 65, paso +2 }
      oscuro_tinta = { texto: "tinta_marca" (H marca, L15), L: 50 -> 65, paso +2 }
      claro        = { texto: "blanco", L: 50 -> 35, paso -2 }
  orden = H_acento en [35, 200] ? [oscuro_marca, oscuro_tinta, claro]
                                : [claro, oscuro_marca, oscuro_tinta]
  para cada camino en orden, para cada L del camino:
      si contraste(acento, texto) >= 4.5 y contraste(acento, color_marca) >= 3.0:
          devolver { H_acento, S: 85, L, texto_sobre_acento: texto }
  si ninguno cumple: siguiente H de la cascada del paso 5; si se agota, revision manual
```

```
modo_color_heredado: {
  activacion: "cliente vio los chips optimizados y eligio conservar su color",
  default: "chip optimizado",
  color_marca: "H, S, L del cliente, inmutables",
  version_funcional: { H: H_cliente, S: S_cliente, L: L_tabla(H_cliente) },
  uso_original: ["logo","masas de fondo","badges","fondo Modo B"],
  uso_funcional: ["texto","iconos","elementos finos"],
  cascada: ["ajustar L del fondo neutro (85-100%)",
            "generar version_funcional",
            "invertir modo predominante si L_cliente > 70",
            "revision manual"],
  minimos: { texto: 4.5, elementos_graficos_y_H1_grande: 3.0 },
  rubro: "define todo salvo el matiz; nunca sobrescribe el color heredado"
}
```

### A.4 — Sistema tipográfico

```
{
  familia_variable: [segun rubro + tono de personalidad (seria|cercana), o tipografia previa del cliente],  // (v1.1)
  pesos_fijos: {
    H1: "clamp(900 - 200*(n-15)/30, 700, 900), redondeado a multiplos de 50, n = caracteres del H1",  // (v1.1)
    H2: 600, body: 400, caption: 400
  },
  escala: { H1: "48-64px", H2: "32-40px", body: "24-28px", caption: "18-20px" },
  escala_story: "+15-20% sobre escala feed",
  italic_habilitado: "rubro_lo_permite AND familia_tiene_italica",  // (v1.1) — Sora, Manrope y Space Grotesk no tienen italica
  italic_reglas: {
    peso_permitido: "regular",
    niveles_permitidos: ["body", "caption", "H2 si <6 palabras"],
    max_bloques_por_pieza: 1,
    prohibido_en: ["H1", "precios", "porcentajes", "fechas", "CTA"]
  },
  color_texto: "derivado de rol de paleta segun fondo (ver cap. 3); sobre acento usa texto_sobre_acento"  // (v1.1)
}
```

### A.5 — Biblioteca de elementos gráficos

```
biblioteca: {
  formas: { total: "15-20", categorias: ["geometricas","organicas",
            "lineales","contenedores"], fill: "currentColor" },
  iconos: { libreria: "unica", estilo: "lineal | solido", subset: "40-60" },
  patrones: { total: "5-8", opacidad: [10,20], color: ["marca","tono_apoyo"] },
  funciones: {
    estructural: { color: ["marca","tono_apoyo","fondo_neutro"] },
    decorativa:  { variantes: ["2B-L","2B-S"], max_por_pieza: 1,
                   icono_opacidad: [15,25], foto_overlay: [60,70],
                   z_index: "detras del texto" },
    informativa: { variantes: ["3","4"], color: ["marca","acento"], opacidad: 100 }
  },
  foto: { dependencia: "por rubro", habilitacion: "tiene_fotos_propias",
          contenedor_obligatorio: true, fallback: true }
}
```

### A.6 — Layout, slots y alineación

```
{
  slots: ["fondo","logo","H1","body","capa_decorativa","cta","contacto","item"],
  reglas_combinacion: {
    max_forma_fondo: 1, max_patron: 1, forma_y_patron_protagonistas: false,
    max_iconos: { "1": 2, "2": 2, "2B": 2, "3": 4, "4": "1 por item" },
    espacio_negativo_minimo: "30-40%",
    z_index: ["fondo/patron","forma_contencion","capa_decorativa/foto",
              "texto_e_iconos"],
    logo_en_margen_seguro: true
  },
  variantes: {
    "1":    { orden: ["logo","H1","body","cta"], H1_max: "50%" },
    "2":    { orden: ["H1","body","logo"], H1: "60-70%",
              alineacion_mensaje: ["izquierda","centrado"] },
    "2B-L": { orden: [["H1","body"],"deco"], luego: ["cta","logo"],
              sector: { H1: "65%", body: "35%" }, deco: "derecha" },
    "2B-S": { orden: [["H1","body"],"deco"], luego: ["cta","logo"],
              sector: { H1: "65%", body: "35%" }, deco: "abajo" },
    "3":    { orden: ["H1","body","contacto","logo_bloque"],
              alineacion_mensaje: ["izquierda","centrado"] },
    "4":    { orden: [["logo","H1"],"items","cta"], max_items: 4 }
  },
  reglas_alineacion: {
    aplica_a: "H1 + body + slots de cierre (logo, contacto)",
    prohibido: ["derecha","justificado"],
    max_lineas_body_centrado: 4,
    iconos_contacto: "siempre a la izquierda del dato",
    alternancia: "no repetir en publicaciones consecutivas de la misma variante",
    por_rubro: { belleza: ["izquierda","centrado"],
                 gastronomia: ["izquierda","centrado"],
                 servicios: ["izquierda"], tech: ["izquierda"] }
  },
  capa_decorativa: { opciones: ["icono","forma_patron","foto"], max_por_pieza: 1,
    icono_opacidad: "15-25%", foto_overlay: "color_marca 60-70%", fallback: true },
  logo: { seleccion_version: "derivada del fondo inmediato", contraste_min: 3.0,
          fallback: "forma de contencion detras del logo", en_margen_seguro: true,
          posicion_relativa: "igual dentro de una misma variante, puede variar entre variantes" },  // (v1.1)
  formatos: {
    feed_4_5: { margen: "10-12%" },
    feed_1_1: { margen: "10-12%", H1_max_lineas: 2, max_items: 3 },
    story_9_16: { zona_segura: "15-85%", escala: "+15-20%" },
    facebook_link: { disposicion: "horizontal", mensaje_max_ancho: "50%" }
  },
  orden_lectura_fijo: ["logo","H1","body","cta"]
}
```

### A.7 — Presets por rubro

```
presets_rubro: {
  servicios:   { H_rango: [200,230], secuencia: ["A","A","B"],               // (v1.1) sin L_marca
                 familia_seria: "Inter", familia_cercana: "Manrope",          // (v1.1)
                 italic: false, acento_default: "analogo",                    // (v1.1)
                 formas: ["geometricas","lineales"],
                 patron: ["grilla","diagonales"], dependencia_foto: "nula",
                 deco_2B: ["icono","forma_geometrica",
                           "foto_overlay si foto_habilitada"],
                 alineacion_2_3: ["izquierda"], prioritarias: ["1","2","3"] },
  gastronomia: { H_rango: [15,40], secuencia: ["A","B"],                     // (v1.1) sin L_marca
                 familia_seria: "Sora", familia_cercana: "Fraunces",          // (v1.1)
                 italic: "condicional, solo si familia = Fraunces",           // (v1.1)
                 acento_default: "complementario",                            // (v1.1)
                 formas: ["contenedores","geometricas"], patron: ["puntos"],
                 dependencia_foto: "alta", deco_2B: ["foto_overlay"],
                 alineacion_2_3: ["izquierda","centrado"],
                 prioritarias: ["4","2B","1"] },
  belleza:     { H_rango: [260,300], secuencia: ["A","A","B"],               // (v1.1) sin L_marca
                 familia_seria: "Newsreader", familia_cercana: "Fraunces",    // (v1.1)
                 italic: true, acento_default: "analogo",                     // (v1.1)
                 formas: ["organicas","lineales"], patron: ["ondas","ruido"],
                 dependencia_foto: "media", deco_2B: ["blob","foto_overlay"],
                 alineacion_2_3: ["izquierda","centrado"],
                 prioritarias: ["2B","2","1"] },
  tech:        { H_rango: [160,190], secuencia: ["B","B","A"],               // (v1.1) sin L_marca
                 familia_seria: "Sora", familia_cercana: "Space Grotesk",     // (v1.1)
                 italic: false, acento_default: "complementario",             // (v1.1)
                 formas: ["geometricas","contenedores"], patron: ["grilla"],
                 dependencia_foto: "nula",
                 deco_2B: ["forma","patron_grilla",
                           "foto_overlay si foto_habilitada"],
                 alineacion_2_3: ["izquierda"], prioritarias: ["1","2B","4"] }
},
foto_habilitada: "= tiene_fotos_propias (diagnostico), aplica a todos los rubros",
conteo_secuencia: "independiente por canal: feed_ig, stories_ig, estados_wa, feed_fb",
nota_L_marca: "la L del color de marca ya no vive en el preset: sale siempre de L_tabla(H) del capitulo 3, paso 3"  // (v1.1)
```

### A.8 — Checklist de control de calidad

```
checklist: {
  color: { texto_min: 4.5, h1_grande_min: 3.0,
           acento_boton_min: 4.5,  // (v1.1) — se evalua con texto_sobre_acento (blanco, color_marca o tinta_marca), no solo blanco
           acento_sobre_marca_min: 3.0, banda_prohibida: "validar",
           tono_apoyo_en_texto: false, opacidad_patron: [10,20] },
  tipografia: { familia_unica: true, pesos_fijos: true, contraste_peso: false,
                peso_H1: "clamp(900-200*(n-15)/30, 700, 900), n=caracteres H1",  // (v1.1)
                min_px: { body: 24, caption: 18 }, escala_story: "+15-20%",
                italic: "solo rubro habilitado Y familia con italica, peso regular, max 1 bloque" },  // (v1.1)
  layout: { espacio_negativo_min: "30-40%", max_forma: 1, max_patron: 1,
            max_iconos: { base: 2, contacto: 4, catalogo: "1 por item" },
            max_deco: 1, z_index: "fijo", logo_en_margen_seguro: true,
            logo_posicion_relativa: "coherente dentro de la misma variante",  // (v1.1)
            alineacion: ["izquierda","centrado"] },
  zonas_seguras: { feed: "10-12%", story: "15-85%",
                   fb: "mensaje 50% ancho" },
  contenido: { max_h1: 1, max_cta: 1, fallback_sin_foto: true,
               fallback_sin_deco: true, overlay_foto: [60,70] },
  serie: { secuencia_modo: "por canal", alternancia_alineacion: true,
           rotacion_variantes: true },
  revision_manual: ["L<15 sin contraste", "color heredado inviable",
                    "texto excede slot en tamano minimo",
                    "logo sin version utilizable"]
}
```
