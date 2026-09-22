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
