import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { armarPieza, maxPalabrasH1, ORDEN_TIPOS, textoSugerido, TIPOS_CONTENIDO, varianteDeTipo } from "./contenidos";
import { MAX_CONTACTO, PLANTILLAS, variantesDisponibles } from "./pieza";
import type { Rubro } from "./presets";

function marcaDe(rubro: Rubro, contenido?: Partial<ReturnType<typeof diagnosticoVacio>["contenido"]>) {
  const d = { ...diagnosticoVacio(), nombre: "Test", rubro };
  d.contenido = { ...d.contenido, ...contenido };
  return construirMarca(d, generarChips(d)[0]);
}
const RUBROS: Rubro[] = ["servicios", "gastronomia", "belleza", "tech"];
const palabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("tipos de contenido", () => {
  it("están los 7 tipos, cada uno con campos propios", () => {
    expect(ORDEN_TIPOS).toHaveLength(7);
    for (const id of ORDEN_TIPOS) {
      const t = TIPOS_CONTENIDO[id];
      expect(t.id).toBe(id);
      expect(t.nombre && t.descripcion).toBeTruthy();
      expect(t.campos.length).toBeGreaterThanOrEqual(2);
      for (const c of t.campos) {
        expect(c.etiqueta && c.ejemplo).toBeTruthy();
        expect(c.ejemplo.length).toBeLessThanOrEqual(c.max);
      }
    }
    expect(TIPOS_CONTENIDO.tip.carrusel).toBe(true);
    expect(TIPOS_CONTENIDO.evento.campos.map((c) => c.id)).toEqual(["nombre", "fecha", "hora", "lugar"]);
  });

  it.each(RUBROS)("armarPieza produce una pieza válida para cada tipo (%s)", (rubro) => {
    const marca = marcaDe(rubro);
    for (const id of ORDEN_TIPOS) {
      const p = armarPieza(id, textoSugerido(id, marca), marca);
      expect(variantesDisponibles(marca)).toContain(p.variante);
      expect(p.variante).toBe(varianteDeTipo(id, marca));
      expect(p.formato).toBe(TIPOS_CONTENIDO[id].formato);
      expect(p.contenido.h1.length).toBeGreaterThan(0);
      expect(!!p.contenido.cta).toBe(PLANTILLAS[p.variante]!.tieneCta);
      if (PLANTILLAS[p.variante]!.bloque === "contacto") expect(p.contacto!.length).toBeGreaterThanOrEqual(1);
      if (PLANTILLAS[p.variante]!.bloque === "contacto") expect(p.contacto!.length).toBeLessThanOrEqual(MAX_CONTACTO);
    }
  });

  it("los campos van a su lugar", () => {
    const marca = marcaDe("servicios");
    const promo = armarPieza("promocion", { oferta: "2x1 en cortes", vigencia: "Hasta el viernes" }, marca);
    expect(promo.contenido).toMatchObject({ h1: "2x1 en cortes", body: "Hasta el viernes" });
    const test = armarPieza("testimonio", { cita: "Excelente atención", autor: "Ana" }, marca);
    expect(test.contenido).toMatchObject({ h1: "“Excelente atención”", body: "— Ana" });
    const ev = armarPieza("evento", { nombre: "Taller", fecha: "Sábado 3", hora: "18 h", lugar: "Calle 1" }, marca);
    expect(ev.variante).toBe("3");
    expect(ev.contenido).toMatchObject({ h1: "Taller", body: "Sábado 3 · 18 h" });
    expect(ev.contacto).toEqual([{ tipo: "direccion", valor: "Calle 1" }]);
    const ad = armarPieza("antes_despues", { titulo: "Cambio", antes: "Roto", despues: "Nuevo" }, marca);
    expect(ad.variante).toBe("4");
    expect(ad.items!.map((i) => i.texto)).toEqual(["Antes: Roto", "Después: Nuevo"]);
  });

  it("un campo vacío cae al ejemplo del tipo", () => {
    const p = armarPieza("faq", { pregunta: "  " }, marcaDe("tech"));
    expect(p.contenido.h1).toBe(TIPOS_CONTENIDO.faq.campos[0].ejemplo);
  });

  it.each(RUBROS)("el texto sugerido entra en los límites de la variante (%s)", (rubro) => {
    const largo = "Una oferta larguísima de productos artesanales para toda la familia y los amigos";
    const casos = [marcaDe(rubro), marcaDe(rubro, { oferta: [largo], mensaje: largo, apoyo: largo + " " + largo, cta: largo })];
    for (const marca of casos) {
      for (const id of ORDEN_TIPOS) {
        const campos = textoSugerido(id, marca);
        for (const c of TIPOS_CONTENIDO[id].campos) expect(campos[c.id].length, `${id}.${c.id}`).toBeLessThanOrEqual(c.max);
        const p = armarPieza(id, campos, marca);
        expect(palabras(p.contenido.h1), `${id} H1`).toBeLessThanOrEqual(maxPalabrasH1(p.variante));
      }
    }
  });

  it("usa el contenido real del cliente cuando existe", () => {
    const marca = marcaDe("gastronomia", { oferta: ["Empanadas de carne", "Tartas"], mensaje: "Sabor casero", apoyo: "Cocina de barrio desde 1990.", cta: "Pedí ahora" });
    expect(textoSugerido("promocion", marca).oferta).toContain("Empanadas");
    expect(textoSugerido("lanzamiento", marca).novedad).toContain("Empanadas");
    expect(textoSugerido("tip", marca).titulo).toBe("Sabor casero");
    expect(textoSugerido("faq", marca).respuesta).toBe("Cocina de barrio desde 1990.");
    expect(textoSugerido("faq", marca).cta).toBe("Pedí ahora");
    expect(textoSugerido("testimonio", marca).autor).toContain("Test");
  });
});
