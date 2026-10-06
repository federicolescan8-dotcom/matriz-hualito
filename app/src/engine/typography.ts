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
  // Catálogo ampliado (E3): más voces para diferenciar, todas variables en peso.
  "Playfair Display": { italica: true, pesoMax: 900 },
  Literata: { italica: true, pesoMax: 900 },
  "DM Sans": { italica: true, pesoMax: 900 },
  "Work Sans": { italica: true, pesoMax: 900 },
  Outfit: { italica: false, pesoMax: 900 },
  "Bricolage Grotesque": { italica: false, pesoMax: 800 },
};

/** Clase de cada familia, para las reglas de combinación del par (E3). */
export type ClaseFamilia = "serif" | "geometrica" | "grotesca" | "humanista";

export const CLASE_FAMILIA: Record<string, ClaseFamilia> = {
  Inter: "grotesca",
  Manrope: "humanista",
  Fraunces: "serif",
  Sora: "geometrica",
  Newsreader: "serif",
  "Space Grotesk": "grotesca",
  "Playfair Display": "serif",
  Literata: "serif",
  "DM Sans": "geometrica",
  "Work Sans": "grotesca",
  Outfit: "geometrica",
  "Bricolage Grotesque": "humanista",
};

/** Fuente propia de la marca (WOFF2 subido por el estudio, E3). */
export interface FuentePropia {
  nombre: string;
  /** data URL del archivo WOFF2. */
  archivo: string;
  clase: ClaseFamilia;
}

export interface Tipografia {
  /** Familia display: H1 y H2. Si no hay par, también el texto. */
  familia_variable: string;
  /** Familia de texto (body, CTA, datos e ítems) cuando la marca usa un par (E3). */
  familia_texto?: string;
  italic_habilitado: boolean;
  /** true si la familia vino de la tipografía previa del cliente. */
  previa: boolean;
  /** Fuente propia cargada a la marca; su nombre se puede usar como display o como texto. */
  propia?: FuentePropia;
}

/** Familia del texto: la del par o, sin par, la display. */
export function familiaTexto(t: Tipografia): string {
  return t.familia_texto ?? t.familia_variable;
}

function claseDe(familia: string, t?: Tipografia): ClaseFamilia | undefined {
  return CLASE_FAMILIA[familia] ?? (t?.propia?.nombre === familia ? t.propia.clase : undefined);
}

/**
 * Reglas de combinación del par display + texto (E3): el par tiene que contrastar o ser una sola familia. Dos serif
 * distintas compiten; dos sans de la misma clase se parecen sin contrastar. Una serif con una sans, o dos sans de
 * clases distintas, funcionan.
 */
export function controlPar(display: string, texto: string, t?: Tipografia): { ok: boolean; motivo: string } {
  if (display === texto) return { ok: true, motivo: "Una sola familia: el contraste lo dan el peso y el tamaño." };
  const a = claseDe(display, t);
  const b = claseDe(texto, t);
  if (!a || !b) return { ok: true, motivo: "Fuente propia sin clase conocida: revisar el par a ojo." };
  if (a === "serif" && b === "serif") return { ok: false, motivo: "Dos serif distintas compiten entre sí. Usá una sans para el texto." };
  if (a === b) return { ok: false, motivo: `Dos ${a === "geometrica" ? "geométricas" : a === "grotesca" ? "grotescas" : "humanistas"} distintas se parecen sin contrastar.` };
  return { ok: true, motivo: a === "serif" || b === "serif" ? "Serif con sans: contraste clásico." : "Sans de clases distintas: contraste de construcción." };
}

/** Pares sugeridos para una display: las familias del catálogo que pasan las reglas, las sans primero. */
export function paresSugeridos(display: string, t?: Tipografia): string[] {
  return Object.keys(FAMILIAS)
    .filter((f) => f !== display && controlPar(display, f, t).ok)
    .sort((x, y) => Number(CLASE_FAMILIA[x] === "serif") - Number(CLASE_FAMILIA[y] === "serif"))
    .slice(0, 4);
}

/**
 * Elige el par (o lo quita con texto null). La itálica depende de la familia de texto, que es donde se usa (body y
 * caption, cap. 4).
 */
export function elegirPar(t: Tipografia, display: string, texto: string | null, rubroItalica: boolean): Tipografia {
  const familia_texto = texto && texto !== display ? texto : undefined;
  const deTexto = familia_texto ?? display;
  const italica = FAMILIAS[deTexto]?.italica ?? false;
  const r: Tipografia = { ...t, familia_variable: display, italic_habilitado: rubroItalica && italica };
  if (familia_texto) r.familia_texto = familia_texto;
  else delete r.familia_texto;
  return r;
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
  "Playfair Display": 0.52,
  Literata: 0.51,
  "DM Sans": 0.51,
  "Work Sans": 0.5,
  Outfit: 0.48,
  "Bricolage Grotesque": 0.52,
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
