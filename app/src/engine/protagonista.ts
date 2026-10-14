// Variantes con la imagen como protagonista: la foto o el producto es el sujeto de la pieza y el texto lo acompaña.
// - FP · Producto héroe: el producto recortado (PNG con transparencia), grande, sobre el fondo plano del modo.
// - FT · Titular sobre foto: foto a sangre con un titular (o una cifra de oferta) gigante encima.
// - FB · Foto con banda: la foto arriba, a sangre, y una banda del color del modo abajo con el mensaje.
// Todo es geometría pura en px del lienzo: Pieza.tsx la dibuja y el checklist la controla.

import { FORMATOS, type Formato } from "./formatos";
import { bloqueTexto, type LadoTexto } from "./fotografia";
import type { Variante } from "./presets";

export interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BordeBanda = "recto" | "onda";

export const BORDES_BANDA: { id: BordeBanda; nombre: string; descripcion: string }[] = [
  { id: "recto", nombre: "Recto", descripcion: "La banda corta la foto con una línea recta." },
  { id: "onda", nombre: "Onda", descripcion: "La banda corta la foto con una sola onda suave." },
];

export const VARIANTES_PROTAGONISTA: Variante[] = ["FP", "FT", "FB"];

/** La imagen es el sujeto de la pieza: sin foto cargada la variante no se sostiene. */
export function esProtagonista(v: Variante): boolean {
  return VARIANTES_PROTAGONISTA.includes(v);
}

/** Variantes que llevan una foto propia en `foto_fondo` (F y las de imagen protagonista): piden fotos habilitadas. */
export function usaFotoFondo(v: Variante): boolean {
  return v === "F" || esProtagonista(v);
}

// ── FP · Producto héroe ──

/** Fracción del alto libre (sin el pie) que ocupa el mensaje; el resto es del producto. */
export const FRACCION_MENSAJE_PRODUCTO = 0.36;
/** Aire entre el mensaje del 1200×630 y la caja del producto, en px. */
const AIRE_COLUMNA = 40;

/**
 * Cajas del producto héroe. En vertical, una columna en la zona segura: el mensaje (H1 y bajada) arriba o abajo del
 * producto y, cerrando, el pie con el CTA y el logo. En 1200×630 el mensaje y el pie van en la columna izquierda y el
 * producto ocupa la derecha.
 * @param pie alto del pie (CTA y logo en una fila), en px.
 * @param separacion espacio entre bloques, en px.
 */
export function geometriaProducto(formato: Formato, lado: LadoTexto, pie: number, separacion: number): { mensaje: Caja; producto: Caja; pie: Caja } {
  const f = FORMATOS[formato];
  const x = f.ancho * f.zona.x;
  const arriba = f.alto * f.zona.arriba;
  const abajo = f.alto * (1 - f.zona.abajo);
  if (f.columnaMensaje) {
    const w = f.ancho * f.columnaMensaje - x;
    const xp = f.ancho * f.columnaMensaje + AIRE_COLUMNA;
    return {
      mensaje: { x, y: arriba, w, h: abajo - pie - separacion - arriba },
      pie: { x, y: abajo - pie, w, h: pie },
      producto: { x: xp, y: arriba, w: f.ancho * (1 - f.zona.x) - xp, h: abajo - arriba },
    };
  }
  const w = f.ancho - 2 * x;
  const libre = abajo - pie - separacion - arriba;
  const hm = libre * FRACCION_MENSAJE_PRODUCTO;
  const hp = libre - hm - separacion;
  return {
    mensaje: { x, y: lado === "arriba" ? arriba : arriba + hp + separacion, w, h: hm },
    producto: { x, y: lado === "arriba" ? arriba + hm + separacion : arriba, w, h: hp },
    pie: { x, y: abajo - pie, w, h: pie },
  };
}

/** La imagen entera dentro de la caja, lo más grande posible y centrada (como `contain`): así se ve todo el producto. */
export function contener(imagen: { w: number; h: number }, caja: Caja): Caja {
  const s = Math.min(caja.w / imagen.w, caja.h / imagen.h);
  const w = imagen.w * s;
  const h = imagen.h * s;
  return { x: caja.x + (caja.w - w) / 2, y: caja.y + (caja.h - h) / 2, w, h };
}

// ── FT · Titular sobre foto ──

/**
 * Fracción de la zona segura que ocupa el bloque del titular. Es menor que la de la F (58%): la foto se ve más y el
 * bloque lleva menos piezas (un titular gigante y una bajada corta).
 */
export const FRACCION_TITULAR = 0.5;

/** Bloque de texto del titular sobre foto. En 1200×630, como en la F, toda la columna izquierda. */
export function bloqueTitular(formato: Formato, lado: LadoTexto): Caja {
  return bloqueTexto(FORMATOS[formato], lado, FRACCION_TITULAR);
}

// ── FB · Foto con banda ──

/** Dónde corta la banda a la foto: fracción del alto (verticales) o del ancho (1200×630). */
const CORTE_BANDA: Record<Formato, number> = { "4:5": 0.55, "1:1": 0.5, "9:16": 0.55, "1200x630": 0.55 };
/** Amplitud de la onda: fracción del alto (verticales) o del ancho (1200×630). */
export const AMPLITUD_ONDA = 0.03;
/** Puntos con que se traza la onda. */
const PUNTOS_ONDA = 48;

export interface GeometriaBanda {
  /** Caja de la foto: pasa por debajo de la onda, así no queda un hueco en sus valles. */
  foto: Caja;
  /** Trazado SVG de la banda (en px del lienzo). */
  path: string;
  /** Borde de la banda como puntos, para los tests y la medición. */
  borde: { x: number; y: number }[];
  /** Caja donde va el mensaje, el CTA y el logo: siempre sobre la banda, nunca sobre la foto. */
  texto: Caja;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Geometría de la foto con banda. En vertical, la foto arriba y la banda abajo; el borde es una recta o una sola onda
 * (un período de seno a lo ancho). En 1200×630 la banda es la columna izquierda y la foto, la derecha.
 * @param separacion aire entre el borde de la banda y el texto, en px.
 */
export function geometriaBanda(formato: Formato, borde: BordeBanda, separacion: number): GeometriaBanda {
  const f = FORMATOS[formato];
  const zx = f.ancho * f.zona.x;
  const arriba = f.alto * f.zona.arriba;
  const abajo = f.alto * (1 - f.zona.abajo);
  const n = PUNTOS_ONDA;
  if (f.columnaMensaje) {
    const corte = f.ancho * CORTE_BANDA[formato];
    const a = borde === "onda" ? f.ancho * AMPLITUD_ONDA : 0;
    const puntos = Array.from({ length: n + 1 }, (_, i) => ({ x: r1(corte + a * Math.sin((2 * Math.PI * i) / n)), y: r1((f.alto * i) / n) }));
    const path = `M0 0 ${puntos.map((p) => `L${p.x} ${p.y}`).join(" ")} L0 ${f.alto} Z`;
    return {
      foto: { x: corte - a, y: 0, w: f.ancho - (corte - a), h: f.alto },
      path,
      borde: puntos,
      texto: { x: zx, y: arriba, w: Math.min(f.ancho * f.columnaMensaje, corte - a - separacion) - zx, h: abajo - arriba },
    };
  }
  const corte = f.alto * CORTE_BANDA[formato];
  const a = borde === "onda" ? f.alto * AMPLITUD_ONDA : 0;
  const puntos = Array.from({ length: n + 1 }, (_, i) => ({ x: r1((f.ancho * i) / n), y: r1(corte + a * Math.sin((2 * Math.PI * i) / n)) }));
  const path = `M0 ${f.alto} ${puntos.map((p) => `L${p.x} ${p.y}`).join(" ")} L${f.ancho} ${f.alto} Z`;
  const y = Math.max(arriba, corte + a + separacion);
  return {
    foto: { x: 0, y: 0, w: f.ancho, h: corte + a },
    path,
    borde: puntos,
    texto: { x: zx, y, w: f.ancho - 2 * zx, h: abajo - y },
  };
}
