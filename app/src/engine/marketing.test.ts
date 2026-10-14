import fs from "fs";
import { describe, expect, it } from "vitest";
import { ORDEN_TIPOS, TIPOS_CONTENIDO } from "./contenidos";
import { admiteObjetivo, bloquesDeTexto, ctaHablaAlLector, ctaPorDefecto, esImperativo, MAX_BLOQUES_TEXTO, tieneOferta, tieneVigencia, OBJETIVOS, OBJETIVOS_DE_TIPO, objetivoPorDefecto, objetivosDe, ordenDeLectura } from "./marketing";
import { PLANTILLAS } from "./pieza";

// Tabla de objetivos (cap. 7b, E15).
describe("objetivos de marketing", () => {
  it("cada uno de los 7 tipos tiene al menos un objetivo, sin repetidos, y el default es el primero", () => {
    expect(Object.keys(OBJETIVOS_DE_TIPO).sort()).toEqual([...ORDEN_TIPOS].sort());
    for (const tipo of ORDEN_TIPOS) {
      const lista = objetivosDe(tipo);
      expect(lista.length).toBeGreaterThan(0);
      expect(new Set(lista).size).toBe(lista.length);
      expect(objetivoPorDefecto(tipo)).toBe(lista[0]);
    }
  });

  it("testimonio, evento y antes y después admiten un solo objetivo", () => {
    expect(objetivosDe("testimonio")).toEqual(["confianza"]);
    expect(objetivosDe("evento")).toEqual(["evento"]);
    expect(objetivosDe("antes_despues")).toEqual(["consultas"]);
    expect(admiteObjetivo("testimonio", "vender")).toBe(false);
    expect(admiteObjetivo("promocion", "consultas")).toBe(true);
  });

  it("las variantes de cada tipo admiten la política de CTA de su objetivo por defecto", () => {
    for (const tipo of ORDEN_TIPOS) {
      const politica = OBJETIVOS[objetivoPorDefecto(tipo)].politicaCta;
      for (const v of TIPOS_CONTENIDO[tipo].variantes) {
        const deVariante = PLANTILLAS[v]!.politicaCta;
        // Con CTA requerido la variante tiene que poder dibujarlo; con "ninguno" cualquiera sirve (no se completa).
        if (politica === "requerido") expect(deVariante, `${tipo} en variante ${v}`).not.toBe("no");
      }
    }
  });

  it("solo los objetivos con CTA requerido u opcional proponen un CTA por defecto", () => {
    for (const o of Object.values(OBJETIVOS)) {
      expect(ctaPorDefecto(o.id) === null).toBe(o.politicaCta === "ninguno");
    }
    expect(ctaPorDefecto("vender")).toBe("Aprovechala");
    expect(ctaPorDefecto("evento")).toBe("Sumate");
    expect(ordenDeLectura("vender")).toBe("oferta → beneficio → vigencia → CTA");
  });

  it("el módulo es puro: sin React, sin DOM y sin importar valores de contenidos ni del checklist", () => {
    const fuente = fs.readFileSync(new URL("./marketing.ts", import.meta.url), "utf8");
    const imports = fuente.split("\n").filter((l) => l.startsWith("import"));
    for (const l of imports) expect(l).toMatch(/^import type /);
    expect(fuente).not.toMatch(/react|document\.|window\./i);
  });
});

// Heurísticas de texto (cap. 7b, paso 7). Son aproximaciones: los falsos resultados conocidos quedan documentados acá.
describe("heurísticas de marketing", () => {
  it("el CTA le habla al lector: imperativo con voseo o segunda persona", () => {
    for (const cta of ["Pedí turno", "Tu lugar te espera", "Aprovechala", "Escribinos", "Guardalo", "Sumate", "Conocé más", "Reservá tu mesa", "Agendá una consulta", "¡Vení a probarlo!", "Dale, escribinos"]) {
      expect(ctaHablaAlLector(cta), cta).toBe(true);
    }
    for (const cta of ["Más info", "Catálogo 2026", "Nuevos productos", "Promoción especial", "Info y precios"]) {
      expect(ctaHablaAlLector(cta), cta).toBe(false);
    }
  });

  it("falsos resultados conocidos del imperativo", () => {
    // Falso negativo: el imperativo sin tilde no se reconoce (da una sugerencia de más).
    expect(esImperativo("Reserva")).toBe(false);
    // Falsos positivos: sustantivos con la forma de un imperativo con pronombre pegado.
    expect(esImperativo("chocolate")).toBe(true);
    expect(esImperativo("escuela")).toBe(true);
    // Palabras agudas excluidas a mano.
    expect(esImperativo("Más")).toBe(false);
    expect(esImperativo("café")).toBe(false);
  });

  it("la oferta tiene vigencia: fechas, días, plazos o hasta agotar stock", () => {
    for (const t of ["20% off", "2x1 en medialunas", "Envío gratis", "$4500 la docena", "Promo de invierno", "15% de descuento"]) expect(tieneOferta(t), t).toBe(true);
    for (const t of ["Llegó la nueva carta", "Abrimos el sábado"]) expect(tieneOferta(t), t).toBe(false);
    for (const t of ["Válido hasta el domingo", "Solo por hoy", "Hasta agotar stock", "Del 3/5 al 10/5", "Todo junio", "Esta semana", "Por tiempo limitado", "Últimos días"]) {
      expect(tieneVigencia(t), t).toBe(true);
    }
    for (const t of ["20% off en toda la tienda", "La mejor calidad"]) expect(tieneVigencia(t), t).toBe(false);
    // Falso positivo: "hasta" sin plazo ("hasta 10 cuotas") cuenta como vigencia.
    expect(tieneVigencia("Pagá hasta en 10 cuotas")).toBe(true);
  });

  it("un solo mensaje: H1, cada oración del body y CTA; más de 4 sugiere partir la pieza", () => {
    expect(bloquesDeTexto({ h1: "Tres pilares", body: "Logo, paleta y tipografía. Si están firmes, se reconoce.", cta: "Guardalo" })).toBe(4);
    expect(bloquesDeTexto({ h1: "Tres pilares", body: "Uno. Dos. Tres.", cta: "Guardalo" })).toBeGreaterThan(MAX_BLOQUES_TEXTO);
    expect(bloquesDeTexto({ h1: "Hola", body: null, cta: null })).toBe(1);
    // Falso resultado: una abreviatura con punto ("Av. Siempre Viva") cuenta como dos oraciones.
    expect(bloquesDeTexto({ h1: "Evento", body: "En Av. Siempre Viva", cta: null })).toBe(3);
  });
});
