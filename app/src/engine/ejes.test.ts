import { describe, expect, it } from "vitest";
import { ejesDesdePersonalidad, ejesSemilla, EJES_RUBRO, familiaDeEjes, rangoMatiz, valorDeEjes } from "./ejes";
import { construirMarca, diagnosticoVacio, generarChips, type Marca } from "./diagnostico";
import { migrarMarca } from "./identidad";
import { PRESETS, RUBROS } from "./presets";
import { CLASE_FAMILIA } from "./typography";

describe("diagnóstico abierto: ejes (E12)", () => {
  it("la semilla de cada rubro da una familia de la misma clase que las de su preset", () => {
    // Con el catálogo ampliado (E3) puede ser otra familia, pero de la misma clase (serif, geométrica, etc.).
    for (const r of RUBROS)
      expect(Object.values(PRESETS[r].familia).map((f) => CLASE_FAMILIA[f])).toContain(CLASE_FAMILIA[familiaDeEjes(ejesSemilla(r))]);
  });

  it("mezclar dos rubros promedia sus ejes", () => {
    const m = ejesSemilla("gastronomia", "tech");
    expect(m.calido_frio).toBe(Math.round((EJES_RUBRO.gastronomia.calido_frio + EJES_RUBRO.tech.calido_frio) / 2));
    expect(ejesSemilla("tech", "tech")).toEqual(EJES_RUBRO.tech);
  });

  it("expresivo abre el rango de matiz y cálido lo corre hacia los naranjas", () => {
    const base = ejesSemilla("servicios");
    const [a, b] = rangoMatiz(base, "servicios");
    const [c, d] = rangoMatiz({ ...base, sobrio_expresivo: 100 }, "servicios");
    expect(d - c).toBeGreaterThan(b - a);
    const calido = rangoMatiz({ ...base, calido_frio: 0 }, "servicios");
    const centro = (calido[0] + calido[1]) / 2;
    expect(Math.abs(((centro % 360) + 360) % 360 - 30)).toBeLessThan(40);
  });

  it("los ejes deciden el acento", () => {
    expect(valorDeEjes({ ...ejesSemilla("servicios"), sobrio_expresivo: 90 })).toBe("energia");
    expect(valorDeEjes({ ...ejesSemilla("servicios"), clasico_moderno: 90, artesanal_tecnologico: 90 })).toBe("innovacion");
  });

  it("dos marcas del mismo rubro con ejes distintos arrancan distintas", () => {
    const a = { ...diagnosticoVacio(), nombre: "A", rubro: "gastronomia" as const, ejes: ejesSemilla("gastronomia") };
    const b = { ...a, nombre: "B", ejes: { ...a.ejes, clasico_moderno: 90, sobrio_expresivo: 20, artesanal_tecnologico: 80, calido_frio: 90 } };
    const ma = construirMarca(a, generarChips(a)[0]);
    const mb = construirMarca(b, generarChips(b)[0]);
    expect(ma.identidad.tipografia.familia_variable).not.toBe(mb.identidad.tipografia.familia_variable);
    expect(generarChips(a).map((c) => c.H)).not.toEqual(generarChips(b).map((c) => c.H));
  });

  it("una marca guardada antes de E12 gana ejes sin cambiar su identidad", () => {
    const d = { ...diagnosticoVacio(), nombre: "Vieja", rubro: "belleza" as const, personalidad: { tono: "cercana" as const, valor: "calma" as const } };
    const nueva = construirMarca(d, generarChips(d)[0]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ejes, rubro_secundario, rubro_libre, contenido, ...diagViejo } = nueva.diagnostico;
    const vieja = { ...nueva, diagnostico: diagViejo } as unknown as Marca;
    const migrada = migrarMarca(vieja);
    expect(migrada.identidad).toEqual(nueva.identidad);
    expect(migrada.diagnostico.ejes).toEqual(ejesDesdePersonalidad("belleza", "cercana", "calma"));
    expect(migrada.diagnostico.contenido.oferta).toEqual([]);
    expect(migrarMarca(migrada)).toBe(migrada);
  });
});

describe("diagnóstico editable (E12)", () => {
  it("reconstruir conserva id, historial y los colores ajustados a mano", async () => {
    const { ajustarColorMarca, reconstruirMarca, diagnosticoDeMarca } = await import("./diagnostico");
    const d = { ...diagnosticoVacio(), nombre: "Editable", rubro: "tech" as const };
    const original = ajustarColorMarca(construirMarca(d, generarChips(d)[0]), "acento", { H: 50, S: 90, L: 55 });
    const conHistorial = { ...original, historial: [{ tipo: "aceptacion" as const, control: "x", motivo: "y", autor: "z", fecha: "2026-01-01", pieza: "p" }] };
    const editado = { ...diagnosticoDeMarca(conHistorial), ejes: { ...d.ejes, calido_frio: 0 } };
    const r = reconstruirMarca(conHistorial, editado, generarChips(editado)[1]);
    expect(r.id).toBe(original.id);
    expect(r.historial).toEqual(conHistorial.historial);
    expect(r.identidad.ajustes_manuales).toEqual(["acento"]);
    expect(r.identidad.paleta.acento).toMatchObject({ H: 50, S: 90, L: 55 });
    expect(r.diagnostico.ejes.calido_frio).toBe(0);
  });
});
