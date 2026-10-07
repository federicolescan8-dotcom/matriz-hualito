// Diagnóstico abierto (replanteo, E12): la personalidad de la marca en ejes continuos. El rubro es una semilla que los
// precarga (y se puede mezclar con otro); las decisiones de color y tipografía salen de los ejes, no del rubro.

import { normalizarH } from "./color";
import { PRESETS, type Rubro, type Tono, type ValorMarca } from "./presets";

export type Eje = "clasico_moderno" | "sobrio_expresivo" | "artesanal_tecnologico" | "calido_frio" | "accesible_premium" | "serio_ludico";

/** Valor de cada eje de 0 (polo izquierdo) a 100 (polo derecho). */
export type Ejes = Record<Eje, number>;

export const EJES: { id: Eje; izquierda: string; derecha: string; decide: string }[] = [
  { id: "clasico_moderno", izquierda: "Clásico", derecha: "Moderno", decide: "tipografía" },
  { id: "sobrio_expresivo", izquierda: "Sobrio", derecha: "Expresivo", decide: "tipografía, amplitud del color y acento" },
  { id: "artesanal_tecnologico", izquierda: "Artesanal", derecha: "Tecnológico", decide: "tipografía y acento" },
  { id: "calido_frio", izquierda: "Cálido", derecha: "Frío", decide: "matiz del color" },
  { id: "accesible_premium", izquierda: "Accesible", derecha: "Premium", decide: "acento" },
  { id: "serio_ludico", izquierda: "Serio", derecha: "Lúdico", decide: "acento" },
];

/** Punto de partida de cada rubro: lo que hoy fijaba el preset, expresado en ejes. */
export const EJES_RUBRO: Record<Rubro, Ejes> = {
  servicios: { clasico_moderno: 55, sobrio_expresivo: 25, artesanal_tecnologico: 55, calido_frio: 80, accesible_premium: 55, serio_ludico: 25 },
  gastronomia: { clasico_moderno: 40, sobrio_expresivo: 65, artesanal_tecnologico: 25, calido_frio: 10, accesible_premium: 35, serio_ludico: 60 },
  belleza: { clasico_moderno: 30, sobrio_expresivo: 45, artesanal_tecnologico: 35, calido_frio: 55, accesible_premium: 80, serio_ludico: 35 },
  tech: { clasico_moderno: 85, sobrio_expresivo: 60, artesanal_tecnologico: 90, calido_frio: 70, accesible_premium: 50, serio_ludico: 50 },
};

const IDS = EJES.map((e) => e.id);
const acotar = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Ejes semilla del rubro o de la mezcla de dos rubros (promedio). */
export function ejesSemilla(rubro: Rubro, secundario?: Rubro | null): Ejes {
  const a = EJES_RUBRO[rubro];
  if (!secundario || secundario === rubro) return { ...a };
  const b = EJES_RUBRO[secundario];
  return Object.fromEntries(IDS.map((k) => [k, acotar((a[k] + b[k]) / 2)])) as Ejes;
}

/**
 * Ejes equivalentes a la personalidad cerrada de antes de E12 (tono + valor), para migrar las marcas guardadas: la
 * semilla del rubro corrida por cada respuesta. La identidad guardada no cambia; solo el diagnóstico gana ejes.
 */
export function ejesDesdePersonalidad(rubro: Rubro, tono: Tono | null, valor: ValorMarca | null): Ejes {
  const e = ejesSemilla(rubro);
  if (tono === "seria") Object.assign(e, { serio_ludico: 20, sobrio_expresivo: Math.min(e.sobrio_expresivo, 40) });
  if (tono === "cercana") Object.assign(e, { serio_ludico: 65, accesible_premium: Math.min(e.accesible_premium, 45) });
  if (valor === "energia") e.sobrio_expresivo = Math.max(e.sobrio_expresivo, 70);
  if (valor === "calma") e.sobrio_expresivo = Math.min(e.sobrio_expresivo, 30);
  if (valor === "innovacion") Object.assign(e, { clasico_moderno: Math.max(e.clasico_moderno, 75), artesanal_tecnologico: Math.max(e.artesanal_tecnologico, 70) });
  if (valor === "confianza") e.clasico_moderno = Math.min(e.clasico_moderno, 55);
  return e;
}

/**
 * Valor de marca que usa la fórmula de paleta para elegir el acento (cap. 3): expresivo, lúdico o tecnológico piden
 * contraste (complementario); sobrio y serio, armonía (análogo).
 */
export function valorDeEjes(e: Ejes): ValorMarca {
  if (e.artesanal_tecnologico >= 70 && e.clasico_moderno >= 65) return "innovacion";
  if (e.sobrio_expresivo >= 60 || e.serio_ludico >= 65) return "energia";
  if (e.sobrio_expresivo <= 35 && e.calido_frio <= 50) return "calma";
  return "confianza";
}

/** Tono que se sigue guardando por compatibilidad (textos y migración): lúdico o accesible es cercano. */
export function tonoDeEjes(e: Ejes): Tono {
  return e.serio_ludico >= 50 || e.accesible_premium <= 35 ? "cercana" : "seria";
}

/**
 * Familias del catálogo ubicadas en el espacio clásico ↔ moderno, sobrio ↔ expresivo y artesanal ↔ tecnológico. La
 * familia es la más cercana a los ejes de la marca (cap. 4).
 */
const FAMILIAS_EN_EJES: { familia: string; punto: [number, number, number] }[] = [
  { familia: "Newsreader", punto: [15, 25, 35] },
  { familia: "Fraunces", punto: [30, 70, 20] },
  { familia: "Inter", punto: [65, 20, 60] },
  { familia: "Manrope", punto: [60, 45, 40] },
  { familia: "Sora", punto: [75, 60, 70] },
  { familia: "Space Grotesk", punto: [90, 80, 95] },
  // Catálogo ampliado (E3).
  { familia: "Playfair Display", punto: [10, 80, 30] },
  { familia: "Literata", punto: [25, 35, 25] },
  { familia: "DM Sans", punto: [72, 35, 55] },
  { familia: "Work Sans", punto: [55, 35, 65] },
  { familia: "Outfit", punto: [82, 50, 60] },
  { familia: "Bricolage Grotesque", punto: [65, 88, 45] },
];

export function familiaDeEjes(e: Ejes): string {
  const p = [e.clasico_moderno, e.sobrio_expresivo, e.artesanal_tecnologico];
  let mejor = FAMILIAS_EN_EJES[0];
  let dist = Infinity;
  for (const f of FAMILIAS_EN_EJES) {
    const d = Math.hypot(...f.punto.map((v, i) => v - p[i]));
    if (d < dist) [mejor, dist] = [f, d];
  }
  return mejor.familia;
}

/** Matices de anclaje del eje cálido ↔ frío. */
const MATIZ_CALIDO = 30;
const MATIZ_FRIO = 210;

/** Centro del rango de matiz del rubro (o el promedio circular de dos rubros). */
function centroRubro(rubro: Rubro, secundario?: Rubro | null): number {
  const centro = (r: Rubro) => {
    const [a, b] = PRESETS[r].H_rango;
    return (a + b) / 2;
  };
  if (!secundario || secundario === rubro) return centro(rubro);
  const [x, y] = [centro(rubro), centro(secundario)].map((h) => (h * Math.PI) / 180);
  return normalizarH((Math.atan2(Math.sin(x) + Math.sin(y), Math.cos(x) + Math.cos(y)) * 180) / Math.PI);
}

/** Interpolación de matiz por el camino más corto. */
function haciaMatiz(desde: number, hasta: number, t: number): number {
  const d = ((hasta - desde + 540) % 360) - 180;
  return normalizarH(desde + d * t);
}

/**
 * Rango de matiz para los chips de color. Parte del centro del rubro (semilla) y lo corre hacia el cálido o el frío según
 * cuánto se movió el eje respecto de la semilla; el eje sobrio ↔ expresivo abre el rango (25° sobrio, 80° expresivo).
 */
export function rangoMatiz(e: Ejes, rubro: Rubro, secundario?: Rubro | null): [number, number] {
  const semilla = ejesSemilla(rubro, secundario);
  const delta = (e.calido_frio - semilla.calido_frio) / 100;
  const base = centroRubro(rubro, secundario);
  const centro = delta === 0 ? base : haciaMatiz(base, delta < 0 ? MATIZ_CALIDO : MATIZ_FRIO, Math.min(1, Math.abs(delta) * 1.5));
  const ancho = 25 + (e.sobrio_expresivo / 100) * 55;
  return [Math.round(centro - ancho / 2), Math.round(centro + ancho / 2)];
}
