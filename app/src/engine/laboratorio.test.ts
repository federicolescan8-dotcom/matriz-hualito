import { describe, expect, it } from "vitest";
import { contraste, distanciaColor, hexToHsl, hexToRgb, type RGB } from "./color";
import { aplicarAlternativa, ajustarColorMarca, construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { confusionesDaltonismo, extraerColores, paletaExtendida, regenerarPaleta, simularDaltonismo } from "./laboratorio";
import { MIN_GRAFICO, MIN_TEXTO } from "./palette";

const d = { ...diagnosticoVacio(), nombre: "Lab", rubro: "gastronomia" as const };
const marca = construirMarca(d, generarChips(d)[0]);
const p = marca.identidad.paleta;
const entrada = { rubro: marca.rubro, valor: null, excluido_H: null };

describe("laboratorio de color (E3)", () => {
  it("la paleta extendida da secundarios usables como masa y marca cuáles van como texto", () => {
    for (const armonia of ["analoga", "complementaria", "triadica", "dividida"] as const) {
      const e = paletaExtendida(p, armonia);
      expect(e.secundarios).toHaveLength(2);
      for (const s of e.secundarios) {
        expect(contraste(s.color, p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_GRAFICO);
        expect(s.texto).toBe(contraste(s.color, p.fondo_neutro) >= MIN_TEXTO);
      }
      expect(contraste(e.neutro_oscuro, p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
    }
  });

  it("regenerar respeta los roles bloqueados y da alternativas distintas", () => {
    const alts = regenerarPaleta(p, ["color_marca"], entrada, 7);
    expect(alts.length).toBeGreaterThan(1);
    for (const a of alts) expect(distanciaColor(a.paleta.color_marca, p.color_marca)).toBeLessThan(0.5);
    // Con la marca bloqueada se deriva en modo heredado: el resto se ajusta a ese color y cumple.
    expect(alts.every((a) => a.fallas === 0)).toBe(true);
    expect(new Set(alts.map((a) => Math.round(a.paleta.acento.H))).size).toBeGreaterThan(1);
    // Misma semilla, mismas alternativas.
    expect(regenerarPaleta(p, ["color_marca"], entrada, 7)).toEqual(alts);
  });

  it("sin bloqueos cambia el color de marca y la marca pasa a optimizado", () => {
    const alt = regenerarPaleta(p, [], entrada, 3).find((a) => distanciaColor(a.paleta.color_marca, p.color_marca) > 2)!;
    const m = aplicarAlternativa(marca, alt);
    expect(m.identidad.paleta).toEqual(alt.paleta);
    expect(m.identidad.color.modo).toBe("optimizado");
    expect(m.identidad.color.base).toEqual(alt.paleta.color_marca);
  });

  it("un rol bloqueado distinto de la fórmula queda como ajuste manual", () => {
    const conAcento = ajustarColorMarca(marca, "acento", { H: 300, S: 80, L: 60 });
    const alt = regenerarPaleta(conAcento.identidad.paleta, ["acento"], entrada, 11)[0];
    expect(alt.ajustes).toContain("acento");
  });

  it("extrae los colores dominantes de una imagen sin el fondo blanco", () => {
    const px = (hex: string, n: number) => Array.from({ length: n }, () => ({ rgb: hexToRgb(hex) as RGB, alfa: 255 }));
    const colores = extraerColores([...px("#ffffff", 500), ...px("#c2410c", 300), ...px("#1e3a8a", 150), ...px("#c3420d", 20)]);
    expect(colores).toHaveLength(2);
    expect(colores[0].peso).toBeGreaterThan(colores[1].peso);
    expect(distanciaColor(colores[0].color, hexToHsl("#c2410c", true)!)).toBeLessThan(2);
  });

  it("simula daltonismo: rojo y verde se confunden en deuteranopia", () => {
    const rojo = { H: 0, S: 80, L: 45 };
    const verde = { H: 100, S: 60, L: 40 };
    expect(distanciaColor(rojo, verde)).toBeGreaterThan(30);
    expect(distanciaColor(simularDaltonismo(rojo, "deuteranopia"), simularDaltonismo(verde, "deuteranopia"))).toBeLessThan(15);
    const paleta = { ...p, color_marca: verde, acento: { ...p.acento, ...rojo } };
    expect(confusionesDaltonismo(paleta).some((c) => c.par === "acento y color de marca")).toBe(true);
  });
});
