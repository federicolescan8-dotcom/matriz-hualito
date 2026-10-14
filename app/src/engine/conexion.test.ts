// Conexión de las variantes nuevas (cap. 6b, E16, paso 6): tipos de contenido, prioritarias del rubro y grilla.
import { describe, expect, it } from "vitest";
import { armarPieza, textoSugerido, TIPOS_CONTENIDO, varianteDeTipo, type CamposContenido } from "./contenidos";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { piezasDeGrilla, secuenciaSinRepetir, varianteSugerida } from "./pieza";
import { PRESETS, type Rubro } from "./presets";

const marcaDe = (rubro: Rubro) => {
  const d = { ...diagnosticoVacio(), nombre: "Test", rubro, personalidad: { tono: "seria" as const, valor: "calma" as const } };
  return construirMarca(d, generarChips(d)[0]);
};
const marca = marcaDe("servicios");

describe("tipos de contenido", () => {
  it("promoción sin Cifra sale en la 2, como antes de E16", () => {
    expect(varianteDeTipo("promocion", marca, textoSugerido("promocion", marca))).toBe("2");
    expect(armarPieza("promocion", textoSugerido("promocion", marca), marca).variante).toBe("2");
  });

  it("promoción con Cifra sale en la 7, con la Cifra en su slot y la oferta en el H1", () => {
    const campos: CamposContenido = { ...textoSugerido("promocion", marca), cifra: "20% OFF" };
    const p = armarPieza("promocion", campos, marca);
    expect(p.variante).toBe("7");
    expect(p.contenido.cifra).toBe("20% OFF");
    expect(p.contenido.h1).toBe(campos.oferta);
    expect(p.contenido.cta).toBeTruthy();
    expect(p.alineacion).toBe("centrado");
  });

  it("la Cifra no se inventa: el campo es opcional y no tiene ejemplo", () => {
    const campo = TIPOS_CONTENIDO.promocion.campos.find((c) => c.id === "cifra")!;
    expect(campo.opcional).toBe(true);
    expect(campo.ejemplo).toBe("");
  });

  it("lanzamiento sale en la 5; tip y pregunta frecuente siguen en la 1 con la 5 de alternativa", () => {
    expect(armarPieza("lanzamiento", textoSugerido("lanzamiento", marca), marca).variante).toBe("5");
    expect(TIPOS_CONTENIDO.tip.variantes).toEqual(["1", "5"]);
    expect(TIPOS_CONTENIDO.faq.variantes).toEqual(["1", "5"]);
    expect(armarPieza("tip", textoSugerido("tip", marca), marca).variante).toBe("1");
  });

  it("testimonio, evento y antes y después no cambian", () => {
    expect(TIPOS_CONTENIDO.testimonio.variantes).toEqual(["2", "1"]);
    expect(TIPOS_CONTENIDO.evento.variantes).toEqual(["3", "1"]);
    expect(TIPOS_CONTENIDO.antes_despues.variantes).toEqual(["4"]);
  });
});

describe("prioritarias del rubro", () => {
  it("la sugerida de cada rubro no cambia y suma una variante nueva en segundo lugar", () => {
    const esperado: Record<string, [string, string]> = { servicios: ["1", "7"], gastronomia: ["4", "6"], belleza: ["2B-L", "6"], tech: ["1", "5"] };
    for (const [rubro, [primera, nueva]] of Object.entries(esperado)) {
      expect(varianteSugerida(rubro as Rubro)).toBe(primera);
      expect(PRESETS[rubro as Rubro].prioritarias[1]).toBe(nueva);
    }
  });
});

describe("grilla sin repetir", () => {
  it("nunca repite la misma variante seguida, tampoco al dar la vuelta", () => {
    for (const rubro of ["servicios", "gastronomia", "belleza", "tech"] as Rubro[]) {
      for (const n of [2, 3, 4, 8, 9, 12]) {
        const v = piezasDeGrilla(marcaDe(rubro), { h1: "Hola", body: "x", cta: "y" }, n).map((p) => p.variante);
        for (let i = 1; i < v.length; i++) expect(v[i]).not.toBe(v[i - 1]);
        if (n > 2) expect(v[n - 1]).not.toBe(v[0]);
      }
    }
  });

  it("corrige la vuelta cuando la rotación cae en la primera", () => {
    const s = secuenciaSinRepetir(["1", "2", "3", "4"], 9);
    expect(s[8]).not.toBe(s[0]);
    expect(s[8]).not.toBe(s[7]);
  });

  it("las piezas de las variantes centradas salen centradas", () => {
    const v = piezasDeGrilla(marca, { h1: "Hola", body: "x", cta: "y" }, 9);
    expect(v.find((p) => p.variante === "7")?.alineacion).toBe("centrado");
  });
});
