import { describe, expect, it } from "vitest";
import { DECORACIONES, decoracionEfectiva, decoracionesPara, tocaDecoracion } from "./decoraciones";
import { FORMATOS, type Formato } from "./formatos";

const TODOS = Object.keys(FORMATOS) as Formato[];

describe("decoraciones de plantilla", () => {
  it("el arco lateral reproduce el ejemplo medido en 4:5", () => {
    const [c] = DECORACIONES["arco-lateral"].geometria("4:5").circulos;
    // Medido sobre el ejemplo: centro (743, 674), radio 831.
    expect(c.cx).toBeCloseTo(743, -1);
    expect(c.cy).toBe(675);
    expect(c.r).toBeCloseTo(831, -1);
  });

  it("el arco nunca deja una costura: el radio cubre el alto en todos los formatos", () => {
    for (const fm of TODOS) {
      const [c] = DECORACIONES["arco-lateral"].geometria(fm).circulos;
      expect(c.r).toBeGreaterThanOrEqual(FORMATOS[fm].alto / 2);
    }
  });

  it("las esquinas reproducen el ejemplo en 4:5 y son simétricas respecto del centro en todos los formatos", () => {
    const [a] = DECORACIONES["esquinas-diagonal"].geometria("4:5").circulos;
    // Medido sobre el ejemplo: centro (-424, -374), radio 801.
    expect(a.cx).toBeCloseTo(-424, -1);
    expect(a.cy).toBeCloseTo(-374, -1);
    expect(a.r).toBeCloseTo(801, -1);
    for (const fm of TODOS) {
      const [p, q] = DECORACIONES["esquinas-diagonal"].geometria(fm).circulos;
      expect(p.cx + q.cx).toBeCloseTo(FORMATOS[fm].ancho);
      expect(p.cy + q.cy).toBeCloseTo(FORMATOS[fm].alto);
    }
  });

  it("detecta el choque con las figuras, no con el resto del lienzo", () => {
    const arco = DECORACIONES["arco-lateral"].geometria("4:5");
    expect(tocaDecoracion({ x: 119, y: 400, w: 700, h: 120 }, arco)).toBe(false);
    expect(tocaDecoracion({ x: 10, y: 20, w: 200, h: 60 }, arco)).toBe(true);
    const esquinas = DECORACIONES["esquinas-diagonal"].geometria("4:5");
    expect(tocaDecoracion({ x: 119, y: 500, w: 700, h: 120 }, esquinas)).toBe(false);
    expect(tocaDecoracion({ x: 119, y: 150, w: 300, h: 80 }, esquinas)).toBe(true);
    // El aire agranda la zona prohibida.
    expect(tocaDecoracion({ x: 119, y: 240, w: 300, h: 80 }, esquinas)).toBe(false);
    expect(tocaDecoracion({ x: 119, y: 240, w: 300, h: 80 }, esquinas, 40)).toBe(true);
  });

  it("cada decoración se ofrece solo en su variante", () => {
    expect(decoracionesPara("2").map((d) => d.id)).toEqual(["arco-lateral"]);
    expect(decoracionesPara("3").map((d) => d.id)).toEqual(["esquinas-diagonal"]);
    expect(decoracionesPara("1")).toEqual([]);
    expect(decoracionEfectiva({ decoracion: "arco-lateral", variante: "3" })).toBeNull();
    expect(decoracionEfectiva({ decoracion: "arco-lateral", variante: "2" })?.id).toBe("arco-lateral");
  });
});
