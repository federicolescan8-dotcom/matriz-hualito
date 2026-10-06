// Decoración de plantilla (v1.1): figuras que forman parte del diseño de la pieza, no una capa de relleno. Una pieza
// usa una sola de estas tres cosas: la capa decorativa de las 2B, una decoración de plantilla o la forma de fondo
// automática. Con una decoración elegida, la forma de fondo no va.
//
// Cada decoración es un conjunto de círculos en px del lienzo, calculados por formato. Sumar una decoración nueva es
// agregar una entrada a DECORACIONES con su geometría y las variantes donde se ofrece.

import { FORMATOS, type Formato } from "./formatos";
import type { Variante } from "./presets";

export type IdDecoracion = "arco-lateral" | "esquinas-diagonal";

export interface Circulo {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Geometría de una decoración:
 *   - "hueco": la figura es el lienzo menos un círculo gigante, solo del lado izquierdo de su centro (asoma en las
 *     esquinas de la izquierda);
 *   - "relleno": las figuras son los círculos (se recortan contra el lienzo).
 */
export interface GeometriaDecoracion {
  tipo: "hueco" | "relleno";
  circulos: Circulo[];
}

export interface Decoracion {
  id: IdDecoracion;
  nombre: string;
  descripcion: string;
  variantes: Variante[];
  /** Cómo se ubica el bloque del mensaje: centrado en alto (con el logo pegado al bloque) o como la variante. */
  bloque: "centrado" | "variante";
  geometria: (formato: Formato) => GeometriaDecoracion;
}

/**
 * Arco lateral (H1 protagonista). Medido sobre el ejemplo en 4:5: el fondo es un círculo con centro en el 69% del
 * ancho y el 50% del alto, radio del 77% del ancho. El arco toca los bordes superior e inferior en el 23,8% del ancho y
 * su punto más a la izquierda queda 8,1% fuera del lienzo. En los demás formatos se conserva eso (flecha del arco en
 * fracción del ancho), simétrico respecto del eje horizontal.
 */
function arcoLateral(formato: Formato): GeometriaDecoracion {
  const f = FORMATOS[formato];
  const flecha = 0.319 * f.ancho; // del borde superior (23,8%) al punto más a la izquierda (-8,1%)
  const semicuerda = f.alto / 2;
  const r = (semicuerda ** 2 + flecha ** 2) / (2 * flecha);
  return { tipo: "hueco", circulos: [{ cx: -0.081 * f.ancho + r, cy: f.alto / 2, r }] };
}

/**
 * Esquinas en diagonal (Contacto). Medido sobre el ejemplo en 4:5: dos círculos de radio 74,2% del ancho con el centro
 * fuera del lienzo, que asoman arriba a la izquierda (cortan el borde superior en el 26,3% y el izquierdo en el 28,3%
 * del ancho) y, simétricos respecto del centro de la pieza, abajo a la derecha. La unidad es el ancho en los verticales
 * y el alto / 1,25 en los apaisados, para que las esquinas no crezcan con el ancho.
 */
function esquinasDiagonal(formato: Formato): GeometriaDecoracion {
  const f = FORMATOS[formato];
  const u = Math.min(f.ancho, f.alto / 1.25);
  const a = 0.263 * u; // corte con el borde superior
  const b = 0.283 * u; // corte con el borde izquierdo
  const r = 0.742 * u;
  // Centro sobre la mediatriz de (a,0)-(0,b), del lado de afuera del lienzo.
  const largo = Math.hypot(a, b);
  const d = Math.sqrt(r * r - (largo / 2) ** 2);
  const n = { x: b / largo, y: a / largo };
  const c = { cx: a / 2 - d * n.x, cy: b / 2 - d * n.y, r };
  return { tipo: "relleno", circulos: [c, { cx: f.ancho - c.cx, cy: f.alto - c.cy, r }] };
}

export const DECORACIONES: Record<IdDecoracion, Decoracion> = {
  "arco-lateral": {
    id: "arco-lateral",
    nombre: "Arco lateral",
    descripcion: "El fondo es un gran círculo; el tono de apoyo asoma en las esquinas de la izquierda.",
    variantes: ["2"],
    bloque: "centrado",
    geometria: arcoLateral,
  },
  "esquinas-diagonal": {
    id: "esquinas-diagonal",
    nombre: "Esquinas en diagonal",
    descripcion: "Dos curvas en tono de apoyo, arriba a la izquierda y abajo a la derecha, simétricas respecto del centro.",
    variantes: ["3"],
    bloque: "variante",
    geometria: esquinasDiagonal,
  },
};

export function decoracionesPara(variante: Variante): Decoracion[] {
  return Object.values(DECORACIONES).filter((d) => d.variantes.includes(variante));
}

/** Decoración efectiva de la pieza: la elegida, si se ofrece en su variante. */
export function decoracionEfectiva(pieza: { decoracion?: IdDecoracion | null; variante: Variante }): Decoracion | null {
  const d = pieza.decoracion ? DECORACIONES[pieza.decoracion] : null;
  return d && d.variantes.includes(pieza.variante) ? d : null;
}

/** Sombra mínima de las figuras, medida del ejemplo: oscurece ~8% junto al borde y se desvanece en ~30 px. */
export const SOMBRA_DECORACION = { desenfoque: 12, opacidad: 0.2 };

/**
 * El rectángulo (px del lienzo) toca alguna figura de la decoración, con un aire de `aire` px. En "hueco", la figura
 * es lo que queda afuera del círculo a la izquierda de su centro: el rectángulo la toca si no entra entero en el
 * círculo achicado por el aire.
 */
export function tocaDecoracion(k: { x: number; y: number; w: number; h: number }, g: GeometriaDecoracion, aire = 0): boolean {
  if (g.tipo === "hueco") {
    const c = g.circulos[0];
    const esquinas = [
      [k.x, k.y],
      [k.x + k.w, k.y],
      [k.x, k.y + k.h],
      [k.x + k.w, k.y + k.h],
    ];
    return esquinas.some(([x, y]) => x < c.cx && Math.hypot(x - c.cx, y - c.cy) > c.r - aire);
  }
  return g.circulos.some((c) => {
    const x = Math.max(k.x, Math.min(c.cx, k.x + k.w));
    const y = Math.max(k.y, Math.min(c.cy, k.y + k.h));
    return Math.hypot(x - c.cx, y - c.cy) < c.r + aire;
  });
}

/**
 * Trazado SVG de la decoración en px del lienzo.
 *
 * El hueco se traza como un contorno simple, sin recortes: baja por fuera del lienzo a la izquierda, entra por la
 * vertical del centro hasta el círculo y vuelve por el medio círculo izquierdo. Los tramos verticales sobre el centro
 * quedan fuera del lienzo (el radio cubre el alto), así no hay ningún borde de corte adentro de la pieza. Un recorte
 * con clipPath dejaba una línea de un píxel en esa vertical por el antialiasing.
 */
export function trazadoDecoracion(g: GeometriaDecoracion, ancho: number, alto: number): { d: string } {
  const circulo = ({ cx, cy, r }: Circulo) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  if (g.tipo === "hueco") {
    const { cx, cy, r } = g.circulos[0];
    const m = Math.max(ancho, alto); // margen fuera del lienzo
    const arriba = Math.min(cy - r, -m);
    const abajo = Math.max(cy + r, alto + m);
    return {
      d: `M${cx} ${arriba}H${-m}V${abajo}H${cx}V${cy + r}A${r} ${r} 0 0 1 ${cx} ${cy - r}Z`,
    };
  }
  return { d: g.circulos.map(circulo).join("") };
}
