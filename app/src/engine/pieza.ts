// Objeto de pieza (manual cap. 9) y plantillas de slots de las variantes (cap. 6).

import type { Marca } from "./diagnostico";
import { CANALES, type Canal, type Formato } from "./formatos";
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
  /** Orden de lectura de los slots (cap. 6). Es el mismo en todos los formatos: solo cambian las proporciones. */
  orden: ("logo" | "H1" | "body" | "cta")[];
  tieneCta: boolean;
  /**
   * Tamaños en px sobre el lienzo feed; en story y estado se multiplican por el factor de escala (+15-20%).
   * `altoMax` es la fracción del alto de la pieza que puede ocupar el H1; `maxLineas` limita los renglones.
   */
  h1: { min: number; max: number; altoMax: number; maxLineas?: number };
  body: { min: number; max: number };
  cta: number;
  /** Alto del slot de logo en px (escala feed). */
  logoPx: number;
}

type AjusteVariante = Partial<Omit<PlantillaVariante, "h1" | "body">> & {
  h1?: Partial<PlantillaVariante["h1"]>;
  body?: Partial<PlantillaVariante["body"]>;
};

/** Variantes habilitadas. Las demás (2B, 3 y 4) llegan con la biblioteca gráfica (fase 3b). */
export const PLANTILLAS: Partial<Record<Variante, PlantillaVariante>> = {
  "1": {
    nombre: "1 · Base",
    descripcion: "Logo, mensaje, dato de apoyo y llamado a la acción. Pieza estándar.",
    orden: ["logo", "H1", "body", "cta"],
    tieneCta: true,
    h1: { min: 56, max: 120, altoMax: 0.5 },
    body: { min: 26, max: 36 },
    cta: 34,
    logoPx: 115,
  },
  "2": {
    nombre: "2 · H1 protagonista",
    descripcion: "Una frase o dato de alto impacto. Sin llamado a la acción.",
    orden: ["H1", "body", "logo"],
    tieneCta: false,
    h1: { min: 64, max: 170, altoMax: 0.7 },
    body: { min: 26, max: 36 },
    cta: 34,
    logoPx: 100,
  },
};

/**
 * Proporciones por formato (cap. 6, "Grillas por formato"). El 4:5 es la referencia. El 1:1 limita el H1 a
 * 2 líneas; el 9:16 usa la zona segura 15-85% y escala tamaños; Facebook reacomoda el mensaje en la mitad izquierda.
 */
const AJUSTES_FORMATO: Partial<Record<Formato, Partial<Record<Variante, AjusteVariante>>>> = {
  "1:1": {
    "1": { h1: { max: 104, altoMax: 0.42, maxLineas: 2 }, body: { max: 32 }, logoPx: 96 },
    "2": { h1: { max: 140, altoMax: 0.6, maxLineas: 2 }, body: { max: 32 }, logoPx: 88 },
  },
  "9:16": {
    "1": { h1: { altoMax: 0.42 } },
    "2": { h1: { max: 150, altoMax: 0.55 } },
  },
  "1200x630": {
    "1": { h1: { min: 48, max: 80, altoMax: 0.5 }, body: { min: 24, max: 28 }, cta: 26, logoPx: 60 },
    "2": { h1: { min: 56, max: 104, altoMax: 0.66 }, body: { min: 24, max: 28 }, logoPx: 54 },
  },
};

export function plantillaPara(variante: Variante, formato: Formato): PlantillaVariante {
  const base = PLANTILLAS[variante]!;
  const a = AJUSTES_FORMATO[formato]?.[variante] ?? {};
  return { ...base, ...a, h1: { ...base.h1, ...a.h1 }, body: { ...base.body, ...a.body } };
}

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

/** Al cambiar de canal, el formato pasa al primero habilitado de ese canal. */
export function formatoDeCanal(canal: Canal, actual: Formato): Formato {
  const formatos = CANALES[canal].formatos;
  return formatos.includes(actual) ? actual : formatos[0];
}
