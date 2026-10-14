import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { FORMATOS, type Formato } from "./formatos";
import { piezaNueva, piezasDeGrilla, plantillaPara, variantesDisponibles, type Pieza } from "./pieza";
import {
  AMPLITUD_ONDA,
  bloqueTitular,
  contener,
  esProtagonista,
  geometriaBanda,
  geometriaProducto,
  usaFotoFondo,
  VARIANTES_PROTAGONISTA,
  type Caja,
} from "./protagonista";
import { bloqueTexto } from "./fotografia";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const base = construirMarca(d, generarChips(d)[0]);
const conFotos = { ...base, identidad: { ...base.identidad, fotos_habilitadas: true } };
const sinFotos = { ...base, identidad: { ...base.identidad, fotos_habilitadas: false } };
const FORMATOS_TODOS = Object.keys(FORMATOS) as Formato[];

/** La caja queda dentro de la zona segura del formato (con medio px de tolerancia). */
function dentroDeZona(c: Caja, formato: Formato): boolean {
  const f = FORMATOS[formato];
  return (
    c.x >= f.ancho * f.zona.x - 0.5 &&
    c.y >= f.alto * f.zona.arriba - 0.5 &&
    c.x + c.w <= f.ancho * (1 - f.zona.x) + 0.5 &&
    c.y + c.h <= f.alto * (1 - f.zona.abajo) + 0.5
  );
}
const seTocan = (a: Caja, b: Caja) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("variantes con imagen protagonista", () => {
  it("FP, FT y FB son protagonistas y, como la F, piden foto propia", () => {
    expect(VARIANTES_PROTAGONISTA).toEqual(["FP", "FT", "FB"]);
    for (const v of VARIANTES_PROTAGONISTA) expect([esProtagonista(v), usaFotoFondo(v)]).toEqual([true, true]);
    expect([esProtagonista("F"), usaFotoFondo("F")]).toEqual([false, true]);
    expect(usaFotoFondo("1")).toBe(false);
  });

  it("solo se ofrecen con fotos habilitadas y no entran en la grilla de muestra", () => {
    expect(variantesDisponibles(conFotos)).toEqual(expect.arrayContaining(["F", "FP", "FT", "FB"]));
    expect(variantesDisponibles(sinFotos).some(usaFotoFondo)).toBe(false);
    const grilla = piezasDeGrilla(conFotos, { h1: "Hola", body: null, cta: null });
    expect(grilla.some((p) => usaFotoFondo(p.variante))).toBe(false);
  });

  it("el H1 puede crecer mucho más que en la F (la cifra de oferta es el titular)", () => {
    for (const v of VARIANTES_PROTAGONISTA) {
      expect(plantillaPara(v, "4:5").h1.max).toBeGreaterThan(plantillaPara("F", "4:5").h1.max);
      expect(plantillaPara(v, "4:5").h1.maxLineas).toBe(2);
    }
  });
});

describe("FP · producto héroe", () => {
  it("mensaje, producto y pie dentro de la zona segura y sin pisarse, en todos los formatos", () => {
    for (const formato of FORMATOS_TODOS) {
      for (const lado of ["arriba", "abajo"] as const) {
        const g = geometriaProducto(formato, lado, 90, 40);
        for (const c of [g.mensaje, g.producto, g.pie]) expect(dentroDeZona(c, formato)).toBe(true);
        expect(seTocan(g.mensaje, g.producto)).toBe(false);
        expect(seTocan(g.producto, g.pie)).toBe(false);
        expect(seTocan(g.mensaje, g.pie)).toBe(false);
      }
    }
  });

  it("en vertical el producto es lo más grande de la pieza y el mensaje cambia de lado", () => {
    const arriba = geometriaProducto("4:5", "arriba", 90, 40);
    expect(arriba.producto.h).toBeGreaterThan(arriba.mensaje.h * 1.5);
    expect(arriba.mensaje.y).toBeLessThan(arriba.producto.y);
    const abajo = geometriaProducto("4:5", "abajo", 90, 40);
    expect(abajo.mensaje.y).toBeGreaterThan(abajo.producto.y);
  });

  it("en 1200×630 el mensaje va en la columna izquierda y el producto a la derecha", () => {
    const g = geometriaProducto("1200x630", "arriba", 70, 24);
    expect(g.mensaje.x + g.mensaje.w).toBeLessThanOrEqual(600 + 0.5);
    expect(g.producto.x).toBeGreaterThan(600);
  });

  it("el producto se ve entero y centrado en su caja (contain)", () => {
    const caja = { x: 100, y: 200, w: 800, h: 600 };
    const alto = contener({ w: 500, h: 1000 }, caja);
    expect(alto).toEqual({ x: 350, y: 200, w: 300, h: 600 });
    const ancho = contener({ w: 2000, h: 500 }, caja);
    expect(ancho).toEqual({ x: 100, y: 400, w: 800, h: 200 });
  });
});

describe("FT · titular sobre foto", () => {
  it("el bloque del titular es más chico que el de la F: la foto se ve más", () => {
    const f = FORMATOS["4:5"];
    const titular = bloqueTitular("4:5", "abajo");
    const textoF = bloqueTexto(f, "abajo");
    expect(titular.h).toBeLessThan(textoF.h);
    expect(titular.y + titular.h).toBeCloseTo(textoF.y + textoF.h);
    expect(dentroDeZona(titular, "4:5")).toBe(true);
  });
});

describe("FB · foto con banda", () => {
  it("el texto va siempre sobre la banda, debajo del punto más bajo del borde y dentro de la zona segura", () => {
    for (const formato of FORMATOS_TODOS.filter((fm) => !FORMATOS[fm].columnaMensaje)) {
      for (const borde of ["recto", "onda"] as const) {
        const g = geometriaBanda(formato, borde, 40);
        const masBajo = Math.max(...g.borde.map((p) => p.y));
        expect(g.texto.y).toBeGreaterThanOrEqual(masBajo + 40 - 0.5);
        expect(dentroDeZona(g.texto, formato)).toBe(true);
        // La foto pasa por debajo de todo el borde: no queda hueco en los valles.
        expect(g.foto.y + g.foto.h).toBeGreaterThanOrEqual(masBajo - 0.5);
      }
    }
  });

  it("recto es una línea; la onda es una sola onda con la amplitud del manual", () => {
    const recto = geometriaBanda("4:5", "recto", 40);
    expect(new Set(recto.borde.map((p) => p.y)).size).toBe(1);
    const onda = geometriaBanda("4:5", "onda", 40);
    const ys = onda.borde.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2 * 1350 * AMPLITUD_ONDA, 0);
    // Un solo período: el borde cruza el corte en el centro y termina donde empezó.
    expect(ys[0]).toBeCloseTo(ys[ys.length - 1], 0);
    expect(onda.path.startsWith("M0 1350")).toBe(true);
  });

  it("en 1200×630 la banda es la columna izquierda y el texto no pasa la mitad", () => {
    const g = geometriaBanda("1200x630", "onda", 24);
    const masIzq = Math.min(...g.borde.map((p) => p.x));
    expect(g.texto.x + g.texto.w).toBeLessThanOrEqual(Math.min(600, masIzq - 24) + 0.5);
    expect(g.foto.x).toBeLessThanOrEqual(masIzq);
  });
});

describe("checklist de imagen protagonista", () => {
  function pieza(p: Partial<Pieza> = {}): Pieza {
    return {
      ...piezaNueva(conFotos),
      variante: "FP",
      modo: "A",
      contenido: { h1: "25% OFF", body: "Pidiendo un cuarto kilo.", cta: "Pedí ahora" },
      foto_fondo: "data:image/png;base64,xx",
      foto_recortada: true,
      ...p,
    };
  }
  function medicion(m: Partial<Medicion> = {}): Medicion {
    return {
      h1: { lineas: [{ x: 119, y: 150, w: 600, h: 190 }], px: 180, peso: pesoH1("25% OFF", conFotos.identidad.tipografia.familia_variable), italica: false },
      body: { lineas: [{ x: 119, y: 360, w: 500, h: 44 }], px: 32, peso: 400, italica: false },
      cta: { lineas: [], caja: { x: 119, y: 1110, w: 340, h: 88 }, px: 32, peso: 600, italica: false },
      logo: { x: 760, y: 1120, w: 200, h: 70 },
      forma: null,
      desborde: false,
      producto: { x: 200, y: 460, w: 680, h: 600 },
      ...m,
    };
  }
  const ctl = (pz: Pieza, m: Medicion, nombre: string) => evaluarPieza(conFotos, pz, m).controles.find((c) => c.control.startsWith(nombre));

  it("un producto héroe correcto pasa los controles nuevos", () => {
    expect(ctl(pieza(), medicion(), "Foto protagonista cargada")?.ok).toBe(true);
    expect(ctl(pieza(), medicion(), "Producto recortado")?.ok).toBe(true);
    expect(ctl(pieza(), medicion(), "Producto sin tapar")?.ok).toBe(true);
    expect(ctl(pieza(), medicion(), "Fotos dentro de una forma")?.ok).toBe(true);
  });

  it("sin foto la variante protagonista no se exporta (bloqueante)", () => {
    for (const variante of VARIANTES_PROTAGONISTA) {
      const c = ctl(pieza({ variante, foto_fondo: null }), medicion({ producto: null }), "Foto protagonista cargada")!;
      expect([c.ok, c.nivel]).toEqual([false, "bloqueante"]);
    }
    // Con las fotos deshabilitadas en la marca, la foto cargada no cuenta.
    const r = evaluarPieza(sinFotos, pieza(), medicion());
    expect(r.controles.find((c) => c.control === "Foto protagonista cargada")?.ok).toBe(false);
  });

  it("un producto con fondo (sin transparencia) es un aviso", () => {
    const c = ctl(pieza({ foto_recortada: false }), medicion(), "Producto recortado")!;
    expect([c.ok, c.nivel]).toEqual([false, "aviso"]);
    expect(ctl(pieza({ variante: "FT", foto_recortada: false }), medicion({ producto: null }), "Producto recortado")).toBeUndefined();
  });

  it("el producto que pisa el texto o el logo es bloqueante", () => {
    const c = ctl(pieza(), medicion({ producto: { x: 200, y: 300, w: 680, h: 760 } }), "Producto sin tapar")!;
    expect([c.ok, c.nivel]).toEqual([false, "bloqueante"]);
    expect(c.detalle).toContain("body");
  });
});
