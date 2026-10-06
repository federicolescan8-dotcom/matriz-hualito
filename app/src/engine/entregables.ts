// Entregables de la identidad (E4): lo que se le da al diseñador o al desarrollador de la marca. Funciones puras: el
// navegador solo las descarga como archivo.

import { hslToHex, hslToRgb, type HSL } from "./color";
import type { Identidad } from "./identidad";
import type { Marca } from "./diagnostico";
import { AREA_SEGURIDAD, LOGO_MIN_PX, VERSIONES_LOGO } from "./logo";
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
