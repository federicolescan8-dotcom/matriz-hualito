// Generación del par monocromo a partir del logo color en SVG (manual cap. 2 paso 4).
// Trabajo de una sola vez por cliente: recolorea todo relleno y trazo visible con un único color.

const ATRIBUTO = /\b(fill|stroke)\s*=\s*"(?!none\b)(?!url\()[^"]*"/gi;
const PROPIEDAD = /\b(fill|stroke)\s*:\s*(?!none\b)(?!url\()[^;"}]+/gi;
const STOP = /\bstop-color\s*[:=]\s*"?[^;"}\s]+"?/gi;

export function recolorearSvg(svg: string, color: string): string {
  let out = svg
    .replace(ATRIBUTO, (_, prop: string) => `${prop}="${color}"`)
    .replace(PROPIEDAD, (_, prop: string) => `${prop}:${color}`)
    .replace(STOP, `stop-color="${color}"`);
  // Los elementos sin fill explícito heredan negro: se fija el color en la raíz.
  out = out.replace(/<svg\b([^>]*)>/i, (m, attrs: string) =>
    /\bfill\s*=/.test(attrs) ? m.replace(ATRIBUTO, (_, p: string) => `${p}="${color}"`) : `<svg${attrs} fill="${color}">`,
  );
  return out;
}

export function svgADataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function dataUrlASvg(dataUrl: string): string | null {
  const m = /^data:image\/svg\+xml(;charset=[^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  return m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
}

// ── Logo como sistema (replanteo, E4) ──
// Las versiones las dibuja el diseñador (Illustrator, Photoshop, Corel) y se cargan; la herramienta elige cuál usar en
// cada pieza, deriva los monocromos de los SVG y controla área de seguridad, tamaño mínimo y contraste.

export type VersionLogo = "horizontal" | "vertical" | "simbolo" | "monograma";

export const VERSIONES_LOGO: { id: VersionLogo; nombre: string; uso: string }[] = [
  { id: "horizontal", nombre: "Horizontal", uso: "lugares anchos: encabezados, 1200×630" },
  { id: "vertical", nombre: "Vertical", uso: "lugares altos o angostos" },
  { id: "simbolo", nombre: "Solo símbolo", uso: "espacios chicos y cuadrados" },
  { id: "monograma", nombre: "Monograma", uso: "avatar, íconos y sellos" },
];

/** Un archivo de logo y su proporción (ancho / alto), medida al cargarlo. */
export interface ArchivoLogo {
  src: string;
  aspecto: number;
}

/** Área de seguridad: aire libre alrededor del logo, como fracción de su alto. */
export const AREA_SEGURIDAD = 0.25;
/** Alto mínimo del logo visible, en px de lienzo feed (en story se multiplica por el factor de escala). */
export const LOGO_MIN_PX = 48;

const PRIORIDAD: (VersionLogo | "principal")[] = ["principal", "horizontal", "vertical", "simbolo", "monograma"];

/**
 * Versión del logo para un lugar de `ancho × alto` px: la que se ve más grande ahí (alto visible con "contain"). Si
 * empatan (±5%), la más completa, en el orden principal, horizontal, vertical, símbolo y monograma.
 */
export function elegirVersionLogo(
  principal: ArchivoLogo | null,
  versiones: Partial<Record<VersionLogo, ArchivoLogo>> | undefined,
  lugar: { ancho: number; alto: number },
): { version: VersionLogo | "principal"; archivo: ArchivoLogo } | null {
  const candidatos = PRIORIDAD.map((v) => ({ version: v, archivo: v === "principal" ? principal : versiones?.[v] })).filter(
    (c): c is { version: VersionLogo | "principal"; archivo: ArchivoLogo } => !!c.archivo,
  );
  if (!candidatos.length) return null;
  const altoVisible = (a: ArchivoLogo) => Math.min(lugar.alto, lugar.ancho / Math.max(a.aspecto, 0.01));
  const mejor = Math.max(...candidatos.map((c) => altoVisible(c.archivo)));
  return candidatos.find((c) => altoVisible(c.archivo) >= mejor * 0.95)!;
}

/** Monocromo de un logo SVG (blanco para fondos oscuros, tinta para claros). Un PNG no se puede recolorear: null. */
export function monocromoDe(src: string, claro: boolean): string | null {
  const svg = dataUrlASvg(src);
  return svg ? svgADataUrl(recolorearSvg(svg, claro ? "#ffffff" : "#1a1a1a")) : null;
}

/** Rectángulo visible de una imagen con object-fit: contain dentro de su caja (centrada). */
export function cajaVisible(caja: { x: number; y: number; w: number; h: number }, aspecto: number): { x: number; y: number; w: number; h: number } {
  const w = Math.min(caja.w, caja.h * aspecto);
  const h = w / aspecto;
  return { x: caja.x + (caja.w - w) / 2, y: caja.y + (caja.h - h) / 2, w, h };
}
