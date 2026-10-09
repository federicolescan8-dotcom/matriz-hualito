import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { armarPieza, maxPalabrasH1, ORDEN_TIPOS, textoSugerido, TIPOS_CONTENIDO, varianteDeTipo } from "./contenidos";
import { MAX_CONTACTO, PLANTILLAS, variantesDisponibles } from "./pieza";
import { objetivosDe } from "./marketing";
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
        expect(c.etiqueta).toBeTruthy();
        // Los campos opcionales (el CTA de promoción y evento, cap. 7b) no tienen ejemplo de respaldo.
        expect(!!c.ejemplo).toBe(!c.opcional);
        expect(c.ejemplo.length).toBeLessThanOrEqual(c.max);
      }
    }
    expect(TIPOS_CONTENIDO.tip.carrusel).toBe(true);
    expect(TIPOS_CONTENIDO.evento.campos.map((c) => c.id)).toEqual(["nombre", "fecha", "hora", "lugar", "cta"]);
  });

  it.each(RUBROS)("armarPieza produce una pieza válida para cada tipo (%s)", (rubro) => {
    const marca = marcaDe(rubro);
    for (const id of ORDEN_TIPOS) {
      const p = armarPieza(id, textoSugerido(id, marca), marca);
      expect(variantesDisponibles(marca)).toContain(p.variante);
      expect(p.variante).toBe(varianteDeTipo(id, marca));
      expect(p.formato).toBe(TIPOS_CONTENIDO[id].formato);
      expect(p.contenido.h1.length).toBeGreaterThan(0);
      // armarPieza no cambió con E15: el CTA sale solo en las variantes que lo esperan.
      expect(!!p.contenido.cta).toBe(PLANTILLAS[p.variante]!.politicaCta === "si");
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

// Objetivo de marketing (cap. 7b, E15).
describe("armarPieza con objetivo", () => {
  const marca = marcaDe("servicios");
  const conCta = marcaDe("servicios", { cta: "Pedí turno" });

  it("promoción y evento salen con CTA aunque su variante (2 y 3) lo tenga opcional", () => {
    const promo = armarPieza("promocion", textoSugerido("promocion", marca, "vender"), marca, "vender");
    expect(promo.variante).toBe("2");
    expect(promo.objetivo).toBe("vender");
    expect(promo.contenido.cta).toBe("Aprovechala");
    const evento = armarPieza("evento", textoSugerido("evento", marca, "evento"), marca, "evento");
    expect(evento.variante).toBe("3");
    expect(evento.contenido.cta).toBe("Sumate");
    expect(armarPieza("promocion", {}, marca, "consultas").contenido.cta).toBe("Escribinos");
  });

  it("prioridad del CTA: lo escrito a mano > el diagnóstico > el objetivo", () => {
    expect(armarPieza("promocion", {}, conCta, "vender").contenido.cta).toBe("Pedí turno");
    expect(textoSugerido("promocion", conCta, "vender").cta).toBe("Pedí turno");
    expect(textoSugerido("promocion", marca, "vender").cta).toBe("Aprovechala");
    for (const objetivo of ["vender", "consultas"] as const) {
      expect(armarPieza("promocion", { cta: "Reservá el tuyo" }, conCta, objetivo).contenido.cta).toBe("Reservá el tuyo");
    }
    expect(armarPieza("evento", { cta: "Anotate" }, conCta, "evento").contenido.cta).toBe("Anotate");
  });

  it("lo escrito a mano va también sin objetivo, si la variante admite CTA", () => {
    expect(armarPieza("promocion", { cta: "Reservá el tuyo" }, marca).contenido.cta).toBe("Reservá el tuyo");
    expect(armarPieza("evento", { cta: "Anotate" }, marca).contenido.cta).toBe("Anotate");
    expect(armarPieza("promocion", {}, marca).contenido.cta).toBeNull();
  });

  it("construir confianza no propone CTA, ni siquiera con uno en el diagnóstico", () => {
    const t = armarPieza("testimonio", textoSugerido("testimonio", conCta, "confianza"), conCta, "confianza");
    expect(t.objetivo).toBe("confianza");
    expect(t.contenido.cta).toBeNull();
  });

  it("educar deja el CTA opcional: precargado con el del objetivo, y vacío si se borra", () => {
    expect(textoSugerido("tip", marca, "educar").cta).toBe("Guardalo");
    expect(armarPieza("tip", textoSugerido("tip", marca, "educar"), marca, "educar").contenido.cta).toBe("Guardalo");
    expect(armarPieza("tip", { ...textoSugerido("tip", marca, "educar"), cta: "" }, marca, "educar").contenido.cta).toBeNull();
  });

  it("el objetivo no cambia la variante del tipo", () => {
    for (const id of ORDEN_TIPOS) {
      for (const objetivo of objetivosDe(id)) {
        expect(armarPieza(id, textoSugerido(id, marca, objetivo), marca, objetivo).variante).toBe(varianteDeTipo(id, marca));
      }
    }
  });
});
