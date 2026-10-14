// Variante 6 · Producto (cap. 6b, E16): escenario medido, alineación propia, resplandor, respaldo y círculo en el checklist.
import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { FORMATOS } from "./formatos";
import { alineacionesPermitidas, degradadoActivo, geometriaEscenario, piezaNueva, piezasDeGrilla, type Pieza } from "./pieza";
import { coloresModo } from "./palette";
import { capaSujeto } from "./sujeto";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);
const pieza = (x: Partial<Pieza> = {}): Pieza => ({
  ...piezaNueva(marca),
  variante: "6",
  modo: "B",
  alineacion: "centrado",
  contenido: { h1: "25% OFF", body: null, cta: "Pedir ahora" },
  ...x,
});
const medicion = (m: Partial<Medicion> = {}): Medicion => ({
  h1: { lineas: [{ x: 211, y: 373, w: 670, h: 119 }], px: 160, peso: pesoH1("25% OFF", marca.identidad.tipografia.familia_variable), italica: false },
  body: null,
  cta: { lineas: [], caja: { x: 357, y: 1058, w: 366, h: 90 }, px: 34, peso: 600, italica: false },
  logo: { x: 430, y: 201, w: 226, h: 63 },
  forma: null,
  desborde: false,
  ...m,
});

describe("escenario de la variante 6", () => {
  it("en 4:5 reproduce los diseños: círculo de 0,39 del ancho sin body y 0,28 con body", () => {
    const sin = geometriaEscenario("4:5", false);
    const con = geometriaEscenario("4:5", true);
    expect(sin.diametro / 1080).toBeCloseTo(0.39, 3);
    expect(con.diametro / 1080).toBeCloseTo(0.28, 3);
    expect(sin.anchoSujeto / 1080).toBeCloseTo(0.7, 3);
    expect(con.anchoSujeto / 1080).toBeCloseTo(0.51, 3);
  });

  it("en 1:1 se achica con la zona segura y en 9:16 crece hasta ×1,175", () => {
    expect(geometriaEscenario("1:1", false).diametro).toBeLessThan(geometriaEscenario("4:5", false).diametro);
    expect(geometriaEscenario("9:16", false).diametro / geometriaEscenario("4:5", false).diametro).toBeCloseTo(1.175, 3);
  });

  it("nunca pasa el ancho útil del formato", () => {
    for (const fmt of ["4:5", "1:1", "9:16"] as const) {
      const f = FORMATOS[fmt];
      expect(geometriaEscenario(fmt, false).anchoSujeto).toBeLessThanOrEqual(f.ancho * (1 - 2 * f.zona.x) + 0.5);
    }
  });
});

describe("reglas propias de la 6", () => {
  it("va centrada, sin importar el rubro", () => {
    expect(alineacionesPermitidas("tech", "6")).toEqual(["centrado"]);
    expect(alineacionesPermitidas("tech", "1")).toEqual(["izquierda"]);
  });

  it("su fondo por defecto es el resplandor radial detrás del círculo (en 1200×630, a la derecha)", () => {
    expect(degradadoActivo(marca, pieza())).toEqual({ forma: "radial", centro: { x: 0.5, y: 0.547 } });
    expect(degradadoActivo(marca, pieza({ contenido: { h1: "25% OFF", body: "x", cta: null } }))?.centro?.y).toBe(0.497);
    expect(degradadoActivo(marca, pieza({ formato: "1200x630" }))!.centro!.x).toBeGreaterThan(0.6);
  });

  it("sin producto, en el círculo va el ícono del rubro (estado sin sujeto)", () => {
    expect(capaSujeto(marca, pieza()).tipo).toBe("icono");
  });

  it("entra en la grilla de la presentación (paso 6)", () => {
    expect(piezasDeGrilla(marca, { h1: "Hola", body: "x", cta: "y" }, 20).some((p) => p.variante === "6")).toBe(true);
  });
});

describe("círculo en el checklist", () => {
  const apoyo = coloresModo(marca.identidad.paleta, "B").apoyo;
  const circulo = { cx: 540, cy: 739, r: 210, color: apoyo };

  it("con la Cifra arriba del círculo, el contraste es el del fondo", () => {
    const con = evaluarPieza(marca, pieza({ degradado: null }), medicion({ circulo })).controles.find((c) => c.control === "H1 grande sobre su fondo")!;
    const sin = evaluarPieza(marca, pieza({ degradado: null }), medicion()).controles.find((c) => c.control === "H1 grande sobre su fondo")!;
    expect(con.detalle).toBe(sin.detalle);
  });

  it("un texto que pisa el círculo se mide también contra su color", () => {
    const body = { lineas: [{ x: 400, y: 720, w: 280, h: 40 }], px: 32, peso: 400, italica: false };
    const con = evaluarPieza(marca, pieza({ degradado: null }), medicion({ circulo, body })).controles.find((c) => c.control === "Body sobre su fondo")!;
    const sin = evaluarPieza(marca, pieza({ degradado: null }), medicion({ body })).controles.find((c) => c.control === "Body sobre su fondo")!;
    expect(parseFloat(con.detalle)).toBeLessThan(parseFloat(sin.detalle));
  });

  it("es decoración protagonista: no va con la palabra gigante", () => {
    const palabra = { caja: { x: 0, y: 1200, w: 1080, h: 100 }, color: apoyo };
    const c = evaluarPieza(marca, pieza({ degradado: null }), medicion({ circulo, palabra })).controles.find((k) => k.control === "Una sola decoración protagonista")!;
    expect(c.ok).toBe(false);
    expect(c.detalle).toContain("círculo");
  });
});
