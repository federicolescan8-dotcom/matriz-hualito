// Sujeto PNG (cap. 6b, E16): foto recortada con transparencia que refuerza una variante, nunca un requisito.
// Funciones puras sobre los píxeles RGBA: el navegador los lee al cargar la imagen (lib/imagen.ts) y el motor decide si
// la transparencia sirve, dónde está lo opaco y qué se dibuja si no hay sujeto (cadena de respaldo).

import { BIBLIOTECA_RUBRO, ICONOS, type Patron } from "./biblioteca";
import type { Marca } from "./diagnostico";
import type { Pieza } from "./pieza";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Por debajo de este alfa un píxel es transparente (deja pasar el fondo; los bordes suavizados quedan afuera). */
export const ALFA_TRANSPARENTE = 8;
/** Desde este alfa un píxel tapa lo que tiene debajo: es lo que no puede pisar un texto. */
export const ALFA_OPACO = 128;
/**
 * Transparencia útil: al menos esta fracción del borde de la imagen es transparente (un recorte deja el sujeto rodeado
 * de aire) y al menos esta fracción de toda la imagen. Una foto común, o un PNG con el fondo pintado, no llega.
 */
export const BORDE_TRANSPARENTE_MIN = 0.5;
export const AREA_TRANSPARENTE_MIN = 0.05;
/** Lado mayor de la máscara de lo opaco, en celdas: con 48 una celda de un sujeto de 600 px mide ~12 px. */
export const LADO_MASCARA = 48;

/** Lo opaco del sujeto en una grilla: `celdas` es una fila tras otra, "1" si la celda tiene algún píxel opaco. */
export interface MascaraSujeto {
  cols: number;
  filas: number;
  celdas: string;
}

/** Sujeto cargado en la pieza. La máscara viaja con la pieza porque el checklist del servidor no lee la imagen. */
export interface Sujeto {
  /** Data URL en PNG (conserva el alfa), recortado a lo opaco si tenía transparencia. */
  src: string;
  ancho: number;
  alto: number;
  /** La imagen tiene transparencia útil: si no, la variante cae a su estado sin sujeto. */
  transparente: boolean;
  /** Parece un damero gris y blanco pintado en los píxeles (un "PNG sin fondo" falso). */
  damero: boolean;
  mascara: MascaraSujeto | null;
  /** Qué va si no hay sujeto válido. Por defecto, ícono (cadena PNG → ícono → forma o patrón → nada). */
  respaldo?: RespaldoSujeto;
}

export type RespaldoSujeto = "icono" | "forma" | "nada";

export interface AnalisisAlfa {
  /** Fracción de píxeles transparentes de toda la imagen. */
  area: number;
  /** Fracción de píxeles transparentes del borde (1 px de ancho). */
  borde: number;
  /** Caja de los píxeles visibles (alfa ≥ ALFA_TRANSPARENTE). Null si no hay nada visible. */
  caja: Rect | null;
  transparente: boolean;
}

const alfaEn = (rgba: ArrayLike<number>, w: number, x: number, y: number) => rgba[(y * w + x) * 4 + 3];

/** Mide cuánto de la imagen y de su borde es transparente, y dónde está lo visible. */
export function analizarAlfa(rgba: ArrayLike<number>, w: number, h: number): AnalisisAlfa {
  let transparentes = 0;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alfaEn(rgba, w, x, y) < ALFA_TRANSPARENTE) {
        transparentes++;
        continue;
      }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  let bordeT = 0;
  let bordeN = 0;
  for (const [x, y] of perimetro(w, h)) {
    bordeN++;
    if (alfaEn(rgba, w, x, y) < ALFA_TRANSPARENTE) bordeT++;
  }
  const area = w * h ? transparentes / (w * h) : 0;
  const borde = bordeN ? bordeT / bordeN : 0;
  const caja = x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  return { area, borde, caja, transparente: caja != null && borde >= BORDE_TRANSPARENTE_MIN && area >= AREA_TRANSPARENTE_MIN };
}

function* perimetro(w: number, h: number): Generator<[number, number]> {
  for (let x = 0; x < w; x++) {
    yield [x, 0];
    if (h > 1) yield [x, h - 1];
  }
  for (let y = 1; y < h - 1; y++) {
    yield [0, y];
    if (w > 1) yield [w - 1, y];
  }
}

/**
 * Detecta el damero pintado de los "PNG sin fondo" falsos: el borde es casi todo de dos grises claros y neutros que se
 * alternan (blanco y ~#e6e6e6), con mucha alternancia entre vecinos. Sirve para explicarle al usuario por qué su imagen
 * no tiene transparencia; con o sin damero, la variante cae al estado sin sujeto.
 */
export function pareceDamero(rgba: ArrayLike<number>, w: number, h: number): boolean {
  const claros: number[] = [];
  for (const [x, y] of perimetro(w, h)) {
    const i = (y * w + x) * 4;
    const [r, g, b] = [rgba[i], rgba[i + 1], rgba[i + 2]];
    const neutro = Math.max(r, g, b) - Math.min(r, g, b) <= 12;
    claros.push(neutro && Math.min(r, g, b) >= 190 ? (r + g + b) / 3 : -1);
  }
  if (claros.filter((v) => v >= 0).length < claros.length * 0.8) return false;
  // Dos tonos separados entre 10 y 50 niveles, cada uno con al menos un 25% del borde.
  const altos = claros.filter((v) => v >= 248).length;
  const medios = claros.filter((v) => v >= 200 && v <= 242).length;
  if (altos < claros.length * 0.25 || medios < claros.length * 0.25) return false;
  // Alternancia: en un damero el tono cambia seguido a lo largo del borde (en un degradado suave, casi nunca).
  let cambios = 0;
  for (let i = 1; i < claros.length; i++) if (claros[i] >= 248 !== claros[i - 1] >= 248) cambios++;
  return cambios >= 8;
}

/** Máscara de lo opaco dentro de `caja` (en px de la imagen), en una grilla de `lado` celdas sobre el lado mayor. */
export function mascaraOpaca(rgba: ArrayLike<number>, w: number, caja: Rect, lado = LADO_MASCARA): MascaraSujeto {
  const k = Math.max(caja.w, caja.h) / lado;
  const cols = Math.max(1, Math.round(caja.w / k));
  const filas = Math.max(1, Math.round(caja.h / k));
  let celdas = "";
  for (let fy = 0; fy < filas; fy++) {
    const ya = caja.y + Math.floor((fy * caja.h) / filas);
    const yb = caja.y + Math.floor(((fy + 1) * caja.h) / filas);
    for (let fx = 0; fx < cols; fx++) {
      const xa = caja.x + Math.floor((fx * caja.w) / cols);
      const xb = caja.x + Math.floor(((fx + 1) * caja.w) / cols);
      let opaca = false;
      for (let y = ya; y < Math.max(yb, ya + 1) && !opaca; y++) {
        for (let x = xa; x < Math.max(xb, xa + 1); x++) {
          if (alfaEn(rgba, w, x, y) >= ALFA_OPACO) {
            opaca = true;
            break;
          }
        }
      }
      celdas += opaca ? "1" : "0";
    }
  }
  return { cols, filas, celdas };
}

/** Celdas opacas de la máscara llevadas a la caja donde se dibuja el sujeto (px del lienzo). */
export function celdasOpacas(m: MascaraSujeto, destino: Rect): Rect[] {
  const cw = destino.w / m.cols;
  const ch = destino.h / m.filas;
  const res: Rect[] = [];
  for (let i = 0; i < m.celdas.length; i++) {
    if (m.celdas[i] !== "1") continue;
    res.push({ x: destino.x + (i % m.cols) * cw, y: destino.y + Math.floor(i / m.cols) * ch, w: cw, h: ch });
  }
  return res;
}

/**
 * La caja toca lo opaco del sujeto (más que `roce` px): se mide contra el contorno real, no contra la caja de la imagen,
 * así un texto puede entrar en el aire transparente de alrededor del sujeto.
 */
export function tocaSujeto(m: MascaraSujeto, destino: Rect, k: Rect, roce = 2): boolean {
  return celdasOpacas(m, destino).some(
    (c) => Math.min(c.x + c.w, k.x + k.w) - Math.max(c.x, k.x) > roce && Math.min(c.y + c.h, k.y + k.h) - Math.max(c.y, k.y) > roce,
  );
}

/** Lo que ocupa el lugar del sujeto: el PNG, o el respaldo (ícono, forma o patrón del rubro), o nada. */
export type CapaSujeto =
  | { tipo: "png"; sujeto: Sujeto & { mascara: MascaraSujeto } }
  | { tipo: "icono"; icono: string }
  | { tipo: "forma"; forma: string; patron: Patron }
  | { tipo: "nada" };

/**
 * Cadena de respaldo (cap. 6b): PNG → ícono → forma o patrón → nada. El PNG va solo con transparencia útil; si no,
 * va el respaldo elegido (por defecto el ícono sugerido del rubro). Las formas propias de la marca (E2) van primero.
 */
export function capaSujeto(marca: Marca, pieza: Pieza): CapaSujeto {
  const s = pieza.sujeto;
  if (s?.transparente && s.mascara) return { tipo: "png", sujeto: { ...s, mascara: s.mascara } };
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const respaldo = s?.respaldo ?? "icono";
  if (respaldo === "icono") return { tipo: "icono", icono: ICONOS[lib.iconosSugeridos[0]][0] };
  if (respaldo === "forma") {
    const propia = marca.identidad.recursos?.formas[0]?.id;
    return { tipo: "forma", forma: propia ?? lib.formasDeco[0], patron: lib.patrones[0] };
  }
  return { tipo: "nada" };
}

/** Motivo para mostrarle al usuario cuando su imagen no sirve como sujeto. Null si sirve. */
export function motivoSinSujeto(s: Sujeto): string | null {
  if (s.transparente) return null;
  if (s.damero) return "La imagen tiene el fondo cuadriculado pintado: no es transparente de verdad. Se usa el respaldo.";
  return "La imagen no tiene fondo transparente (PNG o WebP recortado). Se usa el respaldo.";
}
