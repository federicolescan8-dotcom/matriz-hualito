import { describe, expect, it } from "vitest";
import { archivosKit, briefLogo, coloresDeMarca, paletaASE, paletaCSS, paletaJSON, svgDeForma, svgDePatron, textoTipografias, tokensFigma } from "./entregables";
import { svgADataUrl } from "./logo";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { hslToHex } from "./color";

const d = { ...diagnosticoVacio(), nombre: "Panadería Ñandú", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);

describe("entregables de identidad", () => {
  it("coloresDeMarca lista marca, apoyo, fondo y acento", () => {
    const nombres = coloresDeMarca(marca.identidad).map((c) => c.nombre);
    expect(nombres).toEqual(expect.arrayContaining(["Marca", "Apoyo", "Fondo", "Acento"]));
  });

  it("paletaASE: firma, cantidad de bloques y primer color", () => {
    const colores = [{ nombre: "Marca", color: { H: 0, S: 100, L: 50 } }, { nombre: "Fondo", color: { H: 0, S: 0, L: 100 } }];
    const ase = paletaASE(colores);
    const v = new DataView(ase.buffer);
    expect(String.fromCharCode(...ase.slice(0, 4))).toBe("ASEF");
    expect(v.getUint16(4)).toBe(1);
    expect(v.getUint32(8)).toBe(2);
    expect(v.getUint16(12)).toBe(1); // tipo de bloque: color
    const largo = v.getUint32(14);
    expect(v.getUint16(18)).toBe("Marca".length + 1);
    // nombre UTF-16BE: "M" = 0x004D
    expect(v.getUint16(20)).toBe(0x4d);
    const modelo = 20 + ("Marca".length + 1) * 2;
    expect(String.fromCharCode(...ase.slice(modelo, modelo + 4))).toBe("RGB ");
    expect(v.getFloat32(modelo + 4)).toBeCloseTo(1, 3);
    expect(v.getFloat32(modelo + 8)).toBeCloseTo(0, 3);
    expect(v.getUint16(modelo + 16)).toBe(2);
    expect(largo).toBe(2 + ("Marca".length + 1) * 2 + 4 + 12 + 2);
    expect(ase.length).toBe(12 + 6 + largo + 6 + v.getUint32(14 + 4 + largo + 2));
  });

  it("paletaCSS usa kebab-case sin tildes y paletaJSON trae hex", () => {
    const colores = [{ nombre: "Versión Ñoña", color: { H: 200, S: 50, L: 40 } }];
    expect(paletaCSS(colores)).toContain(`--color-version-nona: ${hslToHex(colores[0].color)};`);
    expect(paletaCSS(colores)).toMatch(/^:root \{/);
    expect(JSON.parse(paletaJSON(colores))[0].hex).toBe(hslToHex(colores[0].color));
  });

  it("briefLogo nombra las versiones faltantes y los HEX", () => {
    const txt = briefLogo(marca);
    for (const v of ["Horizontal", "Vertical", "Solo símbolo", "Monograma"]) expect(txt).toContain(v);
    expect(txt).toContain("FALTA");
    expect(txt).toContain(hslToHex(marca.identidad.paleta.color_marca).toUpperCase());
    expect(txt).toContain("#FFFFFF");
    expect(txt).toContain("#1A1A1A");
    expect(txt).toContain("25%");
    expect(txt).toContain("48 px");
    const con = briefLogo({ ...marca, identidad: { ...marca.identidad, logo: { ...marca.identidad.logo, versiones: { horizontal: { src: "x", aspecto: 3 } } } } });
    expect(con).toContain("[x] **Horizontal**");
    expect(con).toContain("Faltan: Vertical");
  });
});

describe("kit de identidad (E8)", () => {
  const svgLogo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#c00"/></svg>';
  const conTodo = {
    ...marca,
    identidad: {
      ...marca.identidad,
      logo: { ...marca.identidad.logo, color: svgADataUrl(svgLogo), versiones: { simbolo: { src: svgADataUrl(svgLogo), aspecto: 1 } } },
      recursos: { formas: [{ id: "propia-1", nombre: "Hoja", categoria: "organicas" as const, d: "M10 10L90 10L50 90Z" }], patron_propio: true, detalle: null },
      tipografia: { ...marca.identidad.tipografia, propia: { nombre: "Mi Fuente", archivo: "data:font/woff2;base64,AAEC", clase: "grotesca" as const } },
    },
  };

  it("sin logos ni recursos, el kit trae paleta, tipografías, brief y LEEME", () => {
    const rutas = archivosKit(marca).map((a) => a.ruta);
    expect(rutas).toEqual(expect.arrayContaining(["paleta/paleta.ase", "paleta/paleta.json", "paleta/paleta.css", "paleta/tokens-figma.json", "tipografias/tipografias.txt", "brief-logo.md", "LEEME.txt"]));
    expect(rutas.some((r) => r.startsWith("logos/") || r.startsWith("recursos/"))).toBe(false);
  });

  it("con logo SVG, versiones, fuente y recursos propios suma sus archivos", () => {
    const archivos = archivosKit(conTodo);
    const rutas = archivos.map((a) => a.ruta);
    expect(rutas).toEqual(expect.arrayContaining(["logos/logo-color.svg", "logos/logo-color-mono-claro.svg", "logos/logo-color-mono-oscuro.svg", "logos/versiones/simbolo.svg", "logos/versiones/simbolo-mono-claro.svg", "tipografias/mi-fuente.woff2", "recursos/propia-1.svg", "recursos/patron-propio.svg"]));
    expect(archivos.find((a) => a.ruta === "logos/logo-color-mono-claro.svg")!.contenido).toContain("#ffffff");
    expect([...(archivos.find((a) => a.ruta === "tipografias/mi-fuente.woff2")!.contenido as Uint8Array)]).toEqual([0, 1, 2]);
    expect(archivos.find((a) => a.ruta === "LEEME.txt")!.contenido).toContain("recursos/");
  });

  it("los tokens W3C llevan $type y $value en hex por color", () => {
    const t = JSON.parse(tokensFigma(marca.identidad));
    expect(t.color.marca).toEqual({ $type: "color", $value: hslToHex(marca.identidad.paleta.color_marca) });
    expect(t.color.acento.$type).toBe("color");
    expect(t.fuente.titulos.$type).toBe("fontFamily");
  });

  it("las formas son SVG con caja 0-100 y el patrón usa <pattern>", () => {
    const f = conTodo.identidad.recursos.formas[0];
    const svg = svgDeForma(f, "#112233");
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain(`d="${f.d}"`);
    expect(svg).toContain('fill="#112233"');
    expect(svgDeForma({ ...f, trazo: true }, "#112233")).toContain('stroke="#112233"');
    const patron = svgDePatron(f, "#112233");
    expect(patron).toContain("<pattern");
    expect(patron).toContain("url(#patron)");
  });

  it("tipografias.txt enlaza a Google Fonts salvo la fuente propia", () => {
    expect(textoTipografias({ ...marca.identidad, tipografia: { ...marca.identidad.tipografia, familia_variable: "Playfair Display", familia_texto: "Inter" } })).toContain("https://fonts.google.com/specimen/Playfair+Display");
    expect(textoTipografias(conTodo.identidad.tipografia.propia ? { ...conTodo.identidad, tipografia: { ...conTodo.identidad.tipografia, familia_variable: "Mi Fuente" } } : conTodo.identidad)).toContain("fuente propia");
  });
});
