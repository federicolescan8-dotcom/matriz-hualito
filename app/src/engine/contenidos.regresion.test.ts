import { describe, expect, it } from "vitest";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { armarPieza, ORDEN_TIPOS, textoSugerido } from "./contenidos";
import type { Rubro } from "./presets";

// Regresión de E15 (paso 4): sin objetivo, armarPieza tiene que devolver lo mismo que antes de la capa de marketing.
// La foto se tomó con el código anterior al paso 4; si cambia, es un cambio de comportamiento a revisar.

const RUBROS: Rubro[] = ["servicios", "gastronomia", "belleza", "tech"];

function marcaDe(rubro: Rubro, conContenido: boolean) {
  const d = { ...diagnosticoVacio(), nombre: "Regresión", rubro };
  if (conContenido) d.contenido = { oferta: ["Café de especialidad"], mensaje: "Todo lo que necesitás", apoyo: "Atención todos los días.", cta: "Pedí turno" };
  return construirMarca(d, generarChips(d)[0]);
}

describe("armarPieza sin objetivo (regresión E15)", () => {
  for (const rubro of RUBROS) {
    for (const conContenido of [false, true]) {
      it(`${rubro}${conContenido ? " con contenido del cliente" : ""}`, () => {
        const marca = marcaDe(rubro, conContenido);
        const piezas = ORDEN_TIPOS.map((tipo) => {
          // El id y el de la marca son aleatorios: no entran en la foto.
          return { tipo, ...armarPieza(tipo, textoSugerido(tipo, marca), marca), id: null, marca_id: null };
        });
        expect(piezas).toMatchSnapshot();
      });
    }
  }
});
