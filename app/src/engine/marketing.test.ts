import fs from "fs";
import { describe, expect, it } from "vitest";
import { ORDEN_TIPOS, TIPOS_CONTENIDO } from "./contenidos";
import { admiteObjetivo, ctaPorDefecto, OBJETIVOS, OBJETIVOS_DE_TIPO, objetivoPorDefecto, objetivosDe, ordenDeLectura } from "./marketing";
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
