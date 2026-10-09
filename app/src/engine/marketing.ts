// Estructura de marketing (cap. 7b, E15): cada pieza digital puede declarar qué quiere lograr. El objetivo fija el orden
// de lectura y la política de CTA; los controles de marketing del checklist solo corren si la pieza tiene objetivo.
// Este módulo es solo datos y funciones puras: no importa valores de contenidos ni del checklist, para no armar ciclos.

import type { TipoContenido } from "./contenidos";

export type ObjetivoMarketing = "vender" | "consultas" | "confianza" | "educar" | "evento";

/** Política de CTA del objetivo (cap. 7b): "requerido" da aviso si falta; nunca bloquea ni reescribe el texto. */
export type PoliticaCtaObjetivo = "requerido" | "opcional" | "ninguno";

export interface DefinicionObjetivo {
  id: ObjetivoMarketing;
  nombre: string;
  /** Pregunta para hacerle al cliente (propuesta de redacción, cap. 7b). */
  pregunta: string;
  /** Orden de lectura narrativo; en la pieza cae en los slots que ya existen (cap. 7b, "Del orden de lectura a los slots"). */
  orden: string[];
  politicaCta: PoliticaCtaObjetivo;
  /** Qué clase de CTA pide: orienta el texto, no se controla. */
  tipoCta: string;
  /** CTA que se completa si la pieza no tiene uno y la variante lo admite; null si el objetivo no propone ninguno. */
  ctaPorDefecto: string | null;
}

export const OBJETIVOS: Record<ObjetivoMarketing, DefinicionObjetivo> = {
  vender: {
    id: "vender",
    nombre: "Vender ahora",
    pregunta: "¿Querés que te compren ahora?",
    orden: ["oferta", "beneficio", "vigencia", "CTA"],
    politicaCta: "requerido",
    tipoCta: "directo",
    ctaPorDefecto: "Aprovechala",
  },
  consultas: {
    id: "consultas",
    nombre: "Generar consultas",
    pregunta: "¿Querés que te escriban o te pidan presupuesto?",
    orden: ["problema", "solución", "CTA"],
    politicaCta: "requerido",
    tipoCta: "de contacto",
    ctaPorDefecto: "Escribinos",
  },
  confianza: {
    id: "confianza",
    nombre: "Construir confianza",
    pregunta: "¿Querés que te conozcan y te crean?",
    orden: ["cita", "autor", "marca"],
    // "Ninguno o suave": el sistema no propone CTA; si el usuario escribe uno, va sin aviso.
    politicaCta: "ninguno",
    tipoCta: "suave, si se escribe uno",
    ctaPorDefecto: null,
  },
  educar: {
    id: "educar",
    nombre: "Educar",
    pregunta: "¿Querés enseñar algo útil?",
    orden: ["gancho", "consejo", "CTA"],
    politicaCta: "opcional",
    tipoCta: "de guardado",
    ctaPorDefecto: "Guardalo",
  },
  evento: {
    id: "evento",
    nombre: "Llenar un evento",
    pregunta: "¿Querés que vengan a tu evento?",
    orden: ["nombre", "cuándo y dónde", "CTA"],
    politicaCta: "requerido",
    tipoCta: "de inscripción",
    ctaPorDefecto: "Sumate",
  },
};

/** Objetivos compatibles con cada tipo de contenido (cap. 7b); el primero es el que se usa por defecto. */
export const OBJETIVOS_DE_TIPO: Record<TipoContenido, ObjetivoMarketing[]> = {
  promocion: ["vender", "consultas"],
  testimonio: ["confianza"],
  tip: ["educar", "consultas"],
  lanzamiento: ["vender", "consultas"],
  evento: ["evento"],
  faq: ["educar", "consultas"],
  antes_despues: ["consultas"],
};

export function objetivosDe(tipo: TipoContenido): ObjetivoMarketing[] {
  return OBJETIVOS_DE_TIPO[tipo];
}

export function objetivoPorDefecto(tipo: TipoContenido): ObjetivoMarketing {
  return OBJETIVOS_DE_TIPO[tipo][0];
}

/** El tipo admite ese objetivo: sirve para descartar uno que quedó de otro tipo. */
export function admiteObjetivo(tipo: TipoContenido, objetivo: ObjetivoMarketing): boolean {
  return OBJETIVOS_DE_TIPO[tipo].includes(objetivo);
}

export function ctaPorDefecto(objetivo: ObjetivoMarketing): string | null {
  return OBJETIVOS[objetivo].ctaPorDefecto;
}

/** Orden de lectura en una línea, para mostrarlo debajo del selector ("oferta → beneficio → vigencia → CTA"). */
export function ordenDeLectura(objetivo: ObjetivoMarketing): string {
  return OBJETIVOS[objetivo].orden.join(" → ");
}
