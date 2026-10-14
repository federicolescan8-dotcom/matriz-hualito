import { describe, expect, it } from "vitest";
import barocca from "../../../herramientas/perfilador/ejemplos/perfil-barocca.json";
import { fallasPaleta } from "./palette";
import { secuenciaModo } from "./pieza";
import { FORMATO_PERFIL, marcaDePerfil, validarPerfil, type Perfil } from "./perfil";

// Copia profunda del ejemplo para poder romperlo en cada caso sin afectar a los demás.
const ejemplo = (): Record<string, any> => JSON.parse(JSON.stringify(barocca)); // eslint-disable-line @typescript-eslint/no-explicit-any

const sinEsencia = (p: Perfil): Perfil => ({ ...p, esencia: null });

function valido(json: unknown): Perfil {
  const r = validarPerfil(json);
  if (!r.ok) throw new Error(r.errores.join("\n"));
  return r.perfil;
}

describe("perfil de una marca existente (perfilador)", () => {
  it("acepta el ejemplo de Barocca y completa tono y valor desde los ejes", () => {
    const p = valido(ejemplo());
    expect(p.formato).toBe(FORMATO_PERFIL);
    expect(p.diagnostico.rubro).toBe("gastronomia");
    expect(p.diagnostico.personalidad.tono).toBe("cercana");
    expect(p.diagnostico.personalidad.valor).toBe("energia");
    expect(p.diagnostico.color_previo_hex).toBe("#E9DCC6");
    expect(p.rescate.referencias).toHaveLength(2);
  });

  it("rechaza ejes fuera de rango o faltantes", () => {
    const j = ejemplo();
    j.diagnostico.ejes.calido_frio = 140;
    delete j.diagnostico.ejes.serio_ludico;
    const r = validarPerfil(j);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores).toContain("diagnostico.ejes.calido_frio: número de 0 a 100.");
      expect(r.errores).toContain("diagnostico.ejes.serio_ludico: número de 0 a 100.");
    }
  });

  it("rechaza enums inválidos, HEX mal escrito y más de 4 ofertas", () => {
    const j = ejemplo();
    j.diagnostico.rubro = "heladeria";
    j.diagnostico.personalidad.tono = "divertida";
    j.diagnostico.color_previo_hex = "crema";
    j.diagnostico.contenido.oferta.push("Tortas heladas");
    j.rescate.grado = "total";
    const r = validarPerfil(j);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toHaveLength(5);
  });

  it("rechaza colores de referencia que no son HSL", () => {
    const j = ejemplo();
    j.rescate.referencias[0].colores[0].color = "#E9DCC6";
    expect(validarPerfil(j).ok).toBe(false);
  });

  it("completa lo opcional y descarta una tipografía fuera del catálogo con aviso", () => {
    const j = ejemplo();
    delete j.diagnostico.publico;
    delete j.diagnostico.personalidad;
    delete j.evidencia;
    delete j.confianza;
    j.diagnostico.tipografia_previa = "Lobster";
    const r = validarPerfil(j);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.perfil.diagnostico.publico).toBeUndefined();
      expect(r.perfil.diagnostico.tipografia_previa).toBeNull();
      expect(r.perfil.confianza).toEqual({ ejes: 0, tono: 0, rubro: 0 });
      expect(r.avisos.some((a) => a.includes("Lobster"))).toBe(true);
    }
  });

  it("no es un perfil si no es un objeto o le falta el formato", () => {
    expect(validarPerfil(null).ok).toBe(false);
    expect(validarPerfil([]).ok).toBe(false);
    const j = ejemplo();
    delete j.formato;
    expect(validarPerfil(j).ok).toBe(false);
  });

  it("arma una marca en rescate con la paleta del motor y la auditoría hecha", () => {
    const p = valido(ejemplo());
    const m = marcaDePerfil(sinEsencia(p)).marca;
    expect(m.nombre).toBe("Barocca");
    expect(m.estado).toBe("en_diagnostico");
    // Refresco: se optimiza el matiz del color previo, no se hereda tal cual.
    expect(m.identidad.color.modo).toBe("optimizado");
    expect(m.diagnostico.matiz_elegido).toBeCloseTo(37.7, 0);
    expect(m.identidad.rescate?.grado).toBe("refresco");
    expect(m.identidad.rescate?.grupos?.length).toBeGreaterThan(0);
    expect(m.diagnostico.contenido.oferta).toHaveLength(4);
  });

  it("en grado rescate hereda el color previo", () => {
    const j = ejemplo();
    j.rescate.grado = "rescate";
    const m = marcaDePerfil(sinEsencia(valido(j))).marca;
    expect(m.identidad.color.modo).toBe("heredado");
  });

  it("sin color previo usa el rango de los ejes", () => {
    const j = ejemplo();
    j.diagnostico.color_previo_hex = null;
    const m = marcaDePerfil(sinEsencia(valido(j))).marca;
    expect(m.identidad.color.modo).toBe("optimizado");
    expect(m.identidad.paleta.color_marca).toBeTruthy();
  });

  it("con esencia negra y crema: marca negra heredada, fondo crema y la secuencia abre en Modo B", () => {
    const j = ejemplo();
    j.esencia = { superficie: { H: 0, S: 0, L: 4 }, figura: { H: 37.7, S: 44.3, L: 84.5 }, detalle: null, fuentes: ["perfil.png"] };
    const { marca, avisos } = marcaDePerfil(valido(j));
    const p = marca.identidad.paleta;
    expect(marca.identidad.color.modo).toBe("heredado");
    expect(p.color_marca.L).toBeLessThan(10);
    expect(p.fondo_neutro.L).toBeGreaterThanOrEqual(84);
    expect(p.fondo_neutro.H).toBeCloseTo(37.7, 0);
    expect(p.invertir_modo).toBe(true);
    expect(marca.diagnostico.color_previo_hex).toBe("#0A0A0A");
    expect(avisos).toEqual([]);
    expect(fallasPaleta(p)).toEqual([]);
  });

  it("el ejemplo de Barocca con su esencia sale negro, crema y dorado, y abre en Modo B", () => {
    const { marca } = marcaDePerfil(valido(ejemplo()));
    const p = marca.identidad.paleta;
    expect(p.color_marca.L).toBeLessThan(5);
    expect(p.fondo_neutro.L).toBeGreaterThan(85);
    expect(p.acento.H).toBeCloseTo(30.2, 0);
    expect(p.invertir_modo).toBe(true);
    expect(secuenciaModo(marca)[0]).toBe("B");
    expect(fallasPaleta(p)).toEqual([]);
  });

  it("rechaza una esencia con colores que no son HSL", () => {
    const j = ejemplo();
    j.esencia = { superficie: "#000", figura: { H: 0, S: 0, L: 90 }, detalle: null };
    expect(validarPerfil(j).ok).toBe(false);
  });
});
