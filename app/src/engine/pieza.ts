// Objeto de pieza (manual cap. 9) y plantillas de slots de las variantes (cap. 6).

import type { Marca } from "./diagnostico";
import type { Canal, Formato } from "./formatos";
import { PRESETS, type Alineacion, type Modo, type Rubro, type Variante } from "./presets";

export interface Pieza {
  id: string;
  marca_id: string;
  canal: Canal;
  formato: Formato;
  variante: Variante;
  modo: Modo;
  alineacion: Alineacion;
  contenido: {
    h1: string;
    body: string | null;
    cta: string | null;
  };
  /** Itálica en el body: solo si la marca la tiene habilitada (cap. 4 paso 3). */
  body_italica: boolean;
}

export interface PlantillaVariante {
  nombre: string;
  descripcion: string;
  /** Orden de lectura de los slots (cap. 6). */
  orden: ("logo" | "H1" | "body" | "cta")[];
  tieneCta: boolean;
  /** Tamaños en px sobre el lienzo feed; en story se multiplican por el factor de escala. */
  h1: { min: number; max: number; altoMax: number };
  body: { min: number; max: number };
  cta: number;
  /** Alto del slot de logo, como fracción del alto de la pieza. */
  logoAlto: number;
}

/** Variantes habilitadas en la fase 2. Las demás llegan en la fase 3. */
export const PLANTILLAS: Partial<Record<Variante, PlantillaVariante>> = {
  "1": {
    nombre: "1 · Base",
    descripcion: "Logo, mensaje, dato de apoyo y llamado a la acción. Pieza estándar.",
    orden: ["logo", "H1", "body", "cta"],
    tieneCta: true,
    h1: { min: 56, max: 120, altoMax: 0.5 },
    body: { min: 26, max: 36 },
    cta: 34,
    logoAlto: 0.085,
  },
  "2": {
    nombre: "2 · H1 protagonista",
    descripcion: "Una frase o dato de alto impacto. Sin llamado a la acción.",
    orden: ["H1", "body", "logo"],
    tieneCta: false,
    h1: { min: 64, max: 170, altoMax: 0.7 },
    body: { min: 26, max: 36 },
    cta: 34,
    logoAlto: 0.075,
  },
};

export const VARIANTES_HABILITADAS = Object.keys(PLANTILLAS) as Variante[];

/**
 * Alineación permitida (cap. 6): derecha y justificado prohibidos. En las variantes 2 y 3 se permite centrado
 * según el rubro; el resto de las variantes va a la izquierda.
 */
export function alineacionesPermitidas(rubro: Rubro, variante: Variante): Alineacion[] {
  return variante === "2" || variante === "3" ? PRESETS[rubro].alineacion_2_3 : ["izquierda"];
}

/** Secuencia de modo del rubro, invertida si el color heredado es claro (cap. 3 paso 8). */
export function secuenciaModo(marca: Marca): Modo[] {
  const s = PRESETS[marca.rubro].secuencia;
  return marca.paleta.invertir_modo ? s.map((m) => (m === "A" ? "B" : "A")) : s;
}

/** Variante sugerida: la primera prioritaria del rubro que esté habilitada. */
export function varianteSugerida(rubro: Rubro): Variante {
  return PRESETS[rubro].prioritarias.find((v) => PLANTILLAS[v]) ?? "1";
}

export function piezaNueva(marca: Marca): Pieza {
  const variante = varianteSugerida(marca.rubro);
  return {
    id: crypto.randomUUID(),
    marca_id: marca.id,
    canal: "feed_ig",
    formato: "4:5",
    variante,
    modo: secuenciaModo(marca)[0],
    alineacion: "izquierda",
    contenido: { h1: "", body: null, cta: null },
    body_italica: false,
  };
}
