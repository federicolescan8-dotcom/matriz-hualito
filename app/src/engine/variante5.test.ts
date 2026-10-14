// Variante 5 · Apilada (cap. 6b, E16): medio, degradado por defecto, sujeto a sangre, slot Cifra e intensidad automática.
import { describe, expect, it } from "vitest";
import { evaluarPieza, intensidadSegura, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { FORMATOS } from "./formatos";
import {
  degradadoActivo,
  geometriaSujetoApilada,
  medioApilada,
  piezaNueva,
  piezasDeGrilla,
  plantillaPara,
  VARIANTES_HABILITADAS,
  type Pieza,
} from "./pieza";
import { geometriaDegradado, tocaZonaClara } from "./palette";
import type { Sujeto } from "./sujeto";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);
const sujeto: Sujeto = { src: "data:image/png;base64,x", ancho: 300, alto: 100, transparente: true, damero: false, mascara: { cols: 3, filas: 1, celdas: "111" } };
const pieza = (x: Partial<Pieza> = {}): Pieza => ({
  ...piezaNueva(marca),
  variante: "5",
  modo: "B",
  contenido: { h1: "Tenemos un plan especial para vos", body: "Tu oportunidad de pagar menos llegó.", cta: "Pedir ahora" },
  ...x,
});
const medicion = (m: Partial<Medicion> = {}): Medicion => ({
  h1: { lineas: [{ x: 108, y: 380, w: 790, h: 81 }, { x: 108, y: 490, w: 815, h: 81 }], px: 104, peso: pesoH1("Tenemos un plan especial para vos", marca.identidad.tipografia.familia_variable), italica: false },
  body: { lineas: [{ x: 108, y: 617, w: 730, h: 44 }], px: 36, peso: 400, italica: false },
  cta: { lineas: [], caja: { x: 357, y: 1058, w: 366, h: 90 }, px: 34, peso: 600, italica: false },
  logo: { x: 108, y: 201, w: 226, h: 63 },
  forma: null,
  desborde: false,
  ...m,
});
const cifra = (caja = { x: 229, y: 830, w: 624, h: 111 }) => ({ lineas: [caja], px: 150, peso: 800, italica: false });

describe("medio de la variante 5", () => {
  it("sujeto con transparencia > Cifra > foto en forma > nada", () => {
    expect(medioApilada(pieza({ sujeto, contenido: { h1: "x", body: null, cta: null, cifra: "25% OFF" } }))).toBe("sujeto");
    expect(medioApilada(pieza({ contenido: { h1: "x", body: null, cta: null, cifra: "25% OFF" }, foto_forma: { src: "f" } }))).toBe("cifra");
    expect(medioApilada(pieza({ foto_forma: { src: "f" } }))).toBe("foto");
    expect(medioApilada(pieza())).toBeNull();
  });

  it("sin transparencia, el sujeto no cuenta: estado sin sujeto", () => {
    expect(medioApilada(pieza({ sujeto: { ...sujeto, transparente: false, mascara: null }, foto_forma: { src: "f" } }))).toBe("foto");
  });
});

describe("degradado por defecto", () => {
  it("la 5 lleva el diagonal; la zona clara va detrás del sujeto si hay", () => {
    expect(degradadoActivo(marca, pieza())).toEqual({ forma: "diagonal", esquina: "arriba-derecha" });
    expect(degradadoActivo(marca, pieza({ sujeto }))).toEqual({ forma: "diagonal", esquina: "abajo-derecha" });
  });

  it("null es liso a propósito y las variantes de siempre siguen lisas", () => {
    expect(degradadoActivo(marca, pieza({ degradado: null }))).toBeNull();
    expect(degradadoActivo(marca, pieza({ variante: "1" }))).toBeNull();
  });
});

describe("sujeto a sangre", () => {
  it("en vertical se pega abajo a la derecha y se sale del lienzo (diseño 3)", () => {
    const g = geometriaSujetoApilada("4:5", 2);
    expect(g.x + g.w).toBeCloseTo(1080 * 1.08, 3);
    expect(g.y + g.h).toBeCloseTo(1350 * 1.06, 3);
    expect(g.x).toBeGreaterThanOrEqual(1080 * 0.22 - 0.5);
    expect(g.w / g.h).toBeCloseTo(2, 6);
  });

  it("un sujeto alto queda limitado por el alto de su zona", () => {
    const g = geometriaSujetoApilada("4:5", 0.5);
    expect(g.h).toBeCloseTo(1350 * (1.06 - 0.585), 3);
  });

  it("en 1200×630 va contenido en la columna derecha", () => {
    const f = FORMATOS["1200x630"];
    const g = geometriaSujetoApilada("1200x630", 2);
    expect(g.x).toBeGreaterThanOrEqual(f.ancho * f.columnaMensaje!);
    expect(g.x + g.w).toBeLessThanOrEqual(f.ancho * (1 - f.zona.x) + 0.5);
    expect(g.y).toBeGreaterThanOrEqual(0);
  });
});

describe("slot Cifra", () => {
  it("la plantilla trae su tamaño y la variante 5 se ofrece en Publicaciones", () => {
    expect(plantillaPara("5", "4:5").cifra).toBe(150);
    expect(VARIANTES_HABILITADAS).toContain("5");
  });

  it("todavía no entra en la grilla de la presentación (paso 6)", () => {
    expect(piezasDeGrilla(marca, { h1: "Hola", body: "x", cta: "y" }, 20).some((p) => p.variante === "5")).toBe(false);
  });

  it("cumple contraste como el H1 y no cuenta para la jerarquía", () => {
    const r = evaluarPieza(marca, pieza({ degradado: null }), medicion({ cifra: cifra() }));
    expect(r.controles.find((c) => c.control === "Cifra sobre su fondo")!.ok).toBe(true);
    const jer = r.controles.find((c) => c.control.startsWith("Jerarquía"))!;
    expect(jer.detalle).not.toContain("150");
  });

  it("es información: si otro elemento la pisa, salta", () => {
    const r = evaluarPieza(marca, pieza({ degradado: null }), medicion({ cifra: cifra({ x: 300, y: 1050, w: 400, h: 100 }) }));
    expect(r.controles.find((c) => c.control === "Ningún texto tapado por otro elemento")!.detalle).toContain("Cifra");
  });

  it("entra en el control de la grilla 3:4 del 1:1", () => {
    const r = evaluarPieza(marca, pieza({ formato: "1:1", degradado: null }), medicion({ cifra: cifra({ x: 60, y: 600, w: 960, h: 100 }) }));
    expect(r.controles.find((c) => c.control.startsWith("Mensaje y logo enteros en la grilla"))!.detalle).toContain("Cifra");
  });

  it("en 1200×630 la Cifra de la columna derecha no cuenta como mensaje", () => {
    const m = medicion({
      h1: { ...medicion().h1, lineas: [{ x: 60, y: 120, w: 500, h: 70 }] },
      body: { lineas: [{ x: 60, y: 220, w: 400, h: 30 }], px: 24, peso: 400, italica: false },
      cta: { lineas: [], caja: { x: 60, y: 300, w: 200, h: 60 }, px: 26, peso: 600, italica: false },
      logo: { x: 60, y: 40, w: 150, h: 56 },
      cifra: cifra({ x: 700, y: 250, w: 400, h: 100 }),
    });
    const c = evaluarPieza(marca, pieza({ formato: "1200x630", canal: "link", degradado: null }), m).controles.find((k) => k.control.startsWith("Mensaje en el 50%"));
    expect(c?.ok ?? true).toBe(true);
  });
});

describe("intensidad automática del degradado", () => {
  it("con una caja de body en la esquina clara, baja la intensidad hasta no sumar avisos", () => {
    const body = { lineas: [{ x: 600, y: 60, w: 470, h: 44 }], px: 36, peso: 400, italica: false };
    const m = medicion({ body });
    const k = intensidadSegura(marca, pieza(), m);
    expect(k).toBeLessThan(1);
    const fallan = (x: number) => evaluarPieza(marca, pieza(), { ...m, intensidadDegradado: x }).controles.filter((c) => !c.ok).map((c) => c.control);
    expect(fallan(k)).toEqual(fallan(0));
  });

  it("sin texto cerca de la zona clara queda en 1 (el degradado de la referencia)", () => {
    const m = medicion({ h1: { ...medicion().h1, lineas: [{ x: 108, y: 700, w: 300, h: 80 }] }, body: null, cta: null });
    expect(intensidadSegura(marca, pieza(), m)).toBe(1);
  });

  it("sin degradado no hay nada que ajustar", () => {
    expect(intensidadSegura(marca, pieza({ degradado: null }), medicion())).toBe(1);
  });

  it("con la intensidad bajada, la zona clara se achica", () => {
    const g = geometriaDegradado({ forma: "diagonal" }, 1080, 1350);
    const k = { x: 700, y: 100, w: 300, h: 60 };
    expect(tocaZonaClara(g, k, 1)).toBe(true);
    expect(tocaZonaClara(g, k, 0.3)).toBe(false);
  });
});
