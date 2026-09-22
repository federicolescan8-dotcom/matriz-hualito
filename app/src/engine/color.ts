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

export function rgbToHsl([r, g, b]: RGB): HSL {
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
  return {
    H: Math.round(normalizarH(H)),
    S: Math.round(S * 100),
    L: Math.round(L * 100),
  };
}

export function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
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
