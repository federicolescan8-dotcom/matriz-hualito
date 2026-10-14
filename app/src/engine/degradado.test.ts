// Degradado de marca (cap. 6b, E16): geometría medida en los diseños de referencia y contraste bajo cada caja.
import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion } from "./checklist";
import { contraste, distanciaColor, hexToHsl, oklch, type HSL } from "./color";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import {
  colorClaroDegradado,
  colorEnDegradado,
  coloresModo,
  DEGRADADO_DELTA_L,
  fondosBajoCaja,
  geometriaDegradado,
  mezclaDegradado,
  posicionDegradado,
  tocaZonaClara,
} from "./palette";
import { degradadoActivo, piezaNueva, type Pieza } from "./pieza";
import { pesoH1 } from "./typography";

const W = 1080;
const H = 1350;
const base = hexToHsl("#00685a", true)!;

describe("geometría del degradado", () => {
  it("diagonal: la esquina clara es el comienzo y las otras dos esquinas quedan a mitad de recorrido (como CSS)", () => {
    const g = geometriaDegradado({ forma: "diagonal", esquina: "arriba-derecha" }, W, H);
    expect(posicionDegradado(g, W, 0)).toBeCloseTo(0, 6);
    expect(posicionDegradado(g, 0, 0)).toBeCloseTo(0.5, 6);
    expect(posicionDegradado(g, W, H)).toBeCloseTo(0.5, 6);
    expect(posicionDegradado(g, 0, H)).toBeCloseTo(1, 6);
    const ab = geometriaDegradado({ forma: "diagonal", esquina: "abajo-derecha" }, W, H);
    expect(posicionDegradado(ab, W, H)).toBeCloseTo(0, 6);
    expect(posicionDegradado(ab, 0, 0)).toBeCloseTo(1, 6);
  });

  it("diagonal: el claro se funde con la base en el 60% del eje", () => {
    const g = geometriaDegradado({ forma: "diagonal" }, W, H);
    expect(mezclaDegradado(g, 0)).toBe(1);
    expect(mezclaDegradado(g, 0.6)).toBe(0);
    expect(mezclaDegradado(g, 0.9)).toBe(0);
    // Diseño 1: a mitad de recorrido (la esquina de arriba a la izquierda) apenas aclara.
    expect(mezclaDegradado(g, 0.5)).toBeGreaterThan(0.05);
    expect(mezclaDegradado(g, 0.5)).toBeLessThan(0.2);
  });

  it("vertical: liso hasta la mitad del alto y el claro entero en el borde inferior", () => {
    const g = geometriaDegradado({ forma: "vertical" }, W, H);
    for (const y of [0, 300, H / 2]) expect(mezclaDegradado(g, posicionDegradado(g, 500, y))).toBe(0);
    expect(mezclaDegradado(g, posicionDegradado(g, 500, H))).toBe(1);
  });

  it("radial: ~57% del claro en el centro y nada a partir de 0,42 del ancho", () => {
    const g = geometriaDegradado({ forma: "radial", centro: { x: 0.5, y: 0.55 } }, W, H);
    expect(mezclaDegradado(g, posicionDegradado(g, 540, 0.55 * H))).toBeCloseTo(0.57, 6);
    expect(mezclaDegradado(g, posicionDegradado(g, 540 + 0.42 * W + 1, 0.55 * H))).toBe(0);
    expect(mezclaDegradado(g, posicionDegradado(g, 0, 0))).toBe(0);
  });
});

describe("color del degradado", () => {
  it("Modo B: el claro es el mismo matiz con +0,21 de luminosidad y reproduce la referencia (#09ae9d)", () => {
    const claro = colorClaroDegradado(base, "B");
    const [L0, , h0] = oklch(base);
    const [L1, , h1] = oklch(claro);
    expect(L1 - L0).toBeCloseTo(DEGRADADO_DELTA_L, 2);
    expect(Math.abs(h1 - h0)).toBeLessThan(2);
    expect(distanciaColor(claro, hexToHsl("#09ae9d", true)!)).toBeLessThan(4); // ΔE ~3: ruido del JPEG de la referencia
  });

  it("Modo A: oscurece con la misma magnitud", () => {
    const neutro = hexToHsl("#e4f1ea", true)!;
    expect(oklch(neutro)[0] - oklch(colorClaroDegradado(neutro, "A"))[0]).toBeCloseTo(DEGRADADO_DELTA_L, 2);
  });

  it("fuera de la zona del degradado el color es el fondo", () => {
    const g = geometriaDegradado({ forma: "diagonal" }, W, H);
    const c = colorEnDegradado(base, colorClaroDegradado(base, "B"), g, 0, H);
    expect(distanciaColor(c, base)).toBeLessThan(0.5);
  });
});

describe("fondos bajo cada caja y zona clara", () => {
  const g = geometriaDegradado({ forma: "diagonal", esquina: "arriba-derecha" }, W, H);
  const claro = colorClaroDegradado(base, "B");
  const texto: HSL = hexToHsl("#e6f0ec", true)!;
  const peor = (k: { x: number; y: number; w: number; h: number }) => Math.min(...fondosBajoCaja(base, claro, g, k).map((b) => contraste(texto, b)));

  it("una caja lejos de la esquina clara se mide contra el fondo liso", () => {
    expect(peor({ x: 110, y: 1000, w: 300, h: 50 })).toBeCloseTo(contraste(texto, base), 1);
  });

  it("una caja que llega a la esquina clara toma el peor píxel: el claro", () => {
    const k = { x: 800, y: 0, w: 280, h: 60 };
    expect(peor(k)).toBeLessThan(3);
    expect(peor(k)).toBeCloseTo(contraste(texto, claro), 1);
    expect(tocaZonaClara(g, k)).toBe(true);
  });

  it("un renglón ancho que cruza una parada intermedia no la saltea", () => {
    // Las esquinas de la caja caen a ambos lados de la parada del 30%: el rango tiene que incluir su mezcla.
    const k = { x: 100, y: 380, w: 900, h: 80 };
    const [t0, t1] = [posicionDegradado(g, 1000, 380), posicionDegradado(g, 100, 460)];
    expect(t0).toBeLessThan(0.3);
    expect(t1).toBeGreaterThan(0.3);
    expect(tocaZonaClara(g, k)).toBe(mezclaDegradado(g, t0) >= 0.5);
  });

  it("fuera de la zona clara no salta", () => {
    expect(tocaZonaClara(g, { x: 110, y: 700, w: 400, h: 50 })).toBe(false);
  });
});

describe("degradado en el checklist", () => {
  const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
  const marca = construirMarca(d, generarChips(d)[0]);
  const pieza = (p: Partial<Pieza> = {}): Pieza => ({
    ...piezaNueva(marca),
    variante: "1",
    modo: "B",
    contenido: { h1: "Tu contabilidad, en orden", body: "Asesoramiento para pymes.", cta: "Agendá una consulta" },
    ...p,
  });
  const medicion = (m: Partial<Medicion> = {}): Medicion => ({
    h1: { lineas: [{ x: 119, y: 420, w: 700, h: 110 }, { x: 119, y: 530, w: 400, h: 110 }], px: 100, peso: pesoH1("Tu contabilidad, en orden", marca.identidad.tipografia.familia_variable), italica: false },
    body: { lineas: [{ x: 119, y: 680, w: 650, h: 44 }], px: 32, peso: 400, italica: false },
    cta: { lineas: [], caja: { x: 119, y: 1100, w: 380, h: 90 }, px: 34, peso: 600, italica: false },
    logo: { x: 119, y: 149, w: 300, h: 110 },
    forma: null,
    desborde: false,
    ...m,
  });
  const resumen = (p: Pieza, m = medicion()) => evaluarPieza(marca, p, m).controles.map((c) => [c.control, c.ok, c.detalle]);

  it("sin degradado (null o ausente) el checklist da exactamente lo mismo que antes", () => {
    expect(resumen(pieza({ degradado: null }))).toEqual(resumen(pieza()));
    expect(resumen(pieza()).some(([c]) => String(c).includes("degradado"))).toBe(false);
  });

  it("con un degradado vertical y el texto arriba, el contraste es el del fondo liso y no hay aviso de zona clara", () => {
    const r = evaluarPieza(marca, pieza({ degradado: { forma: "vertical" } }), medicion({ cta: null }));
    const h1 = r.controles.find((c) => c.control === "H1 grande sobre su fondo")!;
    const liso = evaluarPieza(marca, pieza(), medicion({ cta: null })).controles.find((c) => c.control === "H1 grande sobre su fondo")!;
    expect(h1.detalle).toBe(liso.detalle);
    expect(r.controles.find((c) => c.control === "Texto fuera de la zona clara del degradado")!.ok).toBe(true);
  });

  it("un body en la esquina clara da aviso de zona clara y baja su contraste medido", () => {
    const body = { lineas: [{ x: 600, y: 140, w: 400, h: 44 }], px: 32, peso: 400, italica: false };
    const con = evaluarPieza(marca, pieza({ degradado: { forma: "diagonal" } }), medicion({ body }));
    const sin = evaluarPieza(marca, pieza(), medicion({ body }));
    const zona = con.controles.find((c) => c.control === "Texto fuera de la zona clara del degradado")!;
    expect(zona.ok).toBe(false);
    expect(zona.nivel).toBe("aviso");
    expect(zona.detalle).toContain("body");
    const ratio = (r: typeof con) => parseFloat(r.controles.find((c) => c.control === "Body sobre su fondo")!.detalle);
    expect(ratio(con)).toBeLessThan(ratio(sin));
  });

  it("el CTA se mide contra el degradado bajo su caja", () => {
    const r = evaluarPieza(marca, pieza({ degradado: { forma: "vertical" } }), medicion());
    expect(r.controles.some((c) => c.control === "CTA sobre el degradado")).toBe(true);
  });

  it("el logo sobre el fondo se mide contra el peor color del degradado bajo su caja", () => {
    const c = coloresModo(marca.identidad.paleta, "B");
    const blanco: HSL = { H: 0, S: 0, L: 100 };
    const logo = { x: 780, y: 140, w: 280, h: 100 };
    const ctl = (p: Pieza) =>
      evaluarPieza(marca, p, medicion({ logo, logoImagen: true, logoColor: blanco, logoFondo: c.fondo })).controles.find((k) => k.control === "Logo contrasta con su fondo")!;
    expect(parseFloat(ctl(pieza({ degradado: { forma: "diagonal" } })).detalle)).toBeLessThan(parseFloat(ctl(pieza()).detalle));
  });

  it("en la variante F con foto la foto tapa el fondo: el degradado no cuenta", () => {
    const conFotos = { ...marca, identidad: { ...marca.identidad, fotos_habilitadas: true } };
    expect(degradadoActivo(conFotos, pieza({ variante: "F", foto_fondo: "data:image/png;base64,x", degradado: { forma: "vertical" } }))).toBeNull();
    expect(degradadoActivo(conFotos, pieza({ variante: "F", degradado: { forma: "vertical" } }))).not.toBeNull();
  });
});
