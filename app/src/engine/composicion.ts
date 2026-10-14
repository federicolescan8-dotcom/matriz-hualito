// Recursos de composición opcionales (cap. 6b, E16): insignia, foto en forma y palabra gigante. Se suman a las variantes
// nuevas; no son variantes aparte. Acá van sus medidas y colores; los controles están en checklist.ts y el dibujo, en
// cada variante (paso 5 de E16).

import { contraste, desdeOklch, oklch, type HSL } from "./color";
import { FORMATOS, type Formato } from "./formatos";
import type { Foco } from "./fotografia";
import { colorTextoAcento, coloresModo, MIN_GRAFICO, MIN_TEXTO, type Paleta } from "./palette";

/** Insignia: una etiqueta corta ("Nuevo", "Hasta el viernes"). Una sola por pieza. */
export interface Insignia {
  texto: string;
}
/**
 * Colores de la insignia (derivado, sin referencia): relleno en el acento con su color de texto (el par del CTA) si el
 * acento se distingue del fondo del modo (3:1); si no (un acento claro sobre el neutro del Modo A), el par invertido
 * del texto: relleno en el color del texto y letra en el del fondo, como el soporte de los íconos de contacto. El
 * checklist igual mide el par dibujado y el relleno contra el fondo real bajo ella.
 */
export function coloresInsignia(p: Paleta, modo: "A" | "B"): { relleno: HSL; texto: HSL } {
  const c = coloresModo(p, modo);
  const acento = { relleno: p.acento as HSL, texto: colorTextoAcento(p) };
  const cumple = (k: { relleno: HSL; texto: HSL }) => contraste(k.relleno, k.texto) >= MIN_TEXTO && contraste(k.relleno, c.fondo) >= MIN_GRAFICO;
  return cumple(acento) ? acento : { relleno: c.texto, texto: c.fondo };
}

/** Foto en forma (diseño 2): foto contenida en un rectángulo redondeado del ancho del contenido. */
export interface FotoEnForma {
  src: string;
  foco?: Foco;
}
/** Medido en el diseño 2: 876×350 px (2,5:1) con radio de ~16 px (1,5% del ancho). */
export const PROPORCION_FOTO_FORMA = 2.5;
export const RADIO_FOTO_FORMA = 0.015;

/** Caja de la foto en forma en un ancho de contenido dado (px del lienzo). */
export function geometriaFotoEnForma(formato: Formato, anchoContenido: number): { w: number; h: number; radio: number } {
  return { w: anchoContenido, h: anchoContenido / PROPORCION_FOTO_FORMA, radio: Math.round(FORMATOS[formato].ancho * RADIO_FOTO_FORMA) };
}

/** Palabra gigante: decoración tipográfica detrás del contenido. No es información ni cuenta para la jerarquía. */
export interface PalabraGigante {
  texto: string;
}
/**
 * Cuánto se aparta la palabra del fondo en luminosidad OKLCH (derivado, sin referencia): poco, para que se lea como
 * textura y el texto de encima siga contrastando. Aclara en Modo B y oscurece en Modo A, como el degradado.
 */
export const DELTA_L_PALABRA = 0.06;

/** Color de la palabra gigante: tono sobre tono del fondo, croma relativo constante (como el degradado). */
export function colorPalabraGigante(fondo: HSL, modo: "A" | "B"): HSL {
  const [L, C, h] = oklch(fondo);
  const destino = Math.min(1, Math.max(0, modo === "B" ? L + DELTA_L_PALABRA : L - DELTA_L_PALABRA));
  return desdeOklch(destino, L > 0 ? (C * destino) / L : C, h);
}
