// Lo que el modelo tiene que interpretar y cómo devolverlo. Los enums, los ejes y las familias salen del motor, así
// el prompt no se desincroniza con la matriz si cambia el catálogo.

import { EJES, EJES_RUBRO } from "../../app/src/engine/ejes";
import { MAX_PUBLICO } from "../../app/src/engine/diagnostico";
import { MAX_OFERTA, MAX_TEXTO_CONTENIDO } from "../../app/src/engine/perfil";
import { PRESETS, RUBROS } from "../../app/src/engine/presets";
import { GRADOS_CAMBIO } from "../../app/src/engine/rescate";
import { FAMILIAS } from "../../app/src/engine/typography";

const IDS_EJES = EJES.map((e) => e.id);
const nulo = (s: object) => ({ anyOf: [s, { type: "null" }] });
const texto = { type: "string" };
const objeto = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** Esquema de la respuesta (salida estructurada). Los rangos los controla `validarPerfil`, no el esquema. */
export const ESQUEMA = objeto({
  nombre: texto,
  rubro: { type: "string", enum: RUBROS },
  rubro_secundario: nulo({ type: "string", enum: RUBROS }),
  rubro_libre: nulo(texto),
  ejes: objeto(Object.fromEntries(IDS_EJES.map((id) => [id, { type: "integer" }]))),
  tono: { type: "string", enum: ["seria", "cercana"] },
  contenido: objeto({ oferta: { type: "array", items: texto }, mensaje: texto, apoyo: texto, cta: texto }),
  publico: objeto({ aquien: texto, motiva: texto, frena: texto }),
  color_previo_hex: nulo(texto),
  tiene_fotos_propias: { type: "boolean" },
  tipografia_previa: nulo({ type: "string", enum: Object.keys(FAMILIAS) }),
  grado: { type: "string", enum: GRADOS_CAMBIO.map((g) => g.id) },
  evidencia: objeto({
    ejes: objeto(Object.fromEntries(IDS_EJES.map((id) => [id, texto]))),
    tipografia_observada: texto,
    notas: { type: "array", items: texto },
  }),
  confianza: objeto({ ejes: { type: "number" }, tono: { type: "number" }, rubro: { type: "number" } }),
});

export interface Interpretacion {
  nombre: string;
  rubro: string;
  rubro_secundario: string | null;
  rubro_libre: string | null;
  ejes: Record<string, number>;
  tono: string;
  contenido: { oferta: string[]; mensaje: string; apoyo: string; cta: string };
  publico: { aquien: string; motiva: string; frena: string };
  color_previo_hex: string | null;
  tiene_fotos_propias: boolean;
  tipografia_previa: string | null;
  grado: string;
  evidencia: { ejes: Record<string, string>; tipografia_observada: string; notas: string[] };
  confianza: { ejes: number; tono: number; rubro: number };
}

export const SISTEMA = `Sos el perfilador de Matriz Hualito, una herramienta que arma la identidad digital de marcas chicas.
Te pasan capturas reales de una empresa que ya existe pero no tiene su identidad definida (perfil de Instagram, feed,
logo, piezas sueltas). Tu trabajo es leer lo que la marca YA ES hoy, no lo que debería ser: el diagnóstico que
devolvés es el punto de partida de un rescate de marca, y un diseñador lo revisa antes de usarlo.

Escribí todos los textos en español rioplatense.

## Rubro
Elegí el rubro base que más se acerque:
${RUBROS.map((r) => `- ${r}: ${PRESETS[r].nombre} (${PRESETS[r].ejemplos})`).join("\n")}
Si la empresa mezcla dos, poné el segundo en rubro_secundario. En rubro_libre, cómo se describe la empresa a sí misma
(por ejemplo, la categoría de su bio), o null.

## Ejes de personalidad (0 a 100)
Cada eje va de 0 (polo izquierdo) a 100 (polo derecho):
${EJES.map((e) => `- ${e.id}: ${e.izquierda} (0) ↔ ${e.derecha} (100). Decide ${e.decide}.`).join("\n")}
Como referencia, los valores típicos de cada rubro son:
${RUBROS.map((r) => `- ${r}: ${IDS_EJES.map((id) => `${id} ${EJES_RUBRO[r][id]}`).join(", ")}`).join("\n")}
Corré los valores según lo que se ve: el tono de los textos, la fotografía, las tipografías, el uso del color y el
nivel de precios o promociones. En evidencia.ejes justificá cada eje en una frase que cite algo concreto de las
imágenes.

## Tono
"cercana" si habla de vos, usa humor, emojis o saludos por fechas; "seria" si es formal e institucional.

## Contenido
- oferta: hasta ${MAX_OFERTA} productos o servicios reales que se ven en el feed, con nombres cortos.
- mensaje: el mensaje principal que la marca repite, en una frase de hasta ${MAX_TEXTO_CONTENIDO} caracteres.
- apoyo: un dato concreto (horario, zona, diferencial), hasta ${MAX_TEXTO_CONTENIDO} caracteres.
- cta: la acción que más pide (pedir, reservar, escribir), hasta ${MAX_TEXTO_CONTENIDO} caracteres.
No inventes datos que no estén en las imágenes; si algo no se ve, dejá el texto vacío.

## Público
aquien, motiva y frena: una frase cada uno, hasta ${MAX_PUBLICO} caracteres, deducida de lo que se ve. Vacío si no se
puede deducir.

## Color
Los colores ya están medidos de las imágenes; vos no los adivinás. Te paso la lista de candidatos con su peso y en
qué archivos aparecen. En color_previo_hex elegí el que la marca usa como propio: el del logo o el que se repite en
casi todas las piezas, no un color de temporada (Navidad, Día de la Madre) ni el de una foto de producto. Tiene que
ser exactamente uno de los HEX de la lista, o null si ninguno es de la marca.

## Tipografía
En evidencia.tipografia_observada describí las tipografías que ves (serif, script, condensada, palo seco, cuántas
conviven). En tipografia_previa poné una familia del catálogo solo si la marca usa exactamente esa; si no, null.

## Fotos y grado de cambio
- tiene_fotos_propias: true si el feed tiene fotografía propia del producto o del local (no stock).
- grado: "rescate" si la marca ya tiene un sistema reconocible que solo hay que limpiar; "refresco" si hay un ancla
  clara (logo, un color) pero el resto es desordenado; "evolucion" si casi nada es consistente.

## Confianza
De 0 a 1, qué tan seguro estás de los ejes, del tono y del rubro.

En evidencia.notas, dos o tres observaciones útiles para el diseñador sobre lo que hoy está desordenado.`;

export function pedido(empresa: string, candidatos: { hex: string; peso: number; fuentes: string[] }[]): string {
  const lista = candidatos.length
    ? candidatos.map((c) => `- ${c.hex} · peso ${c.peso} · en ${c.fuentes.join(", ")}`).join("\n")
    : "(no se midió ningún color)";
  return `Empresa: ${empresa}\n\nColores medidos (candidatos a color_previo_hex):\n${lista}\n\nLas imágenes van arriba, cada una precedida por su nombre de archivo.`;
}
