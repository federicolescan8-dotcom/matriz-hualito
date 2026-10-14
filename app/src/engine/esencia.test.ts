import { describe, expect, it } from "vitest";
import { hexToHsl } from "./color";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { aplicarEsencia, esenciaDeColores, rolesDeEsencia } from "./esencia";
import { extraerColores } from "./laboratorio";
import { fallasPaleta } from "./palette";

const h = (hex: string) => hexToHsl(hex, true)!;
const NEGRO = h("#0a0a0a");
const CREMA = h("#e9dcc6");
const DORADO = h("#c9a27a");

function marcaHeredada(hex: string) {
  const d = { ...diagnosticoVacio(), nombre: "Prueba", rubro: "gastronomia" as const, color_previo_hex: hex };
  return construirMarca(d, generarChips(d).find((c) => c.id === "previo-heredado")!);
}

describe("esencia de identidad (perfilador)", () => {
  it("con extremos cuenta el negro y el blanco; sin extremos, no (como siempre)", () => {
    const px = [...Array(60).fill({ rgb: [5, 5, 5], alfa: 255 }), ...Array(40).fill({ rgb: [233, 220, 198], alfa: 255 })];
    expect(extraerColores(px)).toHaveLength(1);
    const con = extraerColores(px, 5, { extremos: true });
    expect(con).toHaveLength(2);
    expect(con[0].color.L).toBeLessThan(5);
  });

  it("superficie, figura legible y detalle aparte", () => {
    const e = esenciaDeColores([
      { color: NEGRO, peso: 0.7 },
      { color: CREMA, peso: 0.2 },
      { color: DORADO, peso: 0.1 },
    ])!;
    expect(e.superficie).toBe(NEGRO);
    expect(e.figura).toBe(CREMA);
    expect(e.detalle).toBe(DORADO);
  });

  it("la figura es la tinta de más contraste, no el borde suavizado de más peso", () => {
    const borde = h("#75706b");
    const e = esenciaDeColores([
      { color: NEGRO, peso: 0.76 },
      { color: borde, peso: 0.1 },
      { color: h("#d5cec6"), peso: 0.05 },
      { color: h("#383532"), peso: 0.05 },
    ])!;
    expect(e.figura.L).toBeGreaterThan(75);
    expect(e.detalle).toBeNull();
  });

  it("sin una figura que se lea sobre la superficie no hay esencia", () => {
    expect(esenciaDeColores([{ color: NEGRO, peso: 0.8 }, { color: h("#1a1a1a"), peso: 0.2 }])).toBeNull();
  });

  it("negro con logo crema: marca negra, fondo crema y abre en Modo B", () => {
    const r = rolesDeEsencia({ superficie: NEGRO, figura: CREMA, detalle: null, fuentes: [] });
    expect(r.color_marca).toBe(NEGRO);
    expect(r.fondo_neutro).toBe(CREMA);
    expect(r.acento).toBe(CREMA);
    expect(r.invertir_modo).toBe(true);
  });

  it("blanco con logo rojo: marca roja, fondo blanco y abre en Modo A", () => {
    const rojo = h("#c0392b");
    const r = rolesDeEsencia({ superficie: h("#ffffff"), figura: rojo, detalle: null, fuentes: [] });
    expect(r.color_marca).toBe(rojo);
    expect(r.fondo_neutro?.L).toBe(100);
    expect(r.invertir_modo).toBe(false);
  });

  it("una figura saturada que no es neutra pasa a acento", () => {
    const fucsia = h("#e6237e");
    const r = rolesDeEsencia({ superficie: NEGRO, figura: fucsia, detalle: null, fuentes: [] });
    expect(r.fondo_neutro).toBeNull();
    expect(r.acento).toBe(fucsia);
  });

  it("aplica fondo y acento de la identidad sin romper la paleta", () => {
    const m = marcaHeredada("#0A0A0A");
    const { marca, avisos } = aplicarEsencia(m, { color_marca: NEGRO, fondo_neutro: CREMA, acento: DORADO, invertir_modo: true });
    const p = marca.identidad.paleta;
    expect(fallasPaleta(p)).toEqual([]);
    expect(p.acento.H).toBeCloseTo(DORADO.H, 0);
    expect(p.invertir_modo).toBe(true);
    expect(marca.identidad.ajustes_manuales).toEqual(expect.arrayContaining(["fondo_neutro", "acento", "tono_apoyo"]));
    // Marca negra: el tono de apoyo toma el matiz del dorado, no el H0 (rosado) de la fórmula.
    expect(Math.abs(p.tono_apoyo.H - DORADO.H)).toBeLessThan(15);
    expect(avisos.every((a) => !a.includes("queda el que calcula"))).toBe(true);
  });

  it("un acento que no se separa de la marca no se usa: queda el del motor, con aviso", () => {
    const m = marcaHeredada("#0A0A0A");
    const casiNegro = h("#1c1612");
    const { marca, avisos } = aplicarEsencia(m, { color_marca: NEGRO, fondo_neutro: null, acento: casiNegro, invertir_modo: true });
    expect(fallasPaleta(marca.identidad.paleta)).toEqual([]);
    expect(marca.identidad.paleta.acento).toEqual(m.identidad.paleta.acento);
    expect(avisos.length).toBe(1);
  });
});
