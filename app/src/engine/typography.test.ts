import { describe, expect, it } from "vitest";
import { escala, pesoH1, resolverTipografia } from "./typography";

describe("peso del H1 por cantidad de caracteres", () => {
  it("900 hasta 15, 700 desde 45, múltiplos de 50", () => {
    expect(pesoH1("Promo 2x1")).toBe(900);
    expect(pesoH1("x".repeat(15))).toBe(900);
    expect(pesoH1("x".repeat(30))).toBe(800);
    expect(pesoH1("x".repeat(45))).toBe(700);
    expect(pesoH1("x".repeat(90))).toBe(700);
    for (let n = 0; n < 100; n++) expect(pesoH1("x".repeat(n)) % 50).toBe(0);
  });

  it("respeta el peso máximo real de la familia", () => {
    expect(pesoH1("Promo 2x1", "Manrope")).toBe(800);
    expect(pesoH1("Promo 2x1", "Space Grotesk")).toBe(700);
    expect(pesoH1("Promo 2x1", "Inter")).toBe(900);
    expect(pesoH1("x".repeat(30), "Manrope")).toBe(800);
  });
});

describe("familia e itálica", () => {
  it("la pregunta 1 elige la familia dentro del par del rubro", () => {
    expect(resolverTipografia("servicios", "seria").familia_variable).toBe("Inter");
    expect(resolverTipografia("servicios", "cercana").familia_variable).toBe("Manrope");
    expect(resolverTipografia("tech", "cercana").familia_variable).toBe("Space Grotesk");
  });

  it("gastronomía con Sora queda sin itálica; con Fraunces la tiene", () => {
    expect(resolverTipografia("gastronomia", "seria").italic_habilitado).toBe(false);
    expect(resolverTipografia("gastronomia", "cercana").italic_habilitado).toBe(true);
  });

  it("servicios nunca habilita itálica aunque la familia la tenga", () => {
    expect(resolverTipografia("servicios", "seria").italic_habilitado).toBe(false);
  });

  it("la tipografía previa del cliente tiene prioridad si es del sistema", () => {
    const t = resolverTipografia("tech", "seria", "Inter");
    expect(t.familia_variable).toBe("Inter");
    expect(t.previa).toBe(true);
    expect(t.italic_habilitado).toBe(false);
  });
});

describe("escala", () => {
  it("story escala entre 15 y 20% sobre feed", () => {
    const [f] = escala("body", "feed");
    const [s] = escala("body", "story");
    expect(s / f).toBeGreaterThanOrEqual(1.15);
    expect(s / f).toBeLessThanOrEqual(1.2);
  });
});

describe("compensación óptica del texto secundario", () => {
  it("agranda solo las familias de x baja, con tope del 20%", async () => {
    const { compensacionOptica } = await import("./typography");
    expect(compensacionOptica("Newsreader")).toBe(1.2);
    expect(compensacionOptica("Fraunces")).toBe(1.15);
    for (const f of ["Inter", "Manrope", "Sora", "Space Grotesk", "Desconocida"]) expect(compensacionOptica(f)).toBe(1);
  });

  it("la plantilla escala el rango del body según la familia", async () => {
    const { plantillaPara } = await import("./pieza");
    expect(plantillaPara("1", "4:5", "Newsreader").body).toEqual({ min: 31, max: 43 });
    expect(plantillaPara("1", "4:5", "Inter").body).toEqual(plantillaPara("1", "4:5").body);
  });
});


describe("tipografía en par (E3)", () => {
  it("serif con sans funciona; dos serif o dos sans de la misma clase no", async () => {
    const { controlPar } = await import("./typography");
    expect(controlPar("Fraunces", "Inter").ok).toBe(true);
    expect(controlPar("Fraunces", "Fraunces").ok).toBe(true);
    expect(controlPar("Fraunces", "Playfair Display").ok).toBe(false);
    expect(controlPar("Sora", "DM Sans").ok).toBe(false);
    expect(controlPar("Sora", "Manrope").ok).toBe(true);
  });

  it("los pares sugeridos pasan las reglas y para una serif proponen sans primero", async () => {
    const { controlPar, paresSugeridos, CLASE_FAMILIA } = await import("./typography");
    const pares = paresSugeridos("Playfair Display");
    expect(pares.length).toBeGreaterThan(0);
    for (const t of pares) expect(controlPar("Playfair Display", t).ok).toBe(true);
    expect(CLASE_FAMILIA[pares[0]]).not.toBe("serif");
  });

  it("elegir el par fija la familia de texto y la itálica sale de la de texto", async () => {
    const { elegirPar, familiaTexto } = await import("./typography");
    const base = resolverTipografia("belleza", "cercana");
    const conPar = elegirPar(base, "Playfair Display", "Outfit", true);
    expect(familiaTexto(conPar)).toBe("Outfit");
    expect(conPar.italic_habilitado).toBe(false); // Outfit no tiene itálica
    const sinPar = elegirPar(conPar, "Playfair Display", null, true);
    expect(sinPar.familia_texto).toBeUndefined();
    expect(sinPar.italic_habilitado).toBe(true);
  });

});
