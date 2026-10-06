import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips, type Marca } from "./diagnostico";
import { ejesSemilla } from "./ejes";
import { decoEfectiva, piezaNueva } from "./pieza";
import { formaParametrica, normalizarContorno } from "./recursos";

const d = { ...diagnosticoVacio(), nombre: "Uno", rubro: "gastronomia" as const };
const marca = construirMarca(d, generarChips(d)[0]);
const conPropia = (m: Marca, semilla: number, patron = false): Marca => ({
  ...m,
  identidad: { ...m.identidad, recursos: { formas: [formaParametrica(semilla, m.diagnostico.ejes)], patron_propio: patron } },
});

describe("rasgos propios (E2)", () => {
  it("normaliza un contorno a la caja 0-100 sin deformarlo", () => {
    const d = normalizarContorno([{ x: 10, y: 10 }, { x: 210, y: 10 }, { x: 210, y: 110 }, { x: 10, y: 110 }]);
    expect(d).toBe("M0 25L100 25L100 75L0 75Z");
    expect(normalizarContorno([{ x: 0, y: 0 }])).toBe("");
  });

  it("la forma paramétrica es determinista y cambia con la semilla y los ejes", () => {
    const e = ejesSemilla("gastronomia");
    expect(formaParametrica(3, e).d).toBe(formaParametrica(3, e).d);
    expect(formaParametrica(3, e).d).not.toBe(formaParametrica(4, e).d);
    expect(formaParametrica(3, { ...e, artesanal_tecnologico: 100, serio_ludico: 0 }).d).not.toBe(formaParametrica(3, e).d);
    // Todo el trazado queda dentro de la caja.
    const nums = formaParametrica(5, e).d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(-15);
    expect(Math.max(...nums)).toBeLessThanOrEqual(115);
  });

  it("la capa decorativa usa primero la forma y el patrón propios", () => {
    const m = conPropia(marca, 7, true);
    const p = { ...piezaNueva(m), variante: "2B-L" as const, deco: null };
    const deco = decoEfectiva(m, p);
    expect(deco.forma).toBe(m.identidad.recursos!.formas[0].id);
    expect(decoEfectiva(m, { ...p, deco: { forma: "x", relleno: "patron" } }).patron).toBe("propio");
  });

  it("dos marcas del mismo rubro con formas propias distintas dan capas distintas; sin propias, la del rubro", () => {
    const a = conPropia(marca, 1);
    const b = conPropia(marca, 2);
    const pa = { ...piezaNueva(a), variante: "2B-L" as const };
    expect(decoEfectiva(a, pa).forma).not.toBe(decoEfectiva(b, pa).forma);
    expect(decoEfectiva(marca, pa).forma).toBe("circulo");
  });
});
