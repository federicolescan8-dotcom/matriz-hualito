// Utilidades de color: HSL <-> RGB/HEX y contraste WCAG 2.x.
// Convención del sistema: H en grados 0-360, S y L en porcentaje 0-100.

export interface HSL {
  H: number;
  S: number;
  L: number;
}

export type RGB = [number, number, number]; // 0-255

export const BLANCO: HSL = { H: 0, S: 0, L: 100 };

export function normalizarH(h: number): number {
  return ((h % 360) + 360) % 360;
}

export function hslToRgb({ H, S, L }: HSL): RGB {
  const s = S / 100;
  const l = L / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = normalizarH(H) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255)) as RGB;
}

/** `exacto` conserva decimales: sirve para que un HEX ingresado a mano vuelva idéntico al convertirlo de nuevo. */
export function rgbToHsl([r, g, b]: RGB, exacto = false): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const L = (max + min) / 2;
  let H = 0;
  let S = 0;
  if (d !== 0) {
    S = d / (1 - Math.abs(2 * L - 1));
    if (max === rn) H = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) H = 60 * ((bn - rn) / d + 2);
    else H = 60 * ((rn - gn) / d + 4);
  }
  const r2 = (v: number) => (exacto ? Math.round(v * 100) / 100 : Math.round(v));
  return { H: r2(normalizarH(H)), S: r2(S * 100), L: r2(L * 100) };
}

export function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

export function hexToHsl(hex: string, exacto = false): HSL | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb, exacto) : null;
}

export function hslToHex(c: HSL): string {
  return "#" + hslToRgb(c).map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function hslCss({ H, S, L }: HSL): string {
  return `hsl(${Math.round(H)} ${S}% ${L}%)`;
}

function canal(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminancia(c: HSL): number {
  const [r, g, b] = hslToRgb(c);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste WCAG, simétrica: contraste(a, b) === contraste(b, a). */
export function contraste(a: HSL, b: HSL): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Distancia angular mínima entre dos matices. */
export function distanciaH(a: number, b: number): number {
  const d = Math.abs(normalizarH(a) - normalizarH(b));
  return Math.min(d, 360 - d);
}

/** Normaliza "#abc", "abc" o "#AABBCC" a "#aabbcc"; null si no es un HEX válido. */
export function normalizarHex(v: string): string | null {
  const rgb = hexToRgb(v);
  return rgb ? "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("") : null;
}

/** Color resultante de poner `arriba` con opacidad `alfa` (0-1) sobre `abajo`. */
export function mezclar(abajo: HSL, arriba: HSL, alfa: number): HSL {
  const a = hslToRgb(abajo);
  const b = hslToRgb(arriba);
  return rgbToHsl(a.map((v, i) => Math.round(v * (1 - alfa) + b[i] * alfa)) as RGB, true);
}

function lab(c: HSL): [number, number, number] {
  const [r, g, b] = hslToRgb(c).map(canal);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Diferencia perceptual entre dos colores (ΔE 1976 en CIELAB): ~2 apenas se nota, >10 es otro color. */
export function distanciaColor(a: HSL, b: HSL): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// OKLCH (Björn Ottosson): L 0-1, C ~0-0,37, h en grados. A igual L, los colores se perciben igual de claros, cosa que
// no pasa con la L de HSL; por eso sirve para mover solo la luminosidad conservando el matiz (técnica de Leonardo).

/** OKLCH de un color: [L, C, h]. */
export function oklch(c: HSL): [number, number, number] {
  const [r, g, b] = hslToRgb(c).map(canal);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), normalizarH((Math.atan2(B, A) * 180) / Math.PI)];
}

/** sRGB lineal (0-1, sin recortar) de un OKLCH. */
function linealDesdeOklch(L: number, C: number, h: number): [number, number, number] {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const dentroDeGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * Color HSL de un OKLCH. Si no entra en sRGB se baja el croma hasta que entre (como el gamut mapping de CSS Color 4),
 * sin tocar L ni h. Se redondea a RGB para que el color validado sea el mismo que se usa.
 */
export function desdeOklch(L: number, C: number, h: number): HSL {
  let lineal = linealDesdeOklch(L, C, h);
  if (!dentroDeGamut(lineal)) {
    let [lo, hi] = [0, C];
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (dentroDeGamut(linealDesdeOklch(L, mid, h))) lo = mid;
      else hi = mid;
    }
    lineal = linealDesdeOklch(L, lo, h);
  }
  const gamma = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  };
  return rgbToHsl(lineal.map(gamma) as RGB, true);
}
