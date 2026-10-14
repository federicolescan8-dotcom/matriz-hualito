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

// ── Heurísticas de texto (cap. 7b, paso 7 de E15). Son aproximaciones: alimentan sugerencias, nunca avisos. ──

const normalizar = (s: string) => s.toLowerCase().normalize("NFC").trim();
const palabras = (s: string) => normalizar(s).split(/[^\p{L}\p{N}%$]+/u).filter(Boolean);

/** Imperativos con voseo frecuentes en un CTA. La forma de la palabra cubre el resto (ver `esImperativo`). */
const IMPERATIVOS = new Set([
  "reservá", "pedí", "pedilo", "pedila", "escribí", "escribinos", "sumate", "aprovechá", "aprovechala", "aprovechalo",
  "guardá", "guardalo", "guardala", "conocé", "comprá", "compralo", "llamá", "llamanos", "consultá", "consultanos",
  "visitá", "visitanos", "seguí", "seguinos", "descubrí", "probá", "probalo", "agendá", "anotate", "inscribite", "mirá",
  "leé", "compartí", "compartilo", "contactanos", "vení", "sacá", "elegí", "hacé", "contanos", "registrate", "descargá",
  "accedé", "aprendé", "empezá", "encargá", "encargalo", "suscribite", "unite", "animate", "dale", "tocá", "entrá",
]);

/** Palabras que terminan como un imperativo con voseo pero no lo son (falsos positivos conocidos). */
const NO_IMPERATIVOS = new Set(["más", "café", "sí", "ahí", "aquí", "acá", "allá", "también", "papá", "mamá", "bebé", "jamás", "quizá"]);

/**
 * La palabra es un imperativo con voseo: está en la lista o tiene su forma (aguda en -á, -é, -í, como "reservá", o
 * con un pronombre pegado, como "sumate" o "aprovechala"). Falsos positivos documentados: sustantivos que terminan
 * igual ("chocolate", "escuela"); falsos negativos: el imperativo sin tilde ("Reserva").
 */
export function esImperativo(palabra: string): boolean {
  const p = normalizar(palabra);
  if (IMPERATIVOS.has(p)) return true;
  if (NO_IMPERATIVOS.has(p) || p.length < 4) return false;
  return /[áéí]$/u.test(p) || /^\p{L}{3,}[aei](te|nos|me|lo|la|los|las|le|les)$/u.test(p);
}

/** Palabras con las que el texto le habla de vos al lector ("Tu lugar te espera"). */
const SEGUNDA_PERSONA = new Set(["te", "tu", "tus", "vos", "ti", "tuyo", "tuya", "tuyos", "tuyas", "contigo"]);

/** El CTA le habla al lector: arranca con un imperativo con voseo o se dirige a él de vos. */
export function ctaHablaAlLector(cta: string): boolean {
  const ps = palabras(cta);
  if (!ps.length) return false;
  return esImperativo(ps[0]) || ps.some((p) => SEGUNDA_PERSONA.has(p));
}

/** El texto anuncia una oferta: porcentaje, precio, "off", descuento, 2x1, promo o gratis. */
export function tieneOferta(texto: string): boolean {
  return /%|\$|\boff\b|descuento|\b\d+\s*x\s*\d+\b|\bpromo|gratis|rebaja/iu.test(texto);
}

const DIAS = "lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo";
const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

/** El texto dice hasta cuándo vale: una fecha, un día, un plazo o "hasta agotar stock". */
export function tieneVigencia(texto: string): boolean {
  const t = normalizar(texto);
  return (
    new RegExp(`\\b(${DIAS}|${MESES})\\b`, "u").test(t) ||
    /\b\d{1,2}\s*\/\s*\d{1,2}\b/u.test(t) ||
    /\b(hasta|hoy|mañana|válid[oa]s?|vigente|vence)\b/u.test(t) ||
    /(esta semana|este mes|este (fin de semana|finde)|por tiempo limitado|últimos días|solo por|agotar stock)/u.test(t)
  );
}

/** Más bloques de texto que esto sugiere más de un mensaje (proxy, cap. 7b). */
export const MAX_BLOQUES_TEXTO = 4;

/** Bloques de texto de la pieza: el H1, cada oración del body y el CTA. Proxy de "un solo mensaje". */
export function bloquesDeTexto(contenido: { h1: string; body: string | null; cta: string | null }): number {
  const oraciones = (contenido.body ?? "").split(/[.!?…]+(?:\s|$)/u).filter((o) => o.trim().length > 0).length;
  return (contenido.h1.trim() ? 1 : 0) + oraciones + (contenido.cta?.trim() ? 1 : 0);
}
