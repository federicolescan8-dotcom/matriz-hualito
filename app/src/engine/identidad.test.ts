import { describe, expect, it } from "vitest";
import { ajustarColorMarca, construirMarca, diagnosticoVacio, generarChips, type Marca } from "./diagnostico";
import { esMarcaV1, migrarMarca, type MarcaV1 } from "./identidad";
import { BIBLIOTECA_RUBRO } from "./biblioteca";
import { hexToHsl } from "./color";

/** Arma una marca como se guardaba antes de E1: lo visual en la raíz. */
function comoV1(m: Marca): MarcaV1 {
  const { identidad, ...resto } = m;
  return { ...resto, ...identidad };
}

const d = { ...diagnosticoVacio(), nombre: "Panadería Sol", rubro: "gastronomia" as const, color_previo_hex: "#C2410C", tiene_fotos_propias: true };
const nueva = ajustarColorMarca(construirMarca(d, generarChips(d).at(-1)!), "acento", hexToHsl("#ffcc00")!);

describe("migración de marcas guardadas a identidad (E1)", () => {
  it("mueve lo visual a identidad sin perder datos", () => {
    const vieja = comoV1(nueva);
    expect(esMarcaV1(vieja)).toBe(true);
    const migrada = migrarMarca(vieja);
    expect(esMarcaV1(migrada)).toBe(false);
    expect(migrada).toEqual(nueva);
    // Ningún campo visual queda en la raíz.
    for (const campo of ["color", "paleta", "paleta_calculada", "ajustes_manuales", "tipografia", "logo", "graficos", "fotos_habilitadas"])
      expect(campo in migrada).toBe(false);
  });

  it("sobrevive a un viaje por JSON, como en localStorage o Supabase", () => {
    const migrada = migrarMarca(JSON.parse(JSON.stringify(comoV1(nueva))) as MarcaV1);
    expect(migrada).toEqual(JSON.parse(JSON.stringify(nueva)));
  });

  it("una marca vieja sin gráficos toma el estilo de íconos del rubro, como antes", () => {
    const vieja = comoV1(nueva);
    delete vieja.graficos;
    expect(migrarMarca(vieja).identidad.graficos).toEqual({ estilo_iconos: BIBLIOTECA_RUBRO.gastronomia.estiloIconos });
  });

  it("deja igual una marca ya migrada", () => {
    expect(migrarMarca(nueva)).toBe(nueva);
  });
});

// Público del diagnóstico (E15, paso 9): opcional; las marcas guardadas antes no lo tienen.
describe("público en marcas guardadas", () => {
  it("una marca guardada antes del paso 9 carga sin errores y sin el campo", () => {
    const d = { ...diagnosticoVacio(), nombre: "Vieja", rubro: "servicios" as const };
    const guardada = JSON.parse(JSON.stringify(construirMarca(d, generarChips(d)[0]))) as Marca;
    expect("publico" in guardada.diagnostico).toBe(false);
    const migrada = migrarMarca(guardada);
    expect(migrada).toBe(guardada);
    expect(migrada.diagnostico.publico).toBeUndefined();
  });
});
