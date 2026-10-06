// Rasgos propios de la marca (replanteo, E2): forma propia (la dibuja el diseñador y se carga en SVG, o se genera con
// una semilla a partir de los ejes), patrón propio (repetición de la forma) y detalle recurrente. La capa decorativa,
// las decoraciones y la forma de fondo usan primero lo propio; el checklist mide su contorno real como el de cualquier
// forma de la biblioteca.

import type { Forma } from "./biblioteca";
import type { Ejes } from "./ejes";

export type DetalleRecurrente = "subrayado" | "marco";

export interface RecursosPropios {
  /** Formas propias, normalizadas a la caja 0-100 de la biblioteca. Van primero en la capa decorativa. */
  formas: Forma[];
  /** El patrón de la capa decorativa repite la primera forma propia. */
  patron_propio?: boolean;
  /** Detalle que se repite en todas las piezas, con la tinta de la marca. */
  detalle?: DetalleRecurrente | null;
}

/** Prefijo de las formas propias: no chocan con las de la biblioteca. */
export const PREFIJO_PROPIA = "propia-";

/**
 * Contorno muestreado de una forma (en cualquier unidad) a un trazado en la caja 0-100: escala uniforme para que entre
 * entera, centrado. Así la forma propia se dibuja y se mide igual que las de la biblioteca.
 */
export function normalizarContorno(puntos: { x: number; y: number }[]): string {
  if (puntos.length < 3) return "";
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = 100 / Math.max(x1 - x0, y1 - y0, 1e-6);
  const dx = (100 - (x1 - x0) * k) / 2;
  const dy = (100 - (y1 - y0) * k) / 2;
  const r = (v: number) => Math.round(v * 10) / 10;
  return (
    puntos.map((p, i) => `${i ? "L" : "M"}${r((p.x - x0) * k + dx)} ${r((p.y - y0) * k + dy)}`).join("") + "Z"
  );
}

/** Generador con semilla (mulberry32). */
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

/**
 * Forma paramétrica con semilla, derivada de los ejes: cuanto más artesanal y lúdica la marca, más orgánica e irregular
 * (mancha de 3 a 6 lóbulos); cuanto más tecnológica y moderna, más cerca de un cuadrado redondeado (superelipse). El
 * contorno es una curva cerrada suave (Catmull-Rom a Bézier) dentro de la caja 0-100.
 */
export function formaParametrica(semilla: number, ejes: Ejes, nombre = "Forma propia"): Forma {
  const r = azar(semilla);
  const organica = ((100 - ejes.artesanal_tecnologico) + ejes.serio_ludico) / 200; // 0 = geométrica, 1 = orgánica
  const lobulos = 3 + Math.floor(r() * 4);
  const amp = 0.04 + organica * 0.16;
  const fases = Array.from({ length: 3 }, () => r() * Math.PI * 2);
  // Exponente de la superelipse: 2 es elipse; más alto, más cuadrado (marcas tecnológicas).
  const n = 2 + (1 - organica) * 3;
  const N = 24;
  const puntos = Array.from({ length: N }, (_, i) => {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const base = 1 / Math.pow(Math.pow(Math.abs(c), n) + Math.pow(Math.abs(s), n), 1 / n);
    const ondas = 1 + amp * (Math.sin(lobulos * t + fases[0]) + 0.5 * Math.sin((lobulos + 1) * t + fases[1]) + 0.3 * Math.sin(2 * t + fases[2]));
    const radio = base * ondas;
    return { x: 50 + 46 * radio * c, y: 50 + 46 * radio * s };
  });
  return { id: `${PREFIJO_PROPIA}${semilla}`, nombre, categoria: "propias", d: curvaCerrada(puntos), contiene: true };
}

/** Curva cerrada suave que pasa por los puntos (Catmull-Rom convertido a Bézier cúbicas), reescalada a la caja 0-100. */
function curvaCerrada(p: { x: number; y: number }[]): string {
  const xs = p.map((q) => q.x);
  const ys = p.map((q) => q.y);
  const k = 100 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const q = p.map((v) => ({ x: 50 + (v.x - cx) * k, y: 50 + (v.y - cy) * k }));
  const r = (v: number) => Math.round(v * 10) / 10;
  const n = q.length;
  let d = `M${r(q[0].x)} ${r(q[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = q[(i - 1 + n) % n];
    const p1 = q[i];
    const p2 = q[(i + 1) % n];
    const p3 = q[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d + "Z";
}
