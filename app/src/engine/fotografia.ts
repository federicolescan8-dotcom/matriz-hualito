// Fotografía de marca (E6): tratamiento propio de las fotos, encuadre con punto focal y protección de contraste del
// texto sobre foto. Todo es puro: el navegador (lib/medicion.ts) y los componentes solo lo dibujan o lo muestrean.

import { hslToRgb, type HSL } from "./color";
import type { Paleta } from "./palette";

export type Tratamiento = "natural" | "gradacion" | "duotono";

/** Tratamiento propio de la marca: se aplica igual a todas sus fotos, en todas las piezas. */
export interface Fotografia {
  tratamiento: Tratamiento;
  /** 0 a 1: cuánto de la foto se reemplaza por el tratamiento. */
  intensidad: number;
}

export const FOTOGRAFIA_POR_DEFECTO: Fotografia = { tratamiento: "natural", intensidad: 0.6 };

export const TRATAMIENTOS: { id: Tratamiento; nombre: string; descripcion: string }[] = [
  { id: "natural", nombre: "Natural", descripcion: "La foto tal como es, sin procesar." },
  { id: "gradacion", nombre: "Gradación", descripcion: "Las luces y sombras se tiñen hacia el color de la marca." },
  { id: "duotono", nombre: "Duotono", descripcion: "Dos tintas: el color de marca oscuro en las sombras y el fondo neutro en las luces." },
];

/** Guía de dirección de arte para el manual de marca (E8): qué fotos sí y cuáles no. */
export const DIRECCION_DE_ARTE: { tema: string; si: string; no: string }[] = [
  { tema: "Luz", si: "Luz natural y suave, con una dirección clara.", no: "Flash directo, sombras duras o luz mezclada que tiñe la foto." },
  { tema: "Encuadre", si: "Un sujeto claro, con aire alrededor para el texto.", no: "Escenas recargadas o sujetos pegados al borde." },
  { tema: "Fondo", si: "Fondos simples y parejos, en lo posible cerca de la paleta.", no: "Fondos con ruido o con carteles y logos ajenos." },
];

/** Paleta mínima que necesita el tratamiento. */
type PaletaFoto = Pick<Paleta, "color_marca" | "fondo_neutro">;

/**
 * Filtro de color de una foto. Siempre es una matriz 4×5 de `feColorMatrix` (20 valores, por filas, canales 0-1):
 * como es lineal, el mismo filtro se dibuja en el SVG de la pieza (navegador y PNG) y se aplica píxel a píxel al medir
 * el contraste, y las dos cosas coinciden.
 */
export interface FiltroFoto {
  tipo: "ninguno" | "gradacion" | "duotono";
  valores: number[];
}

const IDENTIDAD_4X5 = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const LUMA = [0.2126, 0.7152, 0.0722];

const aCanales = (c: HSL) => hslToRgb(c).map((v) => v / 255);

function matrizHacia(k: number, base: (canal: number) => { luma: number; fijo: number }): number[] {
  // Salida = (1 - k) · entrada + k · (fijo + luma · luminancia de la entrada), por canal.
  const filas: number[] = [];
  for (let c = 0; c < 3; c++) {
    const { luma, fijo } = base(c);
    const fila = [0, 0, 0, 0, 0];
    for (let j = 0; j < 3; j++) fila[j] = (j === c ? 1 - k : 0) + k * luma * LUMA[j];
    fila[4] = k * fijo;
    filas.push(...fila);
  }
  return [...filas, 0, 0, 0, 1, 0];
}

/**
 * Filtro del tratamiento de la marca, generado de su paleta:
 * - natural: sin filtro;
 * - gradación: mezcla hacia el color de marca (sombras al 35% de la marca, luces en la marca);
 * - duotono: la luminancia de la foto recorre el degradado entre el color de marca oscuro y el fondo neutro claro.
 */
export function filtroFoto(tratamiento: Tratamiento, paleta: PaletaFoto, intensidad = FOTOGRAFIA_POR_DEFECTO.intensidad): FiltroFoto {
  const k = Math.max(0, Math.min(1, intensidad));
  if (tratamiento === "natural" || k === 0) return { tipo: "ninguno", valores: IDENTIDAD_4X5 };
  if (tratamiento === "gradacion") {
    const m = aCanales(paleta.color_marca);
    return { tipo: "gradacion", valores: matrizHacia(k, (c) => ({ luma: 0.65 * m[c], fijo: 0.35 * m[c] })) };
  }
  // La tinta oscura del duotono es el color de marca bajado a una luminosidad que sostenga las sombras.
  const oscuro = aCanales({ ...paleta.color_marca, L: Math.min(paleta.color_marca.L, 22) });
  const claro = aCanales(paleta.fondo_neutro);
  return { tipo: "duotono", valores: matrizHacia(k, (c) => ({ luma: claro[c] - oscuro[c], fijo: oscuro[c] })) };
}

/** Filtro de la marca (o null si no cambia la foto). */
export function filtroDeMarca(identidad: { paleta: PaletaFoto; fotografia?: Fotografia }): FiltroFoto | null {
  const f = identidad.fotografia;
  if (!f || f.tratamiento === "natural") return null;
  const filtro = filtroFoto(f.tratamiento, identidad.paleta, f.intensidad);
  return filtro.tipo === "ninguno" ? null : filtro;
}

/** Valores para el atributo `values` de `feColorMatrix`. */
export const valoresSvg = (f: FiltroFoto): string => f.valores.map((v) => +v.toFixed(4)).join(" ");

/** Aplica el filtro a píxeles RGBA (0-255) y devuelve una copia. Es el mismo cálculo que hace el navegador con el SVG. */
export function aplicarFiltro(rgba: ArrayLike<number>, f: FiltroFoto): Uint8ClampedArray {
  const salida = new Uint8ClampedArray(rgba.length);
  const v = f.valores;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i] / 255;
    const g = rgba[i + 1] / 255;
    const b = rgba[i + 2] / 255;
    for (let c = 0; c < 3; c++) {
      const o = c * 5;
      salida[i + c] = Math.round(Math.max(0, Math.min(1, v[o] * r + v[o + 1] * g + v[o + 2] * b + v[o + 4])) * 255);
    }
    salida[i + 3] = rgba[i + 3];
  }
  return salida;
}

// ── Encuadre con punto focal ──

export interface Foco {
  x: number;
  y: number;
}
export const FOCO_CENTRO: Foco = { x: 0.5, y: 0.5 };

/**
 * Rectángulo donde se dibuja la imagen dentro de la caja de destino para llenarla (como `cover`) dejando el punto
 * focal lo más cerca posible del centro de la caja, sin mostrar vacío. Coordenadas relativas al destino.
 */
export function encuadre(
  foco: Foco,
  imagen: { w: number; h: number },
  destino: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const s = Math.max(destino.w / imagen.w, destino.h / imagen.h);
  const w = imagen.w * s;
  const h = imagen.h * s;
  const lugar = (centro: number, tam: number, caja: number) => Math.max(caja - tam, Math.min(0, caja / 2 - Math.max(0, Math.min(1, centro)) * tam));
  return { x: lugar(foco.x, w, destino.w), y: lugar(foco.y, h, destino.h), w, h };
}

// ── Texto sobre foto ──

export type Proteccion = "degradado" | "placa" | "zona";
export type LadoTexto = "arriba" | "abajo";

export const PROTECCIONES: { id: Proteccion; nombre: string; descripcion: string }[] = [
  { id: "degradado", nombre: "Degradado", descripcion: "Un degradado del color de fondo del modo detrás del bloque de texto." },
  { id: "placa", nombre: "Placa", descripcion: "Un rectángulo con el fondo del modo detrás del texto." },
  { id: "zona", nombre: "Zona limpia", descripcion: "Sin capa: el texto va en la parte más pareja de la foto (arriba o abajo)." },
];

/** Opacidad del fondo del modo en la parte protegida. */
export const ALFA_PROTECCION = 0.95;
/** Fracción de la zona segura que ocupa el bloque de texto en los formatos verticales. */
const FRACCION_BLOQUE = 0.58;

interface FormatoBloque {
  ancho: number;
  alto: number;
  zona: { x: number; arriba: number; abajo: number };
  columnaMensaje?: number;
}

/** Bloque de texto de la variante F (logo, mensaje y CTA), en px del lienzo. Horizontal: toda la columna izquierda. */
export function bloqueTexto(g: FormatoBloque, lado: LadoTexto) {
  const x = g.ancho * g.zona.x;
  const arriba = g.alto * g.zona.arriba;
  const abajo = g.alto * (1 - g.zona.abajo);
  if (g.columnaMensaje) return { x, y: arriba, w: g.ancho * g.columnaMensaje - x, h: abajo - arriba };
  const h = (abajo - arriba) * FRACCION_BLOQUE;
  return { x, y: lado === "abajo" ? abajo - h : arriba, w: g.ancho * (1 - 2 * g.zona.x), h };
}

/** Capa de protección: rectángulo, eje del degradado (fracciones del rectángulo) y paradas [posición, opacidad]. */
export interface CapaProteccion {
  tipo: "degradado" | "placa";
  rect: { x: number; y: number; w: number; h: number };
  eje: [number, number, number, number];
  paradas: [number, number][];
}

/**
 * Geometría de la protección de contraste detrás de un bloque de texto. Es la misma que dibuja la pieza y la que se
 * pinta en el lienzo de medición. La zona limpia no lleva capa.
 */
export function capaProteccion(
  proteccion: Proteccion,
  bloque: { x: number; y: number; w: number; h: number },
  f: { ancho: number; alto: number; columnaMensaje?: number },
  lado: LadoTexto,
): CapaProteccion | null {
  if (proteccion === "zona") return null;
  if (proteccion === "placa") {
    const aire = 28;
    const x = Math.max(0, bloque.x - aire);
    const y = Math.max(0, bloque.y - aire);
    return {
      tipo: "placa",
      rect: { x, y, w: Math.min(f.ancho, bloque.x + bloque.w + aire) - x, h: Math.min(f.alto, bloque.y + bloque.h + aire) - y },
      eje: [0, 0, 0, 1],
      paradas: [[0, ALFA_PROTECCION]],
    };
  }
  // Degradado: opaco en todo el bloque, se desvanece hacia el centro de la foto en un tramo del 40% del bloque.
  const A = ALFA_PROTECCION;
  const rampa = (largo: number, tramo: number): [number, number][] => {
    const r = tramo / largo;
    return [[0, 0], [r * 0.5, A * 0.55], [r, A], [1, A]];
  };
  if (f.columnaMensaje) {
    const fin = Math.min(f.ancho, bloque.x + bloque.w + bloque.w * 0.4);
    return { tipo: "degradado", rect: { x: 0, y: 0, w: fin, h: f.alto }, eje: [1, 0, 0, 0], paradas: rampa(fin, fin - (bloque.x + bloque.w)) };
  }
  const tramo = bloque.h * 0.4;
  if (lado === "abajo") {
    const y = Math.max(0, bloque.y - tramo);
    return { tipo: "degradado", rect: { x: 0, y, w: f.ancho, h: f.alto - y }, eje: [0, 0, 0, 1], paradas: rampa(f.alto - y, bloque.y - y) };
  }
  const fin = Math.min(f.alto, bloque.y + bloque.h + tramo);
  return { tipo: "degradado", rect: { x: 0, y: 0, w: f.ancho, h: fin }, eje: [0, 1, 0, 0], paradas: rampa(fin, fin - (bloque.y + bloque.h)) };
}

/** Contraste de un píxel RGB contra un color, con la luminancia WCAG. */
function luminanciaRgb(r: number, g: number, b: number): number {
  const c = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

/** Percentil con el que se resume el "peor" contraste: ignora el 5% de píxeles más extremos (ruido, un brillo suelto). */
export const PERCENTIL_PEOR = 0.05;

/**
 * Peor contraste real de un color de texto sobre los píxeles (RGBA) que hay detrás de él: el contraste del percentil
 * más bajo (por defecto el 5%), no el promedio, porque una sola zona clara ya hace ilegible una palabra.
 */
export function peorContraste(pixeles: ArrayLike<number>, colorTexto: HSL, percentil = PERCENTIL_PEOR): number {
  const lt = luminancia(colorTexto);
  const valores: number[] = [];
  for (let i = 0; i < pixeles.length; i += 4) {
    if (pixeles[i + 3] === 0) continue;
    const lp = luminanciaRgb(pixeles[i], pixeles[i + 1], pixeles[i + 2]);
    valores.push((Math.max(lt, lp) + 0.05) / (Math.min(lt, lp) + 0.05));
  }
  if (!valores.length) return 21;
  valores.sort((a, b) => a - b);
  return valores[Math.min(valores.length - 1, Math.floor(percentil * (valores.length - 1)))];
}

function luminancia(c: HSL): number {
  const [r, g, b] = hslToRgb(c);
  return luminanciaRgb(r, g, b);
}
