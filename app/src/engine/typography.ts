// Sistema tipográfico (manual cap. 4 / A.4, v1.1).

import { PRESETS, type Rubro, type Tono } from "./presets";

export type Nivel = "H1" | "H2" | "body" | "caption";

/** Familias variables del sistema: si tienen itálica real y el peso máximo de su eje wght. */
export const FAMILIAS: Record<string, { italica: boolean; pesoMax: number }> = {
  Inter: { italica: true, pesoMax: 900 },
  Manrope: { italica: false, pesoMax: 800 },
  Fraunces: { italica: true, pesoMax: 900 },
  Sora: { italica: false, pesoMax: 800 },
  Newsreader: { italica: true, pesoMax: 800 },
  "Space Grotesk": { italica: false, pesoMax: 700 },
};

export interface Tipografia {
  familia_variable: string;
  italic_habilitado: boolean;
  /** true si la familia vino de la tipografía previa del cliente. */
  previa: boolean;
}

/** Paso 1: familia por rubro según pregunta 1 (seria/cercana); la tipografía previa variable tiene prioridad. */
/**
 * Familia de la marca: la previa del cliente si es variable; si no, la sugerida por los ejes (E12) o, sin ejes, la del
 * rubro según el tono.
 */
export function resolverTipografia(rubro: Rubro, tono: Tono | null, previa?: string | null, sugerida?: string | null): Tipografia {
  const preset = PRESETS[rubro];
  const previaValida = previa && FAMILIAS[previa] ? previa : null;
  const familia = previaValida ?? (sugerida && FAMILIAS[sugerida] ? sugerida : preset.familia[tono ?? "seria"]);
  return {
    familia_variable: familia,
    // v1.1: itálica solo si el rubro la permite Y la familia la tiene.
    italic_habilitado: preset.italic && (FAMILIAS[familia]?.italica ?? false),
    previa: previaValida != null,
  };
}

/**
 * Paso 2 (v1.1): peso del H1 según cantidad de caracteres, 900 hasta 15 y 700 desde 45, múltiplos de 50.
 * Si se indica la familia, se limita a su peso máximo real (p. ej. Manrope llega a 800, Space Grotesk a 700).
 */
export function pesoH1(texto: string, familia?: string): number {
  const n = texto.trim().length;
  const bruto = 900 - (200 * (n - 15)) / 30;
  const acotado = Math.min(900, Math.max(700, bruto));
  const peso = Math.round(acotado / 50) * 50;
  const max = familia ? FAMILIAS[familia]?.pesoMax : undefined;
  return max ? Math.min(peso, max) : peso;
}

export const PESOS: Record<Exclude<Nivel, "H1">, number> = { H2: 600, body: 400, caption: 400 };

/** Tamaños feed (px en lienzo de 1080) como [mínimo, máximo]. */
export const ESCALA_FEED: Record<Nivel, [number, number]> = {
  H1: [48, 64],
  H2: [32, 40],
  body: [24, 28],
  caption: [18, 20],
};

/** Story y estado: +15-20% sobre feed. Se usa el punto medio. */
export const FACTOR_STORY = 1.175;

export function escala(nivel: Nivel, formato: "feed" | "story"): [number, number] {
  const [a, b] = ESCALA_FEED[nivel];
  const f = formato === "story" ? FACTOR_STORY : 1;
  return [Math.round(a * f), Math.round(b * f)];
}

/**
 * Jerarquía del H1 (v1.1): el H1 mide al menos el doble que el body y que el texto del CTA. Para lograrlo, el body y el
 * CTA se achican junto con el H1 (el CTA hasta CTA_MIN px en escala feed), nunca al revés.
 */
export const JERARQUIA_H1 = 2;

/**
 * Altura de x de cada familia como fracción del cuerpo, medida en el navegador sobre la fuente real (canvas,
 * `actualBoundingBoxAscent` de "x"). Las serif de belleza/lifestyle tienen la x baja: a igual px se ven más chicas.
 */
export const ALTURA_X: Record<string, number> = {
  Inter: 0.55,
  Manrope: 0.54,
  Sora: 0.54,
  "Space Grotesk": 0.49,
  Fraunces: 0.47,
  Newsreader: 0.44,
};
/** Altura de x de referencia (las sans del sistema) y umbral: por debajo, el texto secundario se compensa. */
const X_REFERENCIA = 0.54;
const X_UMBRAL = 0.48;
const COMPENSACION_MAX = 1.2;

/**
 * Compensación óptica del texto secundario (body y datos de contacto): con una familia de x baja se agranda hasta
 * igualar la altura de x de una sans, con un tope del 20%. Newsreader ×1,2 y Fraunces ×1,15; el resto ×1.
 */
export function compensacionOptica(familia: string): number {
  const x = ALTURA_X[familia];
  if (!x || x >= X_UMBRAL) return 1;
  return Math.min(COMPENSACION_MAX, Math.round((X_REFERENCIA / x) * 100) / 100);
}
export const CTA_MIN = 24;
