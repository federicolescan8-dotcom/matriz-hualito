// Recursos de composición (cap. 6b, E16): insignia, foto en forma y palabra gigante. Un test por regla del manual.
import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion, type Rect } from "./checklist";
import { contraste, oklch, type HSL } from "./color";
import { coloresInsignia, colorPalabraGigante, DELTA_L_PALABRA, geometriaFotoEnForma, PROPORCION_FOTO_FORMA } from "./composicion";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { coloresModo, MIN_TEXTO } from "./palette";
import { piezaNueva, type Pieza } from "./pieza";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);
const p = marca.identidad.paleta;
const pieza = (x: Partial<Pieza> = {}): Pieza => ({
  ...piezaNueva(marca),
  variante: "1",
  modo: "A",
  contenido: { h1: "Tu contabilidad, en orden", body: "Asesoramiento para pymes.", cta: "Agendá una consulta" },
  ...x,
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
const ctl = (m: Partial<Medicion>, nombre: string, x: Partial<Pieza> = {}) =>
  evaluarPieza(marca, pieza(x), medicion(m)).controles.find((c) => c.control.startsWith(nombre));

const { relleno, texto } = coloresInsignia(p, "A");
const insignia = (k: Partial<{ caja: Rect; px: number; texto: HSL; relleno: HSL }> = {}) => ({
  caja: { x: 600, y: 200, w: 260, h: 60 },
  px: 28,
  texto,
  relleno,
  ...k,
});

describe("insignia", () => {
  it("sin insignia no corre ningún control de insignia (las piezas de antes no cambian)", () => {
    expect(evaluarPieza(marca, pieza(), medicion()).controles.some((c) => /nsignia/.test(c.control))).toBe(false);
  });

  it("una insignia bien puesta pasa todo", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ insignias: [insignia()] }));
    expect(r.controles.filter((c) => /nsignia/.test(c.control) && !c.ok).map((c) => [c.control, c.detalle])).toEqual([]);
  });

  it("máximo 1 por pieza", () => {
    const c = ctl({ insignias: [insignia(), insignia({ caja: { x: 600, y: 300, w: 200, h: 60 } })] }, "Una insignia por pieza")!;
    expect(c.ok).toBe(false);
  });

  it("su texto no baja del mínimo del body (24 px en feed)", () => {
    expect(ctl({ insignias: [insignia({ px: 20 })] }, "Texto de la insignia de")!.ok).toBe(false);
    expect(ctl({ insignias: [insignia({ px: 24 })] }, "Texto de la insignia de")!.ok).toBe(true);
  });

  it("los colores por defecto cumplen en los dos modos: 4,5:1 el texto y 3:1 el relleno contra el fondo", () => {
    for (const modo of ["A", "B"] as const) {
      const k = coloresInsignia(p, modo);
      expect(contraste(k.relleno, k.texto)).toBeGreaterThanOrEqual(MIN_TEXTO);
      expect(contraste(k.relleno, coloresModo(p, modo).fondo)).toBeGreaterThanOrEqual(3);
    }
  });

  it("texto contra su relleno: bajo 3:1 es bloqueante", () => {
    const c = ctl({ insignias: [insignia({ texto: relleno })] }, "Texto de la insignia sobre su relleno")!;
    expect(c.ok).toBe(false);
    expect(c.nivel).toBe("bloqueante");
  });

  it("relleno contra el fondo bajo ella, 3:1", () => {
    const fondo = coloresModo(p, "A").fondo;
    expect(ctl({ insignias: [insignia({ relleno: fondo, texto: { H: 0, S: 0, L: 10 } })] }, "Insignia sobre su fondo")!.ok).toBe(false);
  });

  it("no pisa el H1 ni el CTA", () => {
    expect(ctl({ insignias: [insignia({ caja: { x: 300, y: 450, w: 200, h: 60 } })] }, "Insignia sin pisar")!.ok).toBe(false);
    expect(ctl({ insignias: [insignia({ caja: { x: 300, y: 1110, w: 150, h: 60 } })] }, "Insignia sin pisar")!.ok).toBe(false);
  });

  it("va dentro de la zona segura (bloqueante)", () => {
    const c = ctl({ insignias: [insignia({ caja: { x: 950, y: 200, w: 200, h: 60 } })] }, "Insignia dentro del margen")!;
    expect(c.ok).toBe(false);
    expect(c.nivel).toBe("bloqueante");
  });
});

describe("foto en forma", () => {
  it("la geometría sale del diseño 2: 2,5:1 y radio del 1,5% del ancho", () => {
    const g = geometriaFotoEnForma("4:5", 876);
    expect(g.w / g.h).toBeCloseTo(PROPORCION_FOTO_FORMA, 6);
    expect(g.h).toBeCloseTo(350.4, 1);
    expect(g.radio).toBe(16);
  });

  it("nunca va texto encima (bloqueante); al lado pasa", () => {
    const encima = ctl({ fotoForma: { x: 108, y: 660, w: 876, h: 350 } }, "Foto en forma sin texto encima")!;
    expect(encima.ok).toBe(false);
    expect(encima.nivel).toBe("bloqueante");
    expect(encima.detalle).toContain("body");
    expect(ctl({ fotoForma: { x: 108, y: 740, w: 876, h: 340 } }, "Foto en forma sin texto encima")!.ok).toBe(true);
  });
});

describe("palabra gigante", () => {
  it("es tono sobre tono: mismo matiz, luminosidad apenas movida (aclara en B, oscurece en A)", () => {
    const b = coloresModo(p, "B").fondo;
    const a = coloresModo(p, "A").fondo;
    expect(oklch(colorPalabraGigante(b, "B"))[0] - oklch(b)[0]).toBeCloseTo(DELTA_L_PALABRA, 2);
    expect(oklch(a)[0] - oklch(colorPalabraGigante(a, "A"))[0]).toBeCloseTo(DELTA_L_PALABRA, 2);
  });

  it("el texto que la pisa se mide contra el peor entre el fondo y la palabra", () => {
    const fondo = coloresModo(p, "A");
    // Una palabra del color del texto: si el body la pisa, el contraste cae a 1:1.
    const palabra = { caja: { x: 0, y: 650, w: 1080, h: 120 }, color: fondo.texto };
    expect(ctl({ palabra }, "Body sobre su fondo")!.ok).toBe(false);
    // Lejos del texto no cuenta.
    expect(ctl({ palabra: { ...palabra, caja: { x: 0, y: 1250, w: 1080, h: 100 } } }, "Body sobre su fondo")!.ok).toBe(true);
  });

  it("con su color tono sobre tono, el body de la pieza sigue pasando", () => {
    const palabra = { caja: { x: 0, y: 650, w: 1080, h: 120 }, color: colorPalabraGigante(coloresModo(p, "A").fondo, "A") };
    expect(ctl({ palabra }, "Body sobre su fondo")!.ok).toBe(true);
  });

  it("no cuenta como información: puede salirse del lienzo sin fallar la zona segura", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ palabra: { caja: { x: -200, y: 1200, w: 1500, h: 300 }, color: colorPalabraGigante(coloresModo(p, "A").fondo, "A") } }));
    expect(r.controles.find((c) => c.control.startsWith("Contenido dentro del margen"))!.ok).toBe(true);
  });

  it("no va con otra decoración protagonista", () => {
    const palabra = { caja: { x: 0, y: 1200, w: 1080, h: 100 }, color: colorPalabraGigante(coloresModo(p, "A").fondo, "A") };
    expect(ctl({ palabra }, "Una sola decoración protagonista")!.ok).toBe(true);
    const forma = { caja: { x: 700, y: 900, w: 500, h: 500 }, color: p.tono_apoyo, opacidad: 0.3 };
    const c = ctl({ palabra, forma }, "Una sola decoración protagonista")!;
    expect(c.ok).toBe(false);
    expect(c.detalle).toContain("forma de fondo");
  });
});
