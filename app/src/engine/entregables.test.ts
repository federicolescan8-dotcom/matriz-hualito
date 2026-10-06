import { describe, expect, it } from "vitest";
import { briefLogo, coloresDeMarca, paletaASE, paletaCSS, paletaJSON } from "./entregables";
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
