// Sistema tipográfico (manual cap. 4 / A.4, v1.1).

import { PRESETS, type Rubro, type Tono } from "./presets";

export type Nivel = "H1" | "H2" | "body" | "caption";

/** Familias variables del sistema y si tienen itálica real. */
export const FAMILIAS: Record<string, { italica: boolean }> = {
  Inter: { italica: true },
  Manrope: { italica: false },
  Fraunces: { italica: true },
  Sora: { italica: false },
  Newsreader: { italica: true },
  "Space Grotesk": { italica: false },
};

export interface Tipografia {
  familia_variable: string;
  italic_habilitado: boolean;
  /** true si la familia vino de la tipografía previa del cliente. */
  previa: boolean;
}

/** Paso 1: familia por rubro según pregunta 1 (seria/cercana); la tipografía previa variable tiene prioridad. */
export function resolverTipografia(rubro: Rubro, tono: Tono | null, previa?: string | null): Tipografia {
  const preset = PRESETS[rubro];
  const previaValida = previa && FAMILIAS[previa] ? previa : null;
  const familia = previaValida ?? preset.familia[tono ?? "seria"];
  return {
    familia_variable: familia,
    // v1.1: itálica solo si el rubro la permite Y la familia la tiene.
    italic_habilitado: preset.italic && (FAMILIAS[familia]?.italica ?? false),
    previa: previaValida != null,
  };
}

/** Paso 2 (v1.1): peso del H1 según cantidad de caracteres, 900 hasta 15 y 700 desde 45, múltiplos de 50. */
export function pesoH1(texto: string): number {
  const n = texto.trim().length;
  const bruto = 900 - (200 * (n - 15)) / 30;
  const acotado = Math.min(900, Math.max(700, bruto));
  return Math.round(acotado / 50) * 50;
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
