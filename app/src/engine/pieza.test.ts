import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { admiteCta, piezasDeGrilla, PLANTILLAS } from "./pieza";

// Política de CTA por variante (cap. 7b, E15).
describe("política de CTA", () => {
  it("1, 2B, 4 y F lo esperan; 2 y 3 lo admiten como opcional; P no lo lleva", () => {
    expect(PLANTILLAS["1"]!.politicaCta).toBe("si");
    expect(PLANTILLAS["2B-L"]!.politicaCta).toBe("si");
    expect(PLANTILLAS["2B-S"]!.politicaCta).toBe("si");
    expect(PLANTILLAS["4"]!.politicaCta).toBe("si");
    expect(PLANTILLAS.F!.politicaCta).toBe("si");
    expect(PLANTILLAS["2"]!.politicaCta).toBe("opcional");
    expect(PLANTILLAS["3"]!.politicaCta).toBe("opcional");
    expect(PLANTILLAS.P!.politicaCta).toBe("no");
    expect(admiteCta("2")).toBe(true);
    expect(admiteCta("3")).toBe(true);
    expect(admiteCta("P")).toBe(false);
  });

  it("en el orden de 2 con CTA, el CTA va justo antes del logo, como en la 2B", () => {
    // El orden declarado de la 2 sigue sin CTA: el CTA opcional se intercala antes del logo solo si tiene texto.
    expect(PLANTILLAS["2"]!.orden).toEqual(["H1", "body", "logo"]);
    expect(PLANTILLAS["2B-L"]!.orden.slice(-2)).toEqual(["cta", "logo"]);
  });

  it("la grilla del feed sigue mostrando 2 y 3 sin CTA", () => {
    const d = { ...diagnosticoVacio(), nombre: "Prueba", rubro: "servicios" as const };
    const marca = construirMarca(d, generarChips(d)[0]);
    const grilla = piezasDeGrilla(marca, { h1: "Un mensaje", body: "Un dato de apoyo", cta: "Escribinos" });
    for (const p of grilla) expect(!!p.contenido.cta).toBe(PLANTILLAS[p.variante]!.politicaCta === "si");
    expect(grilla.some((p) => p.variante === "2" || p.variante === "3")).toBe(true);
  });
});
