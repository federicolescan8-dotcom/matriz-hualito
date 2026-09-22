import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { enBandaProhibida } from "./palette";

describe("chips del diagnóstico", () => {
  it("genera 4 chips dentro del rango del rubro", () => {
    const d = { ...diagnosticoVacio(), rubro: "servicios" as const };
    const chips = generarChips(d);
    expect(chips).toHaveLength(4);
    for (const c of chips) {
      expect(c.H).toBeGreaterThanOrEqual(200);
      expect(c.H).toBeLessThanOrEqual(230);
      expect(c.resultado.estado).toBe("ok");
    }
  });

  it("con color previo agrega su versión optimizada y la heredada", () => {
    const d = { ...diagnosticoVacio(), rubro: "gastronomia" as const, color_previo_hex: "#FFE600" };
    const chips = generarChips(d);
    expect(chips[0].id).toBe("previo-optimizado");
    expect(chips.at(-1)!.modo).toBe("heredado");
  });

  it("ningún chip cae en la banda prohibida", () => {
    const d = { ...diagnosticoVacio(), rubro: "tech" as const, excluido_H: 175 };
    for (const c of generarChips(d)) expect(enBandaProhibida(c.H, 175)).toBe(false);
  });

  it("construye la marca con la decisión de color registrada", () => {
    const d = { ...diagnosticoVacio(), nombre: "Estudio Pérez", color_previo_hex: "#0057B8" };
    const chip = generarChips(d).at(-1)!;
    const m = construirMarca(d, chip);
    expect(m.diagnostico.decision_color).toBe("heredado");
    expect(m.tipografia.familia_variable).toBe("Inter");
  });
});
