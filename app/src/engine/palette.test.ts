import { describe, expect, it } from "vitest";
import { contraste, hexToHsl } from "./color";
import { colorTexto, colorTextoAcento, coloresModo, derivarPaleta, enBandaProhibida, MIN_GRAFICO, MIN_TEXTO } from "./palette";
import { L_tabla, PRESETS, RUBROS } from "./presets";
import type { ValorMarca } from "./presets";

describe("tabla de L por banda", () => {
  it("devuelve los valores del manual", () => {
    expect(L_tabla(10)).toBe(42);
    expect(L_tabla(30)).toBe(32);
    expect(L_tabla(50)).toBe(25);
    expect(L_tabla(120)).toBe(25);
    expect(L_tabla(180)).toBe(25);
    expect(L_tabla(215)).toBe(40);
    expect(L_tabla(280)).toBe(45);
    expect(L_tabla(340)).toBe(42);
  });
});

describe("modo heredado — ejemplo del manual (amarillo H45 S90 L60)", () => {
  const r = derivarPaleta({ rubro: "gastronomia", modo: "heredado", heredado: { H: 45, S: 90, L: 60 } });

  it("conserva el original y genera la versión funcional L25 apta para texto", () => {
    expect(r.estado).toBe("ok");
    const p = r.paleta!;
    expect(p.color_marca).toEqual({ H: 45, S: 90, L: 60 });
    expect(contraste(p.color_marca, p.fondo_neutro)).toBeLessThan(2);
    expect(p.version_funcional).toMatchObject({ H: 45, S: 90 });
    expect(p.version_funcional!.L).toBeLessThanOrEqual(25);
    expect(contraste(p.version_funcional!, p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
    // La funcional también se lee sobre el amarillo original (texto en Modo B).
    expect(contraste(p.version_funcional!, p.color_marca)).toBeGreaterThanOrEqual(MIN_TEXTO);
  });
});

describe("modo heredado — resolución automática sin revisión manual", () => {
  it("el turquesa #0B9EBF (tono medio) se resuelve profundizando la versión funcional", () => {
    const r = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado: hexToHsl("#0B9EBF")! });
    expect(r.estado).toBe("ok");
    const p = r.paleta!;
    expect(contraste(p.color_marca, p.fondo_neutro)).toBeLessThan(MIN_GRAFICO);
    expect(contraste(p.version_funcional!, p.color_marca)).toBeGreaterThanOrEqual(MIN_GRAFICO);
  });

  it("toda la grilla de colores (H, S, L) resuelve y cumple los mínimos", () => {
    for (let H = 0; H < 360; H += 10) {
      for (let S = 0; S <= 100; S += 20) {
        for (let L = 5; L <= 95; L += 5) {
          for (const rubro of RUBROS) {
            const r = derivarPaleta({ rubro, modo: "heredado", heredado: { H, S, L } });
            expect(r.estado, `H${H} S${S} L${L} ${rubro}: ${r.motivos.join("; ")}`).toBe("ok");
            const p = r.paleta!;
            expect(contraste(colorTexto(p), p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
            const textoB = coloresModo(p, "B").texto;
            expect(contraste(p.color_marca, textoB)).toBeGreaterThanOrEqual(MIN_GRAFICO);
            expect(contraste(p.acento, colorTextoAcento(p))).toBeGreaterThanOrEqual(MIN_TEXTO);
            expect(contraste(p.acento, p.color_marca)).toBeGreaterThanOrEqual(MIN_GRAFICO);
          }
        }
      }
    }
  });
});

describe("invariantes de paleta para todo el círculo cromático", () => {
  const valores: (ValorMarca | null)[] = [null, "energia", "calma"];

  for (const rubro of RUBROS) {
    it(`${rubro}: todo H de 0 a 359 pasa el checklist de color`, () => {
      for (const valor of valores) {
        for (let H = 0; H < 360; H++) {
          const r = derivarPaleta({ rubro, modo: "optimizado", H, valor });
          expect(r.estado, `H${H} ${valor}`).toBe("ok");
          const p = r.paleta!;
          expect(contraste(colorTexto(p), p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
          expect(contraste(p.acento, colorTextoAcento(p))).toBeGreaterThanOrEqual(MIN_TEXTO);
          expect(contraste(p.acento, p.color_marca)).toBeGreaterThanOrEqual(MIN_GRAFICO);
          expect(p.tono_apoyo.L).toBeLessThanOrEqual(67);
        }
      }
    });
  }

  it("dentro del rango del rubro, la personalidad define complementario o análogo", () => {
    for (const rubro of RUBROS) {
      const [a] = PRESETS[rubro].H_rango;
      expect(derivarPaleta({ rubro, modo: "optimizado", H: a, valor: "energia" }).paleta!.tipo_acento).toBe(
        "complementario",
      );
      expect(derivarPaleta({ rubro, modo: "optimizado", H: a, valor: "calma" }).paleta!.tipo_acento).toBe("analogo");
    }
  });

  it("el acento nunca cae en la banda prohibida", () => {
    for (let H = 0; H < 360; H += 5) {
      for (let ex = 0; ex < 360; ex += 15) {
        const r = derivarPaleta({ rubro: "servicios", modo: "optimizado", H, excluido_H: ex });
        if (r.paleta && r.paleta.acento.H !== H) expect(enBandaProhibida(r.paleta.acento.H, ex)).toBe(false);
      }
    }
  });
});

describe("modo heredado sobre colores reales", () => {
  it.each(["#0057B8", "#FFE600", "#E30613", "#00A650", "#7B2D8E", "#111111", "#F5F5F5"])("%s", (hex) => {
    const r = derivarPaleta({ rubro: "servicios", modo: "heredado", heredado: hexToHsl(hex)! });
    if (r.estado === "ok") {
      const p = r.paleta!;
      expect(p.color_marca).toEqual(hexToHsl(hex));
      expect(contraste(colorTexto(p), p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
      expect(contraste(p.acento, colorTextoAcento(p))).toBeGreaterThanOrEqual(MIN_TEXTO);
      expect(contraste(p.acento, p.color_marca)).toBeGreaterThanOrEqual(MIN_GRAFICO);
    } else {
      expect(r.motivos.length).toBeGreaterThan(0);
    }
  });

  it("un color claro (L > 70) invierte el modo predominante", () => {
    const r = derivarPaleta({ rubro: "belleza", modo: "heredado", heredado: { H: 330, S: 60, L: 80 } });
    expect(r.paleta?.invertir_modo).toBe(true);
  });
});

describe("conversión HEX exacta", () => {
  it("un HEX ingresado a mano vuelve idéntico", async () => {
    const { hexToHsl, hslToHex } = await import("./color");
    for (const hex of ["#136c3a", "#22ec13", "#0b9ebf", "#e4f1ea", "#5dd08f", "#123456", "#fedcba"]) {
      expect(hslToHex(hexToHsl(hex, true)!)).toBe(hex);
    }
  });
});

describe("CTA en Modo B", () => {
  it("la paleta de Hualito (acento rojo sobre verde) se resuelve con contorno", async () => {
    const { ctaModoB, controlesCtaModoB, cumple } = await import("./palette");
    const base = derivarPaleta({ rubro: "tech", modo: "optimizado", H: 146 }).paleta!;
    const p = { ...base, acento: { ...hexToHsl("#bf391b", true)!, texto: "blanco" as const } };
    expect(contraste(p.acento, p.color_marca)).toBeLessThan(MIN_GRAFICO);
    expect(ctaModoB(p)).toBe("contorno");
    expect(cumple(controlesCtaModoB(p, "contorno"))).toBe(true);
    expect(cumple(controlesCtaModoB(p, "invertido"))).toBe(true);
    expect(cumple(controlesCtaModoB(p, "directo"))).toBe(false);
  });

  it("una paleta calculada por la fórmula usa CTA directo", async () => {
    const { ctaModoB } = await import("./palette");
    for (let H = 0; H < 360; H += 15) {
      expect(ctaModoB(derivarPaleta({ rubro: "servicios", modo: "optimizado", H }).paleta!)).toBe("directo");
    }
  });
});

describe("protecciones de la paleta de Hualito", () => {
  const hualito = async () => {
    const base = derivarPaleta({ rubro: "tech", modo: "optimizado", H: 146 }).paleta!;
    return {
      ...base,
      color_marca: hexToHsl("#136c3a", true)!,
      tono_apoyo: hexToHsl("#5dd08f", true)!,
      fondo_neutro: hexToHsl("#e4f1ea", true)!,
      acento: { ...hexToHsl("#bf391b", true)!, texto: "blanco" as const },
    };
  };

  it("un CTA directo elegido a mano que no cumple se reemplaza por el automático", async () => {
    const { ctaModoB, ctaModoBElegidoInvalido } = await import("./palette");
    const p = { ...(await hualito()), cta_modo_b: "directo" as const };
    expect(ctaModoBElegidoInvalido(p)).toBe(true);
    expect(ctaModoB(p)).toBe("contorno");
  });

  it("la forma decorativa baja su opacidad para no romper el 4,5:1 del body", async () => {
    const { opacidadSegura } = await import("./palette");
    const { mezclar } = await import("./color");
    const p = await hualito();
    // Modo B: forma en fondo neutro sobre la marca, texto en fondo neutro.
    const a = opacidadSegura(p.color_marca, p.fondo_neutro, p.fondo_neutro, 0.12);
    expect(a).toBeLessThan(0.12);
    expect(contraste(p.fondo_neutro, mezclar(p.color_marca, p.fondo_neutro, a))).toBeGreaterThanOrEqual(MIN_TEXTO);
  });
});
