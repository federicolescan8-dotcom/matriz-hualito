import { describe, expect, it } from "vitest";
import { ajustarColorMarca, construirMarca, diagnosticoVacio, generarChips, restaurarColorMarca } from "./diagnostico";
import { hexToHsl } from "./color";
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

describe("ajustes manuales de paleta", () => {
  const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
  const base = construirMarca(d, generarChips(d)[0]);

  it("cambia el rol, registra el ajuste y conserva la paleta calculada", () => {
    const m = ajustarColorMarca(base, "acento", hexToHsl("#ffcc00")!);
    expect(m.paleta.acento).toMatchObject(hexToHsl("#ffcc00")!);
    expect(m.ajustes_manuales).toEqual(["acento"]);
    expect(m.paleta_calculada).toEqual(base.paleta);
    // Amarillo claro: el texto sobre el acento pasa a ser oscuro.
    expect(m.paleta.acento.texto).not.toBe("blanco");
  });

  it("al cambiar la marca se vuelve a elegir el texto sobre el acento y se actualiza color.base", () => {
    const m = ajustarColorMarca(base, "color_marca", hexToHsl("#111111")!);
    expect(m.color.base).toEqual(hexToHsl("#111111"));
  });

  it("restaura un rol o toda la paleta", () => {
    const m = ajustarColorMarca(ajustarColorMarca(base, "acento", hexToHsl("#ffcc00")!), "tono_apoyo", hexToHsl("#cccccc")!);
    const r1 = restaurarColorMarca(m, "acento");
    expect(r1.paleta.acento).toMatchObject({ H: base.paleta.acento.H, S: base.paleta.acento.S, L: base.paleta.acento.L });
    expect(r1.ajustes_manuales).toEqual(["tono_apoyo"]);
    const r2 = restaurarColorMarca(m);
    expect(r2.paleta).toEqual(base.paleta);
    expect(r2.ajustes_manuales).toEqual([]);
  });
});
