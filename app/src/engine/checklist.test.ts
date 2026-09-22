import { describe, expect, it } from "vitest";
import { areaCubierta, evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { piezaNueva, type Pieza } from "./pieza";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);

function pieza(p: Partial<Pieza> = {}): Pieza {
  return {
    ...piezaNueva(marca),
    variante: "1",
    modo: "A",
    contenido: { h1: "Tu contabilidad, en orden", body: "Asesoramiento para pymes.", cta: "Agendá una consulta" },
    ...p,
  };
}

// Medición típica de la variante 1 en 4:5, todo dentro de la zona segura (margen 11%).
function medicion(m: Partial<Medicion> = {}): Medicion {
  return {
    h1: { lineas: [{ x: 119, y: 420, w: 700, h: 110 }, { x: 119, y: 530, w: 400, h: 110 }], px: 100, peso: pesoH1("Tu contabilidad, en orden", marca.tipografia.familia_variable), italica: false },
    body: { lineas: [{ x: 119, y: 680, w: 650, h: 44 }], px: 32, peso: 400, italica: false },
    cta: { lineas: [], caja: { x: 119, y: 1100, w: 380, h: 90 }, px: 34, peso: 600, italica: false },
    logo: { x: 119, y: 149, w: 300, h: 110 },
    forma: null,
    desborde: false,
    ...m,
  };
}

describe("checklist de pieza", () => {
  it("una pieza correcta pasa todos los controles", () => {
    const r = evaluarPieza(marca, pieza(), medicion());
    expect(r.controles.filter((c) => !c.ok)).toEqual([]);
    expect(r.estado).toBe("ok");
  });

  it("rechaza contenido fuera de la zona segura", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ logo: { x: 40, y: 40, w: 300, h: 110 } }));
    expect(r.estado).toBe("rechazado");
    expect(r.controles.find((c) => c.control === "Logo dentro del margen seguro")!.ok).toBe(false);
  });

  it("rechaza un peso de H1 distinto al de la fórmula", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, peso: 900 } }));
    expect(r.controles.find((c) => c.control === "Peso del H1 según largo")!.ok).toBe(false);
  });

  it("rechaza poco espacio negativo", () => {
    const lleno = Array.from({ length: 15 }, (_, i) => ({ x: 0, y: i * 90, w: 1080, h: 90 }));
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, lineas: lleno } }));
    expect(r.controles.find((c) => c.control === "Espacio negativo")!.ok).toBe(false);
  });

  it("rechaza itálica en el H1 y alineación centrada en la variante 1", () => {
    const r = evaluarPieza(marca, pieza({ alineacion: "centrado" }), medicion({ h1: { ...medicion().h1, italica: true } }));
    const fallidos = r.controles.filter((c) => !c.ok).map((c) => c.control);
    expect(fallidos).toContain("Itálica nunca en H1");
    expect(fallidos).toContain("Alineación del mensaje");
  });

  it("el desborde de texto eleva a revisión manual", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ desborde: true }));
    expect(r.estado).toBe("revision_manual");
  });

  it("la variante 2 no lleva CTA", () => {
    const r = evaluarPieza(marca, pieza({ variante: "2" }), medicion());
    expect(r.estado).toBe("rechazado");
    expect(r.controles.find((c) => c.control === "Variante sin CTA")!.ok).toBe(false);
  });
});

describe("areaCubierta", () => {
  it("mide la fracción cubierta sin contar dos veces las superposiciones", () => {
    const a = { x: 0, y: 0, w: 60, h: 60 };
    expect(areaCubierta([a], 120, 120)).toBeCloseTo(0.25, 2);
    expect(areaCubierta([a, a], 120, 120)).toBeCloseTo(0.25, 2);
  });
});

describe("CTA en Modo A", () => {
  it("un acento claro sobre fondo neutro claro lleva contorno y pasa", async () => {
    const { ctaModoA, controlesCtaModoA, cumple } = await import("./palette");
    const p = marca.paleta;
    const r = evaluarPieza(marca, pieza(), medicion());
    const modo = ctaModoA(p);
    expect(cumple(controlesCtaModoA(p, modo))).toBe(true);
    expect(r.controles.filter((c) => c.control.startsWith("CTA")).every((c) => c.ok)).toBe(true);
  });
});
