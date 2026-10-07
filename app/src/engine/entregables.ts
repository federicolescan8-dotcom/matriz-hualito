// Entregables de la identidad (E4 y E8): lo que se le da al diseñador o al desarrollador de la marca, y el kit en ZIP.
// Funciones puras: el navegador solo las descarga como archivo.

import { hslToHex, hslToRgb, type HSL } from "./color";
import type { Identidad } from "./identidad";
import type { Marca } from "./diagnostico";
import { AREA_SEGURIDAD, LOGO_MIN_PX, VERSIONES_LOGO, dataUrlASvg, monocromoDe } from "./logo";
import type { Forma } from "./biblioteca";
import { FACTOR_STORY } from "./typography";

export interface ColorNombrado {
  nombre: string;
  color: HSL;
}

/** Los colores de la marca, con nombre: marca, versión funcional, apoyo, fondo, acento, secundarios y neutro oscuro. */
export function coloresDeMarca(identidad: Identidad): ColorNombrado[] {
  const p = identidad.paleta;
  const lista: ColorNombrado[] = [{ nombre: "Marca", color: p.color_marca }];
  if (p.version_funcional) lista.push({ nombre: "Marca funcional", color: p.version_funcional });
  lista.push({ nombre: "Apoyo", color: p.tono_apoyo }, { nombre: "Fondo", color: p.fondo_neutro }, { nombre: "Acento", color: p.acento });
  const ext = identidad.paleta_extendida;
  if (ext) {
    ext.secundarios.forEach((s, i) => lista.push({ nombre: `Secundario ${i + 1}`, color: s.color }));
    lista.push({ nombre: "Neutro oscuro", color: ext.neutro_oscuro });
  }
  return lista;
}

const f32 = (v: number) => {
  const b = new ArrayBuffer(4);
  new DataView(b).setFloat32(0, v, false);
  return [...new Uint8Array(b)];
};
const u16 = (v: number) => [(v >> 8) & 255, v & 255];
const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];

/** Paleta en Adobe Swatch Exchange (.ase): se abre en Illustrator, Photoshop e InDesign. Todo en big-endian. */
export function paletaASE(colores: ColorNombrado[]): Uint8Array {
  const bytes: number[] = [...[..."ASEF"].map((c) => c.charCodeAt(0)), ...u16(1), ...u16(0), ...u32(colores.length)];
  for (const { nombre, color } of colores) {
    const nombreU16 = [...nombre].flatMap((ch) => u16(ch.charCodeAt(0)));
    const caracteres = [...nombre].length + 1; // incluye el 0 final
    const [r, g, b] = hslToRgb(color);
    const cuerpo = [
      ...u16(caracteres),
      ...nombreU16,
      0,
      0,
      ...[..."RGB "].map((c) => c.charCodeAt(0)),
      ...f32(r / 255),
      ...f32(g / 255),
      ...f32(b / 255),
      ...u16(2), // tipo de color: normal
    ];
    bytes.push(...u16(1), ...u32(cuerpo.length), ...cuerpo);
  }
  return new Uint8Array(bytes);
}

/** Nombre en kebab-case sin tildes: "Marca funcional" → "marca-funcional". */
function kebab(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function paletaCSS(colores: ColorNombrado[]): string {
  return `:root {\n${colores.map((c) => `  --color-${kebab(c.nombre)}: ${hslToHex(c.color)};`).join("\n")}\n}\n`;
}

export function paletaJSON(colores: ColorNombrado[]): string {
  return JSON.stringify(
    // HSL redondeado a dos decimales: sin ruido de punto flotante en el archivo que se entrega.
    colores.map((c) => ({ nombre: c.nombre, hex: hslToHex(c.color), hsl: { H: redondear(c.color.H), S: redondear(c.color.S), L: redondear(c.color.L) } })),
    null,
    2,
  );
}

/** Brief en Markdown para pedirle al diseñador las versiones del logo. */
export function briefLogo(marca: Marca): string {
  const logo = marca.identidad.logo;
  const colores = coloresDeMarca(marca.identidad);
  const pct = Math.round(AREA_SEGURIDAD * 100);
  const lineasVersiones = VERSIONES_LOGO.map((v) => {
    const cargada = !!logo.versiones?.[v.id];
    return `- [${cargada ? "x" : " "}] **${v.nombre}** (${v.uso}): ${cargada ? "ya cargada" : "FALTA"}`;
  });
  const faltan = VERSIONES_LOGO.filter((v) => !logo.versiones?.[v.id]).map((v) => v.nombre);
  const lineasColores = colores.map((c) => {
    const [r, g, b] = hslToRgb(c.color);
    return `- ${c.nombre}: ${hslToHex(c.color).toUpperCase()} (RGB ${r}, ${g}, ${b})`;
  });
  return [
    `# Brief de logo: ${marca.nombre}`,
    "",
    "Necesitamos las versiones del logo para usarlas en las publicaciones. Las versiones las hace el diseñador; la herramienta las recibe y controla que se respeten estas reglas.",
    "",
    "## Versiones a entregar",
    ...lineasVersiones,
    "",
    faltan.length ? `Faltan: ${faltan.join(", ")}.` : "Están todas las versiones.",
    "",
    "## Colores exactos",
    ...lineasColores,
    "",
    "## Monocromos",
    "- Monocromo claro, para fondos oscuros o de color: **#FFFFFF**.",
    "- Monocromo oscuro, para fondos claros: **#1A1A1A**.",
    "",
    "## Área de seguridad y tamaño mínimo",
    `- Área de seguridad: ${pct}% del alto del logo libre por cada lado. Ningún texto ni elemento entra ahí.`,
    `- Tamaño mínimo: ${LOGO_MIN_PX} px de alto en feed; en story, ${Math.round(LOGO_MIN_PX * FACTOR_STORY)} px.`,
    "",
    "## Formato de entrega",
    "- SVG con los trazos convertidos a contornos y fondo transparente. Sin tipografías sin convertir, sin imágenes incrustadas.",
    "- Ajustar el lienzo al logo, sin márgenes de aire alrededor.",
    "- Si no hay SVG, PNG con fondo transparente de al menos 1000 px de lado mayor.",
    "",
    "## Uso sobre foto",
    "- Por defecto, monocromo claro con contraste suficiente sobre el overlay de la marca.",
    "- Alternativas: sobre una placa de color neutro con aire alrededor, o monocromo claro con sombra suave.",
    "",
  ].join("\n");
}

const redondear = (v: number) => Math.round(v * 100) / 100;

// ── Kit de identidad (E8) ──

export interface ArchivoKit {
  ruta: string;
  contenido: string | Uint8Array;
}

/** Tokens de diseño en el formato del W3C (Design Tokens): Figma los importa con sus plugins de tokens. */
export function tokensFigma(identidad: Identidad): string {
  const colores: Record<string, { $type: "color"; $value: string }> = {};
  for (const c of coloresDeMarca(identidad)) colores[kebab(c.nombre)] = { $type: "color", $value: hslToHex(c.color) };
  const t = identidad.tipografia;
  return JSON.stringify(
    {
      color: colores,
      fuente: {
        titulos: { $type: "fontFamily", $value: t.familia_variable },
        texto: { $type: "fontFamily", $value: familiaDelTexto(t) },
      },
    },
    null,
    2,
  );
}

const familiaDelTexto = (t: Identidad["tipografia"]) => t.familia_texto ?? t.familia_variable;

const pinturaForma = (forma: Forma, color: string) =>
  forma.trazo
    ? `fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`
    : `fill="${color}"${forma.evenodd ? ' fill-rule="evenodd"' : ""}`;

/** SVG de una forma propia: caja 0-100, con el color de marca. Las lineales van con trazo; el resto, con relleno. */
export function svgDeForma(forma: Forma, color: string): string {
  const pintura = pinturaForma(forma, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">\n  <path d="${forma.d}" ${pintura}/>\n</svg>\n`;
}

/** SVG del patrón propio: la forma repetida en un `<pattern>`, listo para usar de fondo. */
export function svgDePatron(forma: Forma, color: string, fondo?: string): string {
  const pintura = pinturaForma(forma, color);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">`,
    "  <defs>",
    `    <pattern id="patron" width="80" height="80" patternUnits="userSpaceOnUse">`,
    `      <path transform="translate(16 16) scale(0.48)" d="${forma.d}" ${pintura}/>`,
    "    </pattern>",
    "  </defs>",
    ...(fondo ? [`  <rect width="400" height="400" fill="${fondo}"/>`] : []),
    `  <rect width="400" height="400" fill="url(#patron)"/>`,
    "</svg>",
    "",
  ].join("\n");
}

/** Decodifica un data URL a bytes y extensión de archivo. */
export function decodificarDataUrl(dataUrl: string): { bytes: Uint8Array; ext: string; mime: string } | null {
  const m = /^data:([^;,]+)((?:;[^;,]+)*?)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const texto = m[3] ? atob(m[4]) : decodeURIComponent(m[4]);
  const bytes = Uint8Array.from(texto, (c) => c.charCodeAt(0) & 255);
  const ext = mime === "image/svg+xml" ? "svg" : (mime.split("/")[1] ?? "bin").replace("jpeg", "jpg").replace(/^x-/, "");
  return { bytes: m[3] ? bytes : new TextEncoder().encode(texto), ext, mime };
}

/** Enlace de Google Fonts de una familia. */
export const enlaceGoogleFonts = (familia: string) => `https://fonts.google.com/specimen/${encodeURIComponent(familia).replaceAll("%20", "+")}`;

/** Texto con las tipografías de la marca: enlaces a Google Fonts y, si hay, aviso de la fuente propia incluida. */
export function textoTipografias(identidad: Identidad): string {
  const t = identidad.tipografia;
  const propia = t.propia?.nombre;
  const linea = (rol: string, familia: string) =>
    familia === propia ? `${rol}: ${familia} (fuente propia de la marca, incluida en esta carpeta)` : `${rol}: ${familia}\n  ${enlaceGoogleFonts(familia)}`;
  const texto = familiaDelTexto(t);
  return [
    "Tipografías de la marca",
    "",
    linea("Títulos", t.familia_variable),
    ...(texto !== t.familia_variable ? [linea("Texto", texto)] : [`Texto: ${texto} (la misma que los títulos)`]),
    "",
    "Las familias de Google Fonts se descargan gratis desde el enlace.",
    "",
  ].join("\n");
}

/**
 * Archivos del kit de la marca, con la identidad que se le pasa (la aprobada, si hay: `marcaParaPublicar`). Los PNG de
 * logos SVG no están acá: los genera el navegador con canvas (lib/kit.ts), porque necesitan dibujar.
 */
export function archivosKit(marca: Marca): ArchivoKit[] {
  const id = marca.identidad;
  const archivos: ArchivoKit[] = [];

  // Logos: lo cargado, tal cual, y los monocromos derivados de cada SVG.
  const agregarLogo = (ruta: string, src: string | null | undefined, mono = true) => {
    if (!src) return;
    const d = decodificarDataUrl(src);
    if (!d) return;
    archivos.push({ ruta: `logos/${ruta}.${d.ext}`, contenido: d.bytes });
    if (!mono) return;
    for (const [claro, sufijo] of [[true, "mono-claro"], [false, "mono-oscuro"]] as const) {
      const m = monocromoDe(src, claro);
      const svg = m && dataUrlASvg(m);
      if (svg) archivos.push({ ruta: `logos/${ruta}-${sufijo}.svg`, contenido: svg });
    }
  };
  agregarLogo("logo-color", id.logo.color);
  agregarLogo("logo-mono-claro", id.logo.mono_claro, false);
  agregarLogo("logo-mono-oscuro", id.logo.mono_oscuro, false);
  for (const v of VERSIONES_LOGO) agregarLogo(`versiones/${v.id}`, id.logo.versiones?.[v.id]?.src);

  const colores = coloresDeMarca(id);
  archivos.push(
    { ruta: "paleta/paleta.ase", contenido: paletaASE(colores) },
    { ruta: "paleta/paleta.json", contenido: paletaJSON(colores) },
    { ruta: "paleta/paleta.css", contenido: paletaCSS(colores) },
    { ruta: "paleta/tokens-figma.json", contenido: tokensFigma(id) },
    { ruta: "tipografias/tipografias.txt", contenido: textoTipografias(id) },
  );
  if (id.tipografia.propia) {
    const d = decodificarDataUrl(id.tipografia.propia.archivo);
    if (d) archivos.push({ ruta: `tipografias/${kebab(id.tipografia.propia.nombre)}.${d.mime.includes("woff2") ? "woff2" : d.ext}`, contenido: d.bytes });
  }

  // Recursos propios (E2): cada forma en su SVG y el patrón propio con `<pattern>`.
  const tinta = hslToHex(id.paleta.color_marca);
  const formas = id.recursos?.formas ?? [];
  for (const f of formas) archivos.push({ ruta: `recursos/${kebab(f.id)}.svg`, contenido: svgDeForma(f, tinta) });
  if (id.recursos?.patron_propio && formas[0]) archivos.push({ ruta: "recursos/patron-propio.svg", contenido: svgDePatron(formas[0], tinta) });

  archivos.push({ ruta: "brief-logo.md", contenido: briefLogo(marca) });
  archivos.push({ ruta: "LEEME.txt", contenido: leemeKit(marca, archivos.map((a) => a.ruta)) });
  return archivos;
}

const DESCRIPCION_CARPETA: Record<string, string> = {
  logos: "logos cargados y sus versiones; los monocromos salen de los SVG",
  paleta: "paleta en ASE (Adobe), JSON, CSS y tokens para Figma (formato W3C)",
  tipografias: "enlaces a las familias y, si hay, el archivo de la fuente propia",
  recursos: "formas y patrón propios en SVG (caja 0-100)",
};

function leemeKit(marca: Marca, rutas: string[]): string {
  const carpetas = Object.keys(DESCRIPCION_CARPETA).filter((c) => rutas.some((r) => r.startsWith(`${c}/`)));
  return [
    `Kit de identidad: ${marca.nombre}`,
    "",
    ...carpetas.map((c) => `${c}/  ${DESCRIPCION_CARPETA[c]}`),
    "brief-logo.md  qué versiones del logo hay y cuáles faltan, con colores y reglas",
    "",
    "paleta/tokens-figma.json se importa en Figma con un plugin de Design Tokens (formato W3C).",
    "",
  ].join("\n");
}
