// Variante 7 · Cifra (cap. 6b, E16): alineación propia, fondo vertical por defecto y reglas que ya rigen sobre la Cifra.
import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { alineacionesPermitidas, degradadoActivo, piezaNueva, piezasDeGrilla, plantillaPara, VARIANTES_E16, type Pieza } from "./pieza";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);
const pieza = (x: Partial<Pieza> = {}): Pieza => ({
  ...piezaNueva(marca),
  variante: "7",
  modo: "B",
  alineacion: "centrado",
  contenido: { h1: "Tenemos un plan especial para vos", body: "Tu oportunidad de pagar menos llegó.", cta: "Pedir ahora", cifra: "25% OFF" },
  ...x,
});
const medicion = (m: Partial<Medicion> = {}): Medicion => ({
  h1: { lineas: [{ x: 146, y: 386, w: 785, h: 81 }, { x: 133, y: 496, w: 813, h: 81 }], px: 104, peso: pesoH1("Tenemos un plan especial para vos", marca.identidad.tipografia.familia_variable), italica: false },
  body: { lineas: [{ x: 180, y: 839, w: 728, h: 44 }, { x: 488, y: 903, w: 105, h: 44 }], px: 36, peso: 400, italica: false },
  cta: { lineas: [], caja: { x: 357, y: 1053, w: 366, h: 90 }, px: 34, peso: 600, italica: false },
  logo: { x: 430, y: 207, w: 226, h: 63 },
  cifra: { lineas: [{ x: 229, y: 649, w: 624, h: 111 }], px: 150, peso: 800, italica: false },
  forma: null,
  desborde: false,
  ...m,
});

describe("variante 7 · Cifra", () => {
  it("es una de las variantes nuevas, centrada sin importar el rubro, con Cifra en su plantilla", () => {
    expect(VARIANTES_E16).toEqual(["5", "6", "7"]);
    expect(alineacionesPermitidas("tech", "7")).toEqual(["centrado"]);
    expect(plantillaPara("7", "4:5").cifra).toBe(150);
    expect(plantillaPara("7", "1:1").h1.maxLineas).toBe(2);
  });

  it("su fondo por defecto es el vertical (diseño 6) y null sigue siendo liso", () => {
    expect(degradadoActivo(marca, pieza())).toEqual({ forma: "vertical" });
    expect(degradadoActivo(marca, pieza({ degradado: null }))).toBeNull();
  });

  it("las medidas del diseño 6 pasan el checklist con fondo liso", () => {
    const r = evaluarPieza(marca, pieza({ degradado: null }), medicion());
    expect(r.controles.filter((c) => !c.ok).map((c) => c.control)).toEqual([]);
  });

  it("body centrado: hasta 4 líneas (regla existente del cap. 6)", () => {
    const linea = { x: 180, y: 839, w: 700, h: 44 };
    const body = { lineas: [0, 1, 2, 3, 4].map((i) => ({ ...linea, y: 800 + i * 50 })), px: 30, peso: 400, italica: false };
    const c = evaluarPieza(marca, pieza({ degradado: null }), medicion({ body, cta: null })).controles.find((k) => k.control.startsWith("Body centrado"))!;
    expect(c.ok).toBe(false);
  });

  it("todavía no entra en la grilla de la presentación (paso 6)", () => {
    expect(piezasDeGrilla(marca, { h1: "Hola", body: "x", cta: "y" }, 20).some((p) => p.variante === "7")).toBe(false);
  });
});
