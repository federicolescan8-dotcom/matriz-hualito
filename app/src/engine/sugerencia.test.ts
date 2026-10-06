import { describe, expect, it } from "vitest";
import { desdeOklch, hexToHsl, hslToHex, hslToRgb, oklch } from "./color";
import { colorPorContraste, colorValidoCercano, controlesPaleta, derivarPaleta, fallasPaleta, ajustarRol } from "./palette";
import { RUBROS } from "./presets";

describe("controles de la paleta", () => {
  it("toda paleta calculada por la fórmula los cumple", () => {
    for (const rubro of RUBROS) {
      for (let H = 0; H < 360; H += 5) {
        const p = derivarPaleta({ rubro, modo: "optimizado", H }).paleta!;
        expect(fallasPaleta(p).map((c) => c.control), `${rubro} H${H}`).toEqual([]);
      }
    }
    for (const hex of ["#0B9EBF", "#FFE600", "#136c3a"]) {
      const p = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado: hexToHsl(hex, true)! }).paleta!;
      expect(fallasPaleta(p).map((c) => c.control), hex).toEqual([]);
    }
  });
});

describe("color válido más próximo a un ajuste manual", () => {
  const base = derivarPaleta({ rubro: "tech", modo: "optimizado", H: 146 }).paleta!;

  it("un acento que no cumple se acerca al elegido y cumple", () => {
    const deseado = hexToHsl("#f2c200", true)!;
    const p = ajustarRol(base, "acento", deseado);
    const s = colorValidoCercano(p, "acento", deseado)!;
    expect(s).not.toBeNull();
    expect(fallasPaleta(ajustarRol(p, "acento", s), "acento")).toEqual([]);
  });

  it("un color de marca claro se oscurece conservando el matiz", () => {
    const deseado = hexToHsl("#8fd9ae", true)!;
    const p = ajustarRol(base, "color_marca", deseado);
    expect(fallasPaleta(p, "color_marca").length).toBeGreaterThan(0);
    const s = colorValidoCercano(p, "color_marca", deseado)!;
    expect(Math.abs(s.H - deseado.H)).toBeLessThanOrEqual(10);
    expect(fallasPaleta(ajustarRol(p, "color_marca", s), "color_marca")).toEqual([]);
  });

  it("si el color elegido ya cumple, la sugerencia es él mismo (redondeado)", () => {
    const p = base;
    const s = colorValidoCercano(p, "tono_apoyo", p.tono_apoyo)!;
    expect(controlesPaleta(ajustarRol(p, "tono_apoyo", s)).every((c) => c.valor >= c.minimo || !c.roles.includes("tono_apoyo"))).toBe(true);
  });
});

describe("OKLCH", () => {
  it("ida y vuelta sin perder el color", () => {
    for (const hex of ["#136c3a", "#bf391b", "#f2c200", "#0b9ebf", "#ffffff", "#000000", "#8fd9ae", "#5d2e8c"]) {
      const c = hexToHsl(hex, true)!;
      const vuelta = hslToRgb(desdeOklch(...oklch(c)));
      hslToRgb(c).forEach((v, i) => expect(Math.abs(v - vuelta[i]), hex).toBeLessThanOrEqual(1));
    }
  });
});

describe("variante por contraste (técnica de Leonardo)", () => {
  const base = derivarPaleta({ rubro: "tech", modo: "optimizado", H: 146 }).paleta!;
  const difH = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  it("un acento amarillo cumple sin cambiar de matiz", () => {
    const deseado = hexToHsl("#f2c200", true)!;
    const p = ajustarRol(base, "acento", deseado);
    const s = colorPorContraste(p, "acento", deseado)!;
    expect(s).not.toBeNull();
    expect(fallasPaleta(ajustarRol(p, "acento", s), "acento")).toEqual([]);
    const [, C, h] = oklch(s);
    if (C > 0.03) expect(difH(h, oklch(deseado)[2])).toBeLessThanOrEqual(3);
  });

  it("un color de marca claro se oscurece conservando el matiz percibido", () => {
    const deseado = hexToHsl("#8fd9ae", true)!;
    const p = ajustarRol(base, "color_marca", deseado);
    const s = colorPorContraste(p, "color_marca", deseado)!;
    expect(fallasPaleta(ajustarRol(p, "color_marca", s), "color_marca")).toEqual([]);
    expect(oklch(s)[0]).toBeLessThan(oklch(deseado)[0]);
    expect(difH(oklch(s)[2], oklch(deseado)[2])).toBeLessThanOrEqual(3);
  });

  it("si el color ya cumple, la sugerencia es él mismo", () => {
    const s = colorPorContraste(base, "tono_apoyo", base.tono_apoyo)!;
    expect(hslToHex(s)).toBe(hslToHex(base.tono_apoyo));
  });

  it("el turquesa #0B9EBF heredado: apoyo, fondo y acento", () => {
    const p = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado: hexToHsl("#0B9EBF", true)!, funcional: false }).paleta!;
    for (const rol of ["tono_apoyo", "fondo_neutro", "acento"] as const) {
      if (fallasPaleta(p, rol).length === 0) continue;
      const s = colorPorContraste(p, rol, p[rol]);
      if (s) expect(fallasPaleta(ajustarRol(p, rol, s), rol)).toEqual([]);
    }
  });
});

describe("heredado sin versión funcional (decisión del cliente)", () => {
  it("siempre da paleta, conserva el color y deja como aviso lo que no cumple", () => {
    for (let H = 0; H < 360; H += 30) {
      for (let L = 40; L <= 90; L += 10) {
        const heredado = { H, S: 80, L };
        const con = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado });
        if (!con.requiere_funcional) continue;
        const r = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado, funcional: false });
        expect(r.estado).toBe("ok");
        expect(r.paleta!.color_marca).toEqual(heredado);
        expect(r.paleta!.version_funcional).toBeNull();
        expect(r.avisos!.length).toBe(fallasPaleta(r.paleta!).length);
      }
    }
  });

  it("un color oscuro que ya funciona como texto no ofrece la opción", () => {
    const r = derivarPaleta({ rubro: "tech", modo: "heredado", heredado: hexToHsl("#136c3a", true)! });
    expect(r.requiere_funcional).toBe(false);
  });

  it("el turquesa #0B9EBF: sugerencias para apoyo, fondo y acento", () => {
    const r = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado: hexToHsl("#0B9EBF", true)!, funcional: false });
    const p = r.paleta!;
    expect(r.avisos!.length).toBeGreaterThan(0);
    for (const rol of ["tono_apoyo", "fondo_neutro", "acento"] as const) {
      if (fallasPaleta(p, rol).length === 0) continue;
      const s = colorValidoCercano(p, rol, p[rol]);
      if (s) expect(fallasPaleta(ajustarRol(p, rol, s), rol)).toEqual([]);
    }
  });
});
