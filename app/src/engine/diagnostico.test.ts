import { describe, expect, it } from "vitest";
import { rangoMatiz } from "./ejes";
import { ajustarColorMarca, construirMarca, diagnosticoDeMarca, diagnosticoVacio, generarChips, MAX_PUBLICO, publicoLimpio, restaurarColorMarca } from "./diagnostico";
import { evaluarPieza, type Medicion } from "./checklist";
import { piezaNueva } from "./pieza";
import { hexToHsl } from "./color";
import { enBandaProhibida } from "./palette";

describe("chips del diagnóstico", () => {
  it("genera 4 chips dentro del rango de matiz que sale de los ejes (E12)", () => {
    const d = { ...diagnosticoVacio(), rubro: "servicios" as const };
    const [a, b] = rangoMatiz(d.ejes, d.rubro);
    const chips = generarChips(d);
    expect(chips).toHaveLength(4);
    for (const c of chips) {
      expect(c.H).toBeGreaterThanOrEqual(a);
      expect(c.H).toBeLessThanOrEqual(b);
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
    expect(m.identidad.tipografia.familia_variable).toBe("Inter");
  });
});

describe("ajustes manuales de paleta", () => {
  const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
  const base = construirMarca(d, generarChips(d)[0]);

  it("cambia el rol, registra el ajuste y conserva la paleta calculada", () => {
    const m = ajustarColorMarca(base, "acento", hexToHsl("#ffcc00")!);
    expect(m.identidad.paleta.acento).toMatchObject(hexToHsl("#ffcc00")!);
    expect(m.identidad.ajustes_manuales).toEqual(["acento"]);
    expect(m.identidad.paleta_calculada).toEqual(base.identidad.paleta);
    // Amarillo claro: el texto sobre el acento pasa a ser oscuro.
    expect(m.identidad.paleta.acento.texto).not.toBe("blanco");
  });

  it("al cambiar la marca se vuelve a elegir el texto sobre el acento y se actualiza color.base", () => {
    const m = ajustarColorMarca(base, "color_marca", hexToHsl("#111111")!);
    expect(m.identidad.color.base).toEqual(hexToHsl("#111111"));
  });

  it("restaura un rol o toda la paleta", () => {
    const m = ajustarColorMarca(ajustarColorMarca(base, "acento", hexToHsl("#ffcc00")!), "tono_apoyo", hexToHsl("#cccccc")!);
    const r1 = restaurarColorMarca(m, "acento");
    expect(r1.identidad.paleta.acento).toMatchObject({ H: base.identidad.paleta.acento.H, S: base.identidad.paleta.acento.S, L: base.identidad.paleta.acento.L });
    expect(r1.identidad.ajustes_manuales).toEqual(["tono_apoyo"]);
    const r2 = restaurarColorMarca(m);
    expect(r2.identidad.paleta).toEqual(base.identidad.paleta);
    expect(r2.identidad.ajustes_manuales).toEqual([]);
  });
});

describe("versión funcional como opción (v1.1)", () => {
  it("un color heredado claro ofrece dos chips y la marca sin funcional publica con avisos", async () => {
    const { construirMarca, diagnosticoVacio, generarChips, elegirVersionFuncional, puedeElegirFuncional } = await import("./diagnostico");
    const d = { ...diagnosticoVacio(), nombre: "X", color_previo_hex: "#0B9EBF" };
    const chips = generarChips(d);
    const solo = chips.find((c) => c.id === "previo-heredado-solo")!;
    expect(chips.find((c) => c.id === "previo-heredado")!.etiqueta).toContain("versión funcional");
    const m = construirMarca(d, solo);
    expect(m.identidad.color.solo_heredado).toBe(true);
    expect(m.identidad.paleta.version_funcional).toBeNull();
    expect(puedeElegirFuncional(m)).toBe(true);
    const con = elegirVersionFuncional(m, true);
    expect(con.identidad.paleta.version_funcional).not.toBeNull();
    expect(con.identidad.color.solo_heredado).toBeUndefined();
    expect(elegirVersionFuncional(con, false).identidad.paleta).toEqual(m.identidad.paleta);
  });
});

// Público (E15, paso 9): viaja con el diagnóstico, no se guarda vacío y no toca el checklist.
describe("público del cliente", () => {
  const base = { ...diagnosticoVacio(), nombre: "Panadería", rubro: "gastronomia" as const };
  const publico = { aquien: "  Familias del barrio ", motiva: "Pan del día", frena: "" };

  it("viaja del diagnóstico a la marca, recortado, y vuelve al editar", () => {
    const m = construirMarca({ ...base, publico }, generarChips(base)[0]);
    expect(m.diagnostico.publico).toEqual({ aquien: "Familias del barrio", motiva: "Pan del día", frena: "" });
    expect(diagnosticoDeMarca(m).publico).toEqual(m.diagnostico.publico);
  });

  it("con las tres respuestas vacías no se guarda", () => {
    const m = construirMarca({ ...base, publico: { aquien: " ", motiva: "", frena: "" } }, generarChips(base)[0]);
    expect("publico" in m.diagnostico).toBe(false);
    expect(publicoLimpio(undefined)).toBeUndefined();
    expect(publicoLimpio({ aquien: "x".repeat(200) })!.aquien).toHaveLength(MAX_PUBLICO);
  });

  it("el checklist da lo mismo con o sin público", () => {
    const sin = construirMarca(base, generarChips(base)[0]);
    const con = { ...sin, diagnostico: { ...sin.diagnostico, publico: publicoLimpio(publico) } };
    const m: Medicion = {
      h1: { lineas: [{ x: 119, y: 420, w: 700, h: 110 }], px: 100, peso: 700, italica: false },
      body: { lineas: [{ x: 119, y: 600, w: 600, h: 44 }], px: 32, peso: 400, italica: false },
      cta: null,
      logo: null,
      forma: null,
      desborde: false,
    };
    const pz = { ...piezaNueva(sin), objetivo: "vender" as const };
    expect(evaluarPieza(con, pz, m)).toEqual(evaluarPieza(sin, pz, m));
  });
});
