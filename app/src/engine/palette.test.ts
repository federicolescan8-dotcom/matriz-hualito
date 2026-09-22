import { describe, expect, it } from "vitest";
import { contraste, hexToHsl } from "./color";
import { colorTexto, colorTextoAcento, derivarPaleta, enBandaProhibida, MIN_GRAFICO, MIN_TEXTO } from "./palette";
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
    expect(p.version_funcional).toMatchObject({ H: 45, S: 90, L: 25 });
    expect(contraste(p.version_funcional!, p.fondo_neutro)).toBeGreaterThanOrEqual(MIN_TEXTO);
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
