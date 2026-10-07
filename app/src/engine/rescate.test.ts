import { describe, expect, it } from "vitest";
import { hexToHsl } from "./color";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { fallasPaleta } from "./palette";
import {
  agruparColores,
  aplicarCanonicos,
  briefRescate,
  colorCanonico,
  conRescate,
  gruposDeReferencias,
  informeAuditoria,
  nombreColor,
} from "./rescate";

const h = (hex: string) => hexToHsl(hex, true)!;
const d = { ...diagnosticoVacio(), nombre: "Rescate", rubro: "gastronomia" as const };
const marca = construirMarca(d, generarChips(d)[0]);

const muestras = [
  { color: h("#2e8b3a"), peso: 0.5, fuente: "logo" },
  { color: h("#33903f"), peso: 0.2, fuente: "instagram" },
  { color: h("#2a8636"), peso: 0.1, fuente: "cartel" },
  { color: h("#c0392b"), peso: 0.3, fuente: "logo" },
];

describe("rescate de marca existente (E11)", () => {
  it("agrupa los tonos cercanos y separa los lejanos", () => {
    const g = agruparColores(muestras);
    expect(g).toHaveLength(2);
    expect(g[0].tonos).toHaveLength(3);
    expect(g[0].fuentes.sort()).toEqual(["cartel", "instagram", "logo"]);
    expect(g[0].peso).toBeCloseTo(0.8);
    expect(g[1].tonos).toHaveLength(1);
    expect(agruparColores(muestras, 0.5)).toHaveLength(4);
  });

  it("junta como un solo tono las muestras idénticas", () => {
    const g = agruparColores([
      { color: h("#2e8b3a"), peso: 0.3, fuente: "a" },
      { color: h("#2e8b3a"), peso: 0.2, fuente: "b" },
    ]);
    expect(g[0].tonos).toHaveLength(1);
    expect(g[0].tonos[0].peso).toBeCloseTo(0.5);
  });

  it("agrupa los colores de varias referencias con su fuente", () => {
    const g = gruposDeReferencias([
      { nombre: "logo.png", colores: [{ color: h("#2e8b3a"), peso: 0.6 }] },
      { nombre: "cartel.png", colores: [{ color: h("#33903f"), peso: 0.4 }] },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].fuentes).toEqual(["logo.png", "cartel.png"]);
  });

  it("el canónico en rescate es el más usado, tal cual", () => {
    const [verde] = agruparColores(muestras);
    expect(colorCanonico(verde, "rescate")).toEqual(h("#2e8b3a"));
    // Un rojo clarísimo que no cumple como marca: en rescate se respeta igual.
    const claro = agruparColores([{ color: h("#ffd0d0"), peso: 1, fuente: "x" }]);
    expect(colorCanonico(claro[0], "rescate", marca.identidad.paleta, "color_marca")).toEqual(h("#ffd0d0"));
  });

  it("en refresco y evolución el canónico cumple los contrastes y queda cerca", () => {
    const claro = agruparColores([{ color: h("#ffd0d0"), peso: 1, fuente: "x" }]);
    for (const grado of ["refresco", "evolucion"] as const) {
      const c = colorCanonico(claro[0], grado, marca.identidad.paleta, "color_marca");
      expect(c).not.toEqual(h("#ffd0d0"));
      const m = aplicarCanonicos(conRescate(marca, { grado }), [{ grupo: claro[0], rol: "color_marca" }]);
      expect(m.identidad.paleta.color_marca).toEqual(c);
      expect(fallasPaleta(m.identidad.paleta, "color_marca")).toHaveLength(0);
    }
  });

  it("nombra los colores por matiz, saturación y luminosidad", () => {
    const n = (x: string) => nombreColor(h(x));
    expect(n("#2e8b3a")).toBe("verde");
    expect(n("#c0392b")).toBe("rojo");
    expect(n("#1e5bd8")).toBe("azul");
    expect(n("#f5a623")).toBe("naranja");
    expect(n("#808080")).toBe("gris");
    expect(n("#fafafa")).toBe("blanco");
    expect(n("#0a0a0a")).toBe("negro");
  });

  it("el informe dice en cuántos tonos aparece cada color", () => {
    const frases = informeAuditoria(agruparColores(muestras));
    expect(frases[0]).toContain("Tu verde aparece en 3 tonos");
    expect(frases[1]).toContain("Tu rojo aparece en un solo tono");
  });

  it("aplica los canónicos a la paleta y a la extendida, y en rescate queda como ajuste manual", () => {
    const [verde, rojo] = agruparColores(muestras);
    const m = aplicarCanonicos(marca, [
      { grupo: verde, rol: "color_marca" },
      { grupo: rojo, rol: "secundario_2" },
    ]);
    expect(m.identidad.paleta.color_marca).toEqual(h("#2e8b3a"));
    expect(m.identidad.ajustes_manuales).toContain("color_marca");
    expect(m.identidad.paleta_extendida?.secundarios[1].color).toEqual(h("#c0392b"));
    expect(m.identidad.paleta_extendida?.secundarios).toHaveLength(2);
  });

  it("el brief de rescate suma grado, canónicos y la regla del refresco al del logo", () => {
    const [verde] = agruparColores(muestras);
    const m = conRescate(marca, { grado: "refresco", grupos: [verde], referencias: [{ nombre: "logo.png", colores: [] }] });
    const b = briefRescate(m);
    expect(b).toContain("# Brief de logo");
    expect(b).toContain("Refresco");
    expect(b).toContain("#2E8B3A");
    expect(b).toContain("el mismo, pero más prolijo");
    expect(briefRescate(marca)).toContain("Sin auditoría de color todavía");
  });
});

