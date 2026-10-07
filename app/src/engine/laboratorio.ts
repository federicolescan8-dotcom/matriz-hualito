// Laboratorio de color (replanteo, E3): armonías, paleta extendida (secundarios y neutro oscuro), bloquear y
// regenerar, extracción de colores de una imagen y simulación de daltonismo. Todo puro: el navegador solo aporta los
// píxeles de la imagen.

import { contraste, distanciaColor, hslToRgb, normalizarH, rgbToHsl, type HSL, type RGB } from "./color";
import { ajustarRol, derivarPaleta, fallasPaleta, MIN_GRAFICO, MIN_TEXTO, type Paleta, type RolPaleta } from "./palette";
import type { Rubro, ValorMarca } from "./presets";

// ── Armonías ──

export type Armonia = "analoga" | "complementaria" | "triadica" | "dividida";

export const ARMONIAS: { id: Armonia; nombre: string; desplazamientos: number[] }[] = [
  { id: "analoga", nombre: "Análoga", desplazamientos: [-30, 30] },
  { id: "complementaria", nombre: "Complementaria", desplazamientos: [180, 150] },
  { id: "triadica", nombre: "Triádica", desplazamientos: [120, 240] },
  { id: "dividida", nombre: "Complementaria dividida", desplazamientos: [150, 210] },
];

/** Un color secundario de la paleta extendida y si puede ir como texto sobre el fondo neutro. */
export interface Secundario {
  color: HSL;
  /** Contraste ≥ 4,5:1 contra el fondo neutro. Si no, solo masas, formas y decoración (nunca texto). */
  texto: boolean;
}

export interface PaletaExtendida {
  armonia: Armonia;
  secundarios: Secundario[];
  /** Neutro oscuro del matiz de la marca: texto largo y fondos oscuros. */
  neutro_oscuro: HSL;
}

/** L de los secundarios: medio, para que funcionen como masa sobre el fondo neutro (≥ 3:1) sin competir con la marca. */
const S_SECUNDARIO = 55;

/** Secundario de un matiz: la L más clara que alcanza 3:1 contra el fondo neutro (para masas y formas). */
function secundarioDe(H: number, p: Paleta): Secundario {
  let color: HSL = { H: normalizarH(H), S: S_SECUNDARIO, L: 60 };
  while (contraste(color, p.fondo_neutro) < MIN_GRAFICO && color.L > 20) color = { ...color, L: color.L - 2 };
  return { color, texto: contraste(color, p.fondo_neutro) >= MIN_TEXTO };
}

/** Paleta extendida: 2 secundarios de la armonía elegida y un neutro oscuro, a partir del color de marca. */
export function paletaExtendida(p: Paleta, armonia: Armonia): PaletaExtendida {
  const a = ARMONIAS.find((x) => x.id === armonia)!;
  return {
    armonia,
    secundarios: a.desplazamientos.map((d) => secundarioDe(p.color_marca.H + d, p)),
    neutro_oscuro: { H: p.color_marca.H, S: Math.min(20, p.color_marca.S), L: 14 },
  };
}

/** Recalcula si cada secundario puede ir como texto (cuando cambia el fondo neutro). */
export function revalidarExtendida(e: PaletaExtendida, p: Paleta): PaletaExtendida {
  return { ...e, secundarios: e.secundarios.map((s) => ({ ...s, texto: contraste(s.color, p.fondo_neutro) >= MIN_TEXTO })) };
}

// ── Bloquear y regenerar ──

/** Generador pseudoaleatorio con semilla (mulberry32): mismas opciones para la misma semilla. */
function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Alternativa {
  paleta: Paleta;
  /** Paleta tal como la calculó la fórmula, antes de imponer los colores bloqueados. */
  calculada: Paleta;
  /** Roles bloqueados que quedaron distintos de la fórmula (cuentan como ajuste manual). */
  ajustes: RolPaleta[];
  /** Controles de paleta que no cumple (avisos). */
  fallas: number;
}

/**
 * Bloquear y regenerar (estilo Coolors): genera alternativas con la fórmula moviendo el matiz y el tipo de acento, y
 * respeta los roles bloqueados tal como están. Las que cumplen todos los controles van primero.
 */
export function regenerarPaleta(
  actual: Paleta,
  bloqueados: RolPaleta[],
  entrada: { rubro: Rubro; valor: ValorMarca | null; excluido_H: number | null; solo_heredado?: boolean },
  semilla: number,
  cantidad = 3,
): Alternativa[] {
  const r = azar(semilla);
  const salida: Alternativa[] = [];
  for (let intento = 0; intento < cantidad * 6 && salida.length < cantidad; intento++) {
    const valor: ValorMarca = r() < 0.5 ? "energia" : "calma";
    // Con el color de marca bloqueado, el resto se deriva en modo heredado: la fórmula ajusta el fondo y la versión
    // funcional a ese color exacto (cap. 3). Si no, se mueve el matiz y se deriva en modo optimizado.
    const base = { rubro: entrada.rubro, valor: entrada.valor ?? valor, excluido_H: entrada.excluido_H };
    const res = bloqueados.includes("color_marca")
      ? derivarPaleta({ ...base, modo: "heredado", heredado: actual.color_marca, funcional: !entrada.solo_heredado })
      : derivarPaleta({ ...base, modo: "optimizado", H: normalizarH(actual.color_marca.H + (r() * 2 - 1) * 70) });
    if (!res.paleta) continue;
    // Un pequeño corrimiento del acento para que dos alternativas del mismo matiz no salgan idénticas.
    const calculada = ajustarRol(res.paleta, "acento", { ...res.paleta.acento, H: normalizarH(res.paleta.acento.H + (r() * 2 - 1) * 15) });
    let paleta = calculada;
    const ajustes: RolPaleta[] = [];
    for (const rol of bloqueados) {
      const color = actual[rol];
      if (!color) continue;
      paleta = ajustarRol(paleta, rol, color);
      if (distanciaColor(color, calculada[rol] ?? color) > 0.5) ajustes.push(rol);
    }
    // Alternativas que se parecen a una ya generada no suman.
    if (salida.some((s) => distanciaColor(s.paleta.color_marca, paleta.color_marca) < 4 && distanciaColor(s.paleta.acento, paleta.acento) < 4)) continue;
    salida.push({ paleta, calculada, ajustes, fallas: fallasPaleta(paleta).length });
  }
  return salida.sort((a, b) => a.fallas - b.fallas);
}

// ── Extraer colores de una imagen ──

/**
 * Colores dominantes de una imagen (k-medias sobre RGB). Ignora píxeles transparentes y casi blancos o casi negros,
 * que en un logo o una foto son fondo o contorno. Devuelve de más a menos frecuente.
 */
export function extraerColores(pixeles: { rgb: RGB; alfa: number }[], k = 5): { color: HSL; peso: number }[] {
  const utiles = pixeles
    .filter((p) => p.alfa > 128)
    .map((p) => p.rgb)
    .filter(([r, g, b]) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return !(min > 240) && !(max < 18);
    });
  if (!utiles.length) return [];
  // Centros iniciales repartidos a lo largo de los píxeles ordenados por luminosidad: determinista.
  const orden = [...utiles].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centros: RGB[] = Array.from({ length: Math.min(k, orden.length) }, (_, i) => orden[Math.floor(((i + 0.5) * orden.length) / k)]);
  let grupos: RGB[][] = [];
  for (let iter = 0; iter < 12; iter++) {
    grupos = centros.map(() => []);
    for (const px of utiles) {
      let mejor = 0;
      let dist = Infinity;
      centros.forEach((c, i) => {
        const d = (c[0] - px[0]) ** 2 + (c[1] - px[1]) ** 2 + (c[2] - px[2]) ** 2;
        if (d < dist) [mejor, dist] = [i, d];
      });
      grupos[mejor].push(px);
    }
    centros = grupos.map((g, i) =>
      g.length ? ([0, 1, 2].map((j) => Math.round(g.reduce((s, px) => s + px[j], 0) / g.length)) as RGB) : centros[i],
    );
  }
  const total = utiles.length;
  const colores = centros
    .map((c, i) => ({ color: rgbToHsl(c, true), peso: grupos[i].length / total }))
    .filter((c) => c.peso > 0.02)
    .sort((a, b) => b.peso - a.peso);
  // Se juntan los que perceptualmente son el mismo color.
  return colores.filter((c, i) => !colores.slice(0, i).some((o) => distanciaColor(o.color, c.color) < 8));
}

// ── Daltonismo ──

export type Daltonismo = "protanopia" | "deuteranopia" | "tritanopia";

/** Matrices de Machado, Oliveira y Fernandes (2009), severidad 1, sobre RGB lineal. */
export const MATRICES_DALTONISMO: Record<Daltonismo, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

const aLineal = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const aSrgb = (v: number) => {
  const c = Math.max(0, Math.min(1, v));
  return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
};

/** Cómo ve el color una persona con el tipo de daltonismo indicado. */
export function simularDaltonismo(c: HSL, tipo: Daltonismo): HSL {
  const [r, g, b] = hslToRgb(c).map(aLineal);
  const m = MATRICES_DALTONISMO[tipo];
  const rgb: RGB = [aSrgb(m[0] * r + m[1] * g + m[2] * b), aSrgb(m[3] * r + m[4] * g + m[5] * b), aSrgb(m[6] * r + m[7] * g + m[8] * b)];
  return rgbToHsl(rgb, true);
}

/** Por debajo de esta distancia (ΔE) dos colores se confunden. */
export const DELTA_CONFUSION = 12;

/**
 * Pares de la paleta que se confunden con algún tipo de daltonismo (ΔE simulado bajo el umbral) y que con visión
 * típica sí se distinguen. El par crítico es el acento contra el color de marca: es el CTA.
 */
export function confusionesDaltonismo(p: Paleta): { tipo: Daltonismo; par: string; delta: number }[] {
  const pares: [string, HSL, HSL][] = [
    ["acento y color de marca", p.acento, p.color_marca],
    ["acento y fondo neutro", p.acento, p.fondo_neutro],
    ["color de marca y tono de apoyo", p.color_marca, p.tono_apoyo],
  ];
  const salida: { tipo: Daltonismo; par: string; delta: number }[] = [];
  for (const tipo of Object.keys(MATRICES_DALTONISMO) as Daltonismo[]) {
    for (const [par, a, b] of pares) {
      if (distanciaColor(a, b) < DELTA_CONFUSION) continue;
      const delta = distanciaColor(simularDaltonismo(a, tipo), simularDaltonismo(b, tipo));
      if (delta < DELTA_CONFUSION) salida.push({ tipo, par, delta });
    }
  }
  return salida;
}
