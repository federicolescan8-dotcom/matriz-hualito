// Matriz de formatos y canales (manual cap. 1, cap. 6 "Grillas por formato").

export type Formato = "4:5" | "1:1" | "9:16" | "1200x630";
export type Canal = "feed_ig" | "stories_ig" | "estados_wa" | "feed_fb";

export interface EspecFormato {
  nombre: string;
  ancho: number;
  alto: number;
  /** Margen seguro como fracción de cada dimensión: el contenido va dentro de [x, 1-x] × [y, 1-y]. */
  zona: { x: number; y: number };
  /** Margen mínimo que exige el checklist (bloque 4). */
  zonaMinima: { x: number; y: number };
  escala: "feed" | "story";
  /** Formatos que se habilitan en la fase 3. */
  habilitado: boolean;
}

export const FORMATOS: Record<Formato, EspecFormato> = {
  "4:5": {
    nombre: "Feed 4:5 · 1080×1350",
    ancho: 1080,
    alto: 1350,
    zona: { x: 0.11, y: 0.11 },
    zonaMinima: { x: 0.1, y: 0.1 },
    escala: "feed",
    habilitado: true,
  },
  "1:1": {
    nombre: "Feed 1:1 · 1080×1080",
    ancho: 1080,
    alto: 1080,
    zona: { x: 0.11, y: 0.11 },
    zonaMinima: { x: 0.1, y: 0.1 },
    escala: "feed",
    habilitado: false,
  },
  "9:16": {
    nombre: "Story / estado 9:16 · 1080×1920",
    ancho: 1080,
    alto: 1920,
    zona: { x: 0.11, y: 0.15 },
    zonaMinima: { x: 0.1, y: 0.15 },
    escala: "story",
    habilitado: false,
  },
  "1200x630": {
    nombre: "Facebook link · 1200×630",
    ancho: 1200,
    alto: 630,
    zona: { x: 0.1, y: 0.1 },
    zonaMinima: { x: 0.1, y: 0.1 },
    escala: "feed",
    habilitado: false,
  },
};

export const CANALES: Record<Canal, { nombre: string; formatos: Formato[] }> = {
  feed_ig: { nombre: "Instagram · feed", formatos: ["4:5", "1:1"] },
  stories_ig: { nombre: "Instagram · stories", formatos: ["9:16"] },
  estados_wa: { nombre: "WhatsApp · estados", formatos: ["9:16"] },
  feed_fb: { nombre: "Facebook · feed", formatos: ["1200x630"] },
};
