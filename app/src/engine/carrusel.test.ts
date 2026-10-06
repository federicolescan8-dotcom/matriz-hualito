import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import {
  agregarSlide,
  carruselNuevo,
  evaluarCarrusel,
  MAX_SLIDES,
  modoDeSlide,
  moverSlide,
  piezaDeSlide,
  quitarSlide,
} from "./carrusel";
import type { ResultadoChecklist } from "./checklist";
import { CANALES } from "./formatos";
import { secuenciaModo, VARIANTES_HABILITADAS } from "./pieza";

const d = { ...diagnosticoVacio(), nombre: "Test", rubro: "tech" as const };
const marca = construirMarca(d, generarChips(d)[0]);
const ok: ResultadoChecklist = { estado: "ok", controles: [], motivos_revision: [] };

describe("carrusel 4:5", () => {
  it("arranca con portada, tres puntos y cierre", () => {
    const c = carruselNuevo(marca);
    expect(c.slides.map((s) => s.rol)).toEqual(["portada", "contenido", "contenido", "contenido", "cierre"]);
    expect(c.slides.map((s) => s.variante)).toEqual(["2", "P", "P", "P", "1"]);
  });

  it("cada slide es una pieza 4:5; solo el cierre conserva el CTA", () => {
    const c = carruselNuevo(marca);
    c.slides[0].contenido.cta = "No va";
    const piezas = c.slides.map((_, i) => piezaDeSlide(marca, c, i));
    expect(piezas.every((p) => p.formato === "4:5" && p.alineacion === "izquierda")).toBe(true);
    expect(piezas.map((p) => !!p.contenido.cta)).toEqual([false, false, false, false, true]);
    expect(piezas.map((p) => p.carrusel!.punto)).toEqual([undefined, 1, 2, 3, undefined]);
    expect(piezas[2].carrusel).toMatchObject({ indice: 3, total: 5, rol: "contenido" });
  });

  it("portada y cierre en el modo predominante; el contenido en el opuesto", () => {
    const predominante = secuenciaModo(marca)[0];
    expect(modoDeSlide(marca, "portada")).toBe(predominante);
    expect(modoDeSlide(marca, "cierre")).toBe(predominante);
    expect(modoDeSlide(marca, "contenido")).not.toBe(predominante);
  });

  it("agregar, mover y quitar respetan portada primera y cierre último", () => {
    let c = carruselNuevo(marca);
    while (c.slides.length < MAX_SLIDES) c = agregarSlide(c);
    expect(agregarSlide(c).slides.length).toBe(MAX_SLIDES);
    expect(c.slides.at(-1)!.rol).toBe("cierre");
    expect(moverSlide(c, 0, 1)).toBe(c); // la portada no se mueve
    expect(moverSlide(c, 1, -1)).toBe(c); // un punto no pasa delante de la portada
    const movido = moverSlide(c, 1, 1);
    expect(movido.slides[2].id).toBe(c.slides[1].id);
    expect(quitarSlide(c, 0)).toBe(c);
    expect(quitarSlide(c, 1).slides.length).toBe(MAX_SLIDES - 1);
  });

  it("el control del carrusel exige un único CTA en el cierre, portada corta y todos los slides aprobados", () => {
    const c = carruselNuevo(marca);
    expect(evaluarCarrusel(marca, c, c.slides.map(() => ok)).estado).toBe("ok");
    expect(evaluarCarrusel(marca, c, c.slides.map((_, i) => (i === 2 ? undefined : ok))).estado).toBe("rechazado");
    const sinCta = { ...c, slides: c.slides.map((s) => (s.rol === "cierre" ? { ...s, contenido: { ...s.contenido, cta: null } } : s)) };
    expect(evaluarCarrusel(marca, sinCta, c.slides.map(() => ok)).controles.find((k) => k.control.startsWith("Un único CTA"))!.ok).toBe(false);
    const larga = { ...c, slides: c.slides.map((s, i) => (i === 0 ? { ...s, contenido: { ...s.contenido, h1: "uno dos tres cuatro cinco seis siete ocho nueve" } } : s)) };
    expect(evaluarCarrusel(marca, larga, c.slides.map(() => ok)).estado).toBe("rechazado");
  });

  it("la variante Punto no se ofrece en una publicación simple", () => {
    expect(VARIANTES_HABILITADAS).not.toContain("P");
  });
});

describe("canales", () => {
  it("Facebook feed usa 4:5 y 1:1; el 1.91:1 queda para vistas previas de links", () => {
    expect(CANALES.feed_fb.formatos).toEqual(["4:5", "1:1"]);
    expect(CANALES.link.formatos).toEqual(["1200x630"]);
  });
});
