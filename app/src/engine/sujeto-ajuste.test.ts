// Movimiento manual del sujeto (E16, paso 7): el ajuste y el motor que nunca lo deja tapando información.
import { describe, expect, it } from "vitest";
import { ESCALA_SUJETO, posicionValida, rectBase, rectConAjuste, sujetoLibre, type MascaraSujeto } from "./sujeto";

const W = 1080;
const H = 1350;
// Sujeto de 400×200 con lo opaco solo en el centro (las celdas del borde son aire transparente).
const mascara: MascaraSujeto = { cols: 4, filas: 2, celdas: "01100110" };
const base = { x: 500, y: 1000, w: 400, h: 200 };
const titulo = { x: 110, y: 380, w: 860, h: 160 };
const cta = { x: 360, y: 1060, w: 360, h: 90 };

describe("ajuste del sujeto", () => {
  it("corre el centro en fracción del lienzo y escala alrededor del centro", () => {
    const r = rectConAjuste(base, { dx: 0.1, dy: -0.1, escala: 1.5 }, W, H);
    expect(r.w).toBe(600);
    expect(r.h).toBe(300);
    expect(r.x + r.w / 2).toBeCloseTo(700 + 108, 6);
    expect(r.y + r.h / 2).toBeCloseTo(1100 - 135, 6);
  });

  it("rectBase deshace el ajuste", () => {
    const a = { dx: -0.2, dy: 0.05, escala: 0.7 };
    expect(rectBase(rectConAjuste(base, a, W, H), a, W, H)).toEqual(expect.objectContaining({ x: 500, y: 1000, w: 400, h: 200 }));
    expect(rectConAjuste(base, null, W, H)).toBe(base);
  });
});

describe("motor de posición válida", () => {
  it("si el lugar pedido está libre, lo respeta tal cual", () => {
    const a = { dx: 0, dy: -0.3, escala: 1 };
    expect(posicionValida(mascara, { ...base, y: 1200 }, a, [titulo], W, H)).toEqual(a);
  });

  it("si lo opaco tapa el título, lo corre al lugar libre más cercano", () => {
    // Pedido justo encima del título.
    const a = { dx: -0.1, dy: -0.48, escala: 1 };
    expect(sujetoLibre(mascara, rectConAjuste(base, a, W, H), [titulo])).toBe(false);
    const v = posicionValida(mascara, base, a, [titulo, cta], W, H)!;
    expect(v).not.toBeNull();
    expect(sujetoLibre(mascara, rectConAjuste(base, v, W, H), [titulo, cta])).toBe(true);
    // Cerca de lo pedido: menos de un cuarto del lienzo.
    expect(Math.hypot((v.dx - a.dx) * W, (v.dy - a.dy) * H)).toBeLessThan(W / 4);
    expect(v.escala).toBe(1);
  });

  it("el aire transparente puede pasar sobre el texto: no hace falta correrlo", () => {
    // Solo la columna izquierda del sujeto (transparente) cae sobre el CTA.
    const a = { dx: (cta.x + cta.w - 30 - base.x) / W, dy: 0, escala: 1 };
    const r = rectConAjuste(base, a, W, H);
    expect(r.x).toBeLessThan(cta.x + cta.w);
    expect(posicionValida(mascara, base, a, [cta], W, H)).toEqual(a);
  });

  it("si no hay lugar a esa escala, prueba más chico", () => {
    // Texto hasta 60 px del pie: con el centro dentro del lienzo, a 160% lo opaco lo tapa; a ~60% entra a sangre.
    const cajas = [{ x: 0, y: 0, w: W, h: 1290 }];
    const v = posicionValida(mascara, base, { dx: 0, dy: 0, escala: 1.6 }, cajas, W, H)!;
    expect(v).not.toBeNull();
    expect(v.escala).toBeLessThan(1.6);
    expect(sujetoLibre(mascara, rectConAjuste(base, v, W, H), cajas)).toBe(true);
  });

  it("si no hay lugar libre en ningún tamaño, vuelve al automático (null)", () => {
    expect(posicionValida(mascara, base, { dx: 0, dy: 0, escala: 1 }, [{ x: -500, y: -500, w: W + 1000, h: H + 1000 }], W, H)).toBeNull();
  });

  it("puede salirse a sangre, pero el centro no sale del lienzo", () => {
    const v = posicionValida(mascara, base, { dx: 0.5, dy: 0, escala: 1 }, [], W, H)!;
    const r = rectConAjuste(base, v, W, H);
    expect(r.x + r.w / 2).toBeLessThanOrEqual(W);
    expect(r.x + r.w).toBeGreaterThan(W);
  });

  it("la escala queda dentro del rango", () => {
    expect(posicionValida(mascara, base, { dx: 0, dy: 0, escala: 9 }, [], W, H)!.escala).toBe(ESCALA_SUJETO.max);
    expect(posicionValida(mascara, base, { dx: 0, dy: 0, escala: 0.1 }, [], W, H)!.escala).toBe(ESCALA_SUJETO.min);
  });
});
