import { describe, expect, it } from "vitest";
import { BIBLIOTECA_RUBRO, FORMAS, formasDelRubro, rellenosDisponibles, TODOS_LOS_ICONOS } from "./biblioteca";
import { evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { decoEfectiva, maxIconos, maxItems, piezaNueva, type Pieza } from "./pieza";
import { RUBROS } from "./presets";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), rubro: "gastronomia" as const, nombre: "Test", personalidad: { tono: "cercana" as const, valor: "energia" as const } };
const marca = construirMarca(d, generarChips(d)[0]);

describe("biblioteca", () => {
  it("es un set cerrado y chico: 15-20 formas, 40-60 íconos", () => {
    expect(FORMAS.length).toBeGreaterThanOrEqual(15);
    expect(FORMAS.length).toBeLessThanOrEqual(20);
    expect(TODOS_LOS_ICONOS.length).toBeGreaterThanOrEqual(40);
    expect(TODOS_LOS_ICONOS.length).toBeLessThanOrEqual(60);
    expect(new Set(TODOS_LOS_ICONOS).size).toBe(TODOS_LOS_ICONOS.length);
  });

  it("cada rubro habilita formas, contenedores y formas decorativas que existen y recortan", () => {
    for (const r of RUBROS) {
      expect(formasDelRubro(r).length).toBeGreaterThan(0);
      for (const id of [...BIBLIOTECA_RUBRO[r].contenedores, ...BIBLIOTECA_RUBRO[r].formasDeco]) {
        expect(FORMAS.find((f) => f.id === id)?.contiene).toBe(true);
      }
    }
  });

  it("la foto solo se ofrece si la marca tiene fotos propias", () => {
    expect(rellenosDisponibles("gastronomia", false)).not.toContain("foto");
    expect(rellenosDisponibles("gastronomia", true)).toContain("foto");
  });
});

describe("capa decorativa efectiva", () => {
  it("sin fotos, gastronomía sangra un semicírculo relleno con su patrón (puntos)", () => {
    expect(decoEfectiva(marca, { ...piezaNueva(marca), variante: "2B-L" })).toMatchObject({ forma: "circulo", relleno: "patron", patron: "puntos" });
  });

  it("foto pedida sin foto cargada: se queda en el modo imagen con un ícono, siempre en círculo en el 2B-L", () => {
    const conFotos = { ...marca, identidad: { ...marca.identidad, fotos_habilitadas: true } };
    const p = { ...piezaNueva(conFotos), variante: "2B-L" as const, deco: { forma: "sello", relleno: "foto" as const, foto: null } };
    expect(decoEfectiva(conFotos, p)).toMatchObject({ forma: "circulo", relleno: "icono" });
    const conFoto = { ...p, deco: { ...p.deco, foto: "data:image/png;base64,AAAA" } };
    expect(decoEfectiva(conFotos, conFoto)).toMatchObject({ forma: "circulo", relleno: "foto" });
    // Figura y patrón conserva la forma elegida.
    expect(decoEfectiva(conFotos, { ...p, deco: { ...p.deco, relleno: "patron" as const } })).toMatchObject({ forma: "sello", relleno: "patron" });
  });

  it("2B-L con imagen: círculo del 80% del ancho desde el centro, centrado en alto", async () => {
    const { geometria2BLImagen } = await import("./pieza");
    const g = geometria2BLImagen("4:5");
    // En 4:5 el bloque del mensaje va del borde superior al inferior del círculo.
    expect(g).toMatchObject({ diametro: 864, izquierda: 540, arriba: 243, textoArriba: 243, logoAbajo: 243 + 864 });
    const s = geometria2BLImagen("9:16");
    expect(s.diametro).toBe(864);
    // Centrado en la zona segura del 9:16 (15% arriba, 20% abajo), no en el lienzo.
    expect(s.arriba).toBeCloseTo(288 + (1536 - 288 - 864) / 2);
    expect(s.textoArriba).toBeCloseTo(s.arriba - 1920 * 0.08);
    expect(s.logoAbajo).toBeCloseTo(s.arriba + 864 + 1920 * 0.08);
    // Si hace falta lugar para el H1, el círculo puede arrancar en el 60%; en 1:1 arranca siempre ahí.
    expect(g.posiciones).toEqual([540, 648]);
    expect(geometria2BLImagen("1:1").posiciones).toEqual([648]);
  });

  it("una forma o un patrón que el rubro no habilita se reemplazan por los del rubro", () => {
    const p = { ...piezaNueva(marca), variante: "2B-L" as const, deco: { forma: "blob-1", relleno: "patron" as const, patron: "grilla" as const } };
    expect(decoEfectiva(marca, p)).toMatchObject({ forma: "circulo", patron: "puntos" });
  });

  it("límites de íconos e ítems por variante y formato", () => {
    expect(maxIconos("2B-L", 0)).toBe(2);
    expect(maxIconos("3", 0)).toBe(4);
    expect(maxIconos("4", 3)).toBe(3);
    expect(maxItems("1:1")).toBe(3);
    expect(maxItems("4:5")).toBe(4);
  });
});

describe("checklist de elementos gráficos", () => {
  const h1 = "Llegó el menú de otoño";
  const base = (p: Partial<Pieza>): Pieza => ({ ...piezaNueva(marca), modo: "A", contenido: { h1, body: "Apoyo.", cta: "Reservá" }, ...p });
  const med = (m: Partial<Medicion>): Medicion => ({
    h1: { lineas: [{ x: 119, y: 400, w: 400, h: 100 }], px: 100, peso: pesoH1(h1, marca.identidad.tipografia.familia_variable), italica: false },
    body: { lineas: [{ x: 119, y: 520, w: 300, h: 40 }], px: 30, peso: 400, italica: false },
    cta: { lineas: [], caja: { x: 119, y: 1000, w: 300, h: 80 }, px: 32, peso: 600, italica: false },
    logo: { x: 119, y: 1100, w: 250, h: 90 },
    forma: null,
    desborde: false,
    iconos: 0,
    ...m,
  });
  const falla = (r: ReturnType<typeof evaluarPieza>, control: string) => r.controles.find((c) => c.control.startsWith(control))?.ok === false;

  it("2B: la capa decorativa no puede tapar el texto", () => {
    const deco = { tipo: "patron" as const, caja: { x: 300, y: 380, w: 400, h: 400 }, opacidad: 1, overlay: null, color: marca.identidad.paleta.tono_apoyo };
    expect(falla(evaluarPieza(marca, base({ variante: "2B-L" }), med({ deco })), "Capa decorativa sin tapar")).toBe(true);
    const aparte = { ...deco, caja: { x: 600, y: 380, w: 340, h: 340 } };
    expect(falla(evaluarPieza(marca, base({ variante: "2B-L" }), med({ deco: aparte })), "Capa decorativa sin tapar")).toBe(false);
  });

  it("2B: el ícono decorativo va al 15-25% y nunca en color de marca", () => {
    const deco = { tipo: "icono" as const, caja: { x: 600, y: 380, w: 340, h: 340 }, opacidad: 0.6, overlay: null, color: marca.identidad.paleta.color_marca };
    const r = evaluarPieza(marca, base({ variante: "2B-L" }), med({ deco, iconos: 1 }));
    expect(falla(r, "Ícono decorativo al 15-25%")).toBe(true);
    expect(falla(r, "Ícono decorativo en tono de apoyo")).toBe(true);
  });

  it("3: el ícono de contacto va a la izquierda del dato", () => {
    const texto = { lineas: [{ x: 119, y: 700, w: 300, h: 40 }], px: 30, peso: 400, italica: false };
    const bien = [{ icono: { x: 119 - 60, y: 700, w: 44, h: 44 }, texto }];
    const mal = [{ icono: { x: 450, y: 700, w: 44, h: 44 }, texto }];
    const p = base({ variante: "3", contenido: { h1, body: "Apoyo.", cta: null } });
    expect(falla(evaluarPieza(marca, p, med({ contacto: bien, cta: null, iconos: 1 })), "Ícono a la izquierda")).toBe(false);
    expect(falla(evaluarPieza(marca, p, med({ contacto: mal, cta: null, iconos: 1 })), "Ícono a la izquierda")).toBe(true);
  });

  it("4: exige al menos 2 ítems y como máximo 1 ícono por ítem", () => {
    const item = { visual: { x: 119, y: 700, w: 200, h: 200 }, tieneVisual: true, texto: { lineas: [{ x: 130, y: 920, w: 180, h: 36 }], px: 28, peso: 400, italica: false } };
    const p = base({ variante: "4" });
    const r = evaluarPieza(marca, p, med({ items: [item], iconos: 1 }));
    expect(falla(r, "Ítems de catálogo")).toBe(true);
    const r2 = evaluarPieza(marca, p, med({ items: [item, { ...item, visual: { ...item.visual, x: 360 } }], iconos: 3 }));
    expect(falla(r2, "Íconos por pieza")).toBe(true);
  });
});
