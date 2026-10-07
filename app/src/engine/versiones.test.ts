import { describe, expect, it } from "vitest";
import { ajustarColorMarca, construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import {
  aprobarVersion,
  cambiosSinAprobar,
  comentarVersion,
  deshacer,
  deshacerNuevo,
  diferencias,
  estadoMarca,
  guardarVersion,
  marcaParaPublicar,
  marcarFavorita,
  registrarPaso,
  rehacer,
  restaurarVersion,
} from "./versiones";

const d = { ...diagnosticoVacio(), nombre: "Versionada", rubro: "belleza" as const };
const base = construirMarca(d, generarChips(d)[0]);
const c = (texto: string) => ({ autor: "cliente", fecha: "2026-10-06T12:00:00Z", texto });

describe("versiones de la identidad (E13)", () => {
  it("guardar, cambiar y restaurar una versión", () => {
    const v1 = guardarVersion(base, "Propuesta 1", "estudio");
    const cambiada = ajustarColorMarca(v1, "acento", { H: 50, S: 90, L: 55 });
    expect(diferencias(v1.identidad, cambiada.identidad).some((x) => x.startsWith("Acento"))).toBe(true);
    const vuelta = restaurarVersion(cambiada, v1.versiones![0].id);
    expect(vuelta.identidad).toEqual(base.identidad);
    expect(vuelta.versiones).toHaveLength(1);
  });

  it("aprobar fija la versión que usa Publicaciones y el estado", () => {
    expect(estadoMarca(base)).toBe("en_identidad");
    let m = guardarVersion(base, "A", "estudio");
    const id = m.versiones![0].id;
    m = aprobarVersion(m, id, c("Me encanta"));
    expect(estadoMarca(m)).toBe("aprobada");
    expect(m.versiones![0].aprobacion?.texto).toBe("Me encanta");
    // Un cambio posterior no llega a Publicaciones hasta aprobarlo.
    const editada = ajustarColorMarca(m, "acento", { H: 200, S: 80, L: 50 });
    expect(cambiosSinAprobar(editada)).toBe(true);
    expect(marcaParaPublicar(editada).identidad).toEqual(base.identidad);
    expect(cambiosSinAprobar(m)).toBe(false);
  });

  it("sin versión aprobada, Publicaciones usa la identidad actual", () => {
    expect(marcaParaPublicar(base)).toBe(base);
  });

  it("favoritas y comentarios por versión", () => {
    let m = guardarVersion(guardarVersion(base, "A", "e"), "B", "e");
    const [a, b] = m.versiones!;
    m = comentarVersion(marcarFavorita(m, b.id, true), a.id, c("Muy oscura"));
    expect(m.versiones![1].favorita).toBe(true);
    expect(m.versiones![0].comentarios).toEqual([c("Muy oscura")]);
  });

  it("deshacer y rehacer descartan lo deshecho al registrar otro paso", () => {
    let h = registrarPaso(registrarPaso(deshacerNuevo(1), 2), 3);
    h = deshacer(deshacer(h));
    expect(h.pasos[h.pos]).toBe(1);
    expect(rehacer(h).pasos[rehacer(h).pos]).toBe(2);
    h = registrarPaso(h, 9);
    expect(h.pasos).toEqual([1, 9]);
    expect(rehacer(h).pos).toBe(1);
  });
});

describe("grilla del feed para la presentación (E13)", () => {
  it("9 piezas 4:5 que rotan variantes y siguen la secuencia de modos", async () => {
    const { piezasDeGrilla, secuenciaModo } = await import("./pieza");
    const g = piezasDeGrilla(base, { h1: "Hola", body: "Texto", cta: "Ir" });
    expect(g).toHaveLength(9);
    expect(new Set(g.map((p) => p.id)).size).toBe(9);
    expect(g.every((p) => p.formato === "4:5")).toBe(true);
    expect(new Set(g.map((p) => p.variante)).size).toBeGreaterThan(3);
    const s = secuenciaModo(base);
    g.forEach((p, i) => expect(p.modo).toBe(s[i % s.length]));
  });
});
