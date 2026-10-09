// Plantillas por tipo de contenido (E7): cada tipo define los campos que el cliente completa, la variante y el
// formato que mejor lo cuentan, y cómo se traducen a una pieza. Reutiliza las variantes del cap. 6: no hay diseños
// nuevos, solo un camino más corto desde "qué quiero publicar" hasta la pieza.

import type { Marca } from "./diagnostico";
import { ICONOS, BIBLIOTECA_RUBRO } from "./biblioteca";
import type { Canal, Formato } from "./formatos";
import { MAX_PALABRAS_H1_PROTAGONISTA } from "./checklist";
import { admiteCta, piezaNueva, varianteSugerida, variantesDisponibles, type Pieza } from "./pieza";
import { OBJETIVOS, type ObjetivoMarketing } from "./marketing";
import type { Variante } from "./presets";

export type TipoContenido = "promocion" | "testimonio" | "tip" | "lanzamiento" | "evento" | "faq" | "antes_despues";

export interface CampoContenido {
  id: string;
  etiqueta: string;
  /** Texto de ejemplo: se muestra de ayuda y sirve de valor inicial cuando el cliente no cargó contenido propio. */
  ejemplo: string;
  /** Límite de caracteres: lo que entra cómodo en la variante sin recortar la letra. */
  max: number;
  multilinea?: boolean;
  /** Campo que se puede dejar vacío: no tiene ejemplo de respaldo (el CTA de promoción y evento, cap. 7b). */
  opcional?: boolean;
}

export interface PlantillaContenido {
  id: TipoContenido;
  nombre: string;
  descripcion: string;
  campos: CampoContenido[];
  /** Variantes en orden de preferencia: se usa la primera habilitada para la marca. */
  variantes: Variante[];
  canal: Canal;
  formato: Formato;
  /** El tipo se cuenta mejor en varios slides: Publicaciones ofrece pasar al carrusel. */
  carrusel?: boolean;
}

/** CTA del testimonio en la variante 1 sin objetivo (antes de E15). Con objetivo "confianza" no se propone ninguno. */
const CTA_TESTIMONIO = "Conocé más";

export const TIPOS_CONTENIDO: Record<TipoContenido, PlantillaContenido> = {
  promocion: {
    id: "promocion",
    nombre: "Promoción",
    descripcion: "Una oferta con su precio y hasta cuándo vale.",
    campos: [
      { id: "oferta", etiqueta: "Oferta o precio", ejemplo: "20% off esta semana", max: 32 },
      { id: "vigencia", etiqueta: "Vigencia", ejemplo: "Válido hasta el domingo", max: 60, multilinea: true },
      { id: "cta", etiqueta: "Llamado a la acción (opcional)", ejemplo: "", max: 28, opcional: true },
    ],
    variantes: ["2", "4"],
    canal: "feed_ig",
    formato: "4:5",
  },
  testimonio: {
    id: "testimonio",
    nombre: "Testimonio",
    descripcion: "La voz de un cliente, con su nombre.",
    campos: [
      { id: "cita", etiqueta: "Cita", ejemplo: "Me resolvieron todo en una semana", max: 44, multilinea: true },
      { id: "autor", etiqueta: "Autor", ejemplo: "Camila, clienta", max: 40 },
    ],
    variantes: ["2", "1"],
    canal: "feed_ig",
    formato: "4:5",
  },
  tip: {
    id: "tip",
    nombre: "Tip o educativo",
    descripcion: "Un consejo útil. Si tiene varios pasos, rinde más como carrusel.",
    campos: [
      { id: "titulo", etiqueta: "Título del tip", ejemplo: "Un tip para ordenar tus cuentas", max: 48, multilinea: true },
      { id: "detalle", etiqueta: "El consejo", ejemplo: "Separá un día fijo por semana para revisarlas.", max: 100, multilinea: true },
      { id: "cta", etiqueta: "Llamado a la acción", ejemplo: "Guardalo para después", max: 28 },
    ],
    variantes: ["1"],
    canal: "feed_ig",
    formato: "4:5",
    carrusel: true,
  },
  lanzamiento: {
    id: "lanzamiento",
    nombre: "Lanzamiento",
    descripcion: "Una novedad: producto, servicio o línea nueva.",
    campos: [
      { id: "novedad", etiqueta: "Qué se lanza", ejemplo: "Llegó nuestra nueva línea", max: 40, multilinea: true },
      { id: "detalle", etiqueta: "Detalle", ejemplo: "Ya disponible, con stock limitado.", max: 100, multilinea: true },
      { id: "cta", etiqueta: "Llamado a la acción", ejemplo: "Conocela", max: 28 },
    ],
    variantes: ["1"],
    canal: "feed_ig",
    formato: "4:5",
  },
  evento: {
    id: "evento",
    nombre: "Evento",
    descripcion: "Un encuentro con su fecha, su hora y su lugar.",
    campos: [
      { id: "nombre", etiqueta: "Nombre del evento", ejemplo: "Jornada de puertas abiertas", max: 44, multilinea: true },
      { id: "fecha", etiqueta: "Fecha", ejemplo: "Sábado 14 de junio", max: 30 },
      { id: "hora", etiqueta: "Hora", ejemplo: "18 h", max: 14 },
      { id: "lugar", etiqueta: "Lugar", ejemplo: "Av. Siempre Viva 742", max: 44 },
      { id: "cta", etiqueta: "Llamado a la acción (opcional)", ejemplo: "", max: 28, opcional: true },
    ],
    variantes: ["3", "1"],
    canal: "feed_ig",
    formato: "4:5",
  },
  faq: {
    id: "faq",
    nombre: "Pregunta frecuente",
    descripcion: "La duda que más te hacen, con su respuesta.",
    campos: [
      { id: "pregunta", etiqueta: "Pregunta", ejemplo: "¿Hacen envíos a todo el país?", max: 48, multilinea: true },
      { id: "respuesta", etiqueta: "Respuesta", ejemplo: "Sí, enviamos a todo el país en 48 horas.", max: 100, multilinea: true },
      { id: "cta", etiqueta: "Llamado a la acción", ejemplo: "Escribinos", max: 28 },
    ],
    variantes: ["1"],
    canal: "feed_ig",
    formato: "4:5",
  },
  antes_despues: {
    id: "antes_despues",
    nombre: "Antes y después",
    descripcion: "Un cambio en dos cuadros: cómo estaba y cómo quedó.",
    campos: [
      { id: "titulo", etiqueta: "Título", ejemplo: "Antes y después", max: 40, multilinea: true },
      { id: "antes", etiqueta: "Antes", ejemplo: "Desorden", max: 16 },
      { id: "despues", etiqueta: "Después", ejemplo: "Todo en orden", max: 16 },
      { id: "detalle", etiqueta: "Qué cambió", ejemplo: "El resultado, en una línea.", max: 60, multilinea: true },
      { id: "cta", etiqueta: "Llamado a la acción", ejemplo: "Pedí tu turno", max: 28 },
    ],
    variantes: ["4"],
    canal: "feed_ig",
    formato: "4:5",
  },
};

export const ORDEN_TIPOS: TipoContenido[] = ["promocion", "testimonio", "tip", "lanzamiento", "evento", "faq", "antes_despues"];

export type CamposContenido = Record<string, string>;

/** Máximo de palabras del H1 sugerido según la variante: la 2 es protagonista; en el resto, un mensaje corto. */
export function maxPalabrasH1(variante: Variante): number {
  return variante === "2" ? MAX_PALABRAS_H1_PROTAGONISTA : 9;
}

/** Variante que usa el tipo para esta marca: la primera de su lista que esté habilitada. */
export function varianteDeTipo(tipo: TipoContenido, marca: Marca): Variante {
  const habilitadas = variantesDisponibles(marca);
  return TIPOS_CONTENIDO[tipo].variantes.find((v) => habilitadas.includes(v)) ?? varianteSugerida(marca.rubro);
}

/** Recorta a un máximo de palabras y de caracteres, sin cortar palabras a la mitad. */
function recortar(texto: string, palabras: number, caracteres: number): string {
  const entero = texto.trim();
  let out = entero.split(/\s+/).slice(0, palabras).join(" ");
  while (out.length > caracteres && out.includes(" ")) out = out.slice(0, out.lastIndexOf(" "));
  out = out.slice(0, caracteres);
  return out === entero ? out : out.replace(/[,.;:]+$/, "");
}

/**
 * Texto de ejemplo de cada campo. Usa el contenido real del cliente (oferta, mensaje, apoyo, CTA) cuando existe y
 * lo recorta a lo que entra en la variante; si no, el ejemplo del tipo.
 */
export function textoSugerido(tipo: TipoContenido, marca: Marca, objetivo?: ObjetivoMarketing): CamposContenido {
  const plantilla = TIPOS_CONTENIDO[tipo];
  const c = marca.diagnostico.contenido;
  const oferta = (c?.oferta ?? []).map((o) => o.trim()).filter(Boolean);
  const mensaje = c?.mensaje?.trim() ?? "";
  const apoyo = c?.apoyo?.trim() ?? "";
  const cta = c?.cta?.trim() ?? "";
  const campo = (id: string) => plantilla.campos.find((x) => x.id === id)!;
  const ajustar = (id: string, texto: string, palabras = 99) => recortar(texto, palabras, campo(id).max);
  const ej = Object.fromEntries(plantilla.campos.map((x) => [x.id, x.ejemplo])) as CamposContenido;
  const palabrasH1 = maxPalabrasH1(varianteDeTipo(tipo, marca));

  switch (tipo) {
    case "promocion":
      // "20% off en" ocupa tres palabras: el producto entra con las que quedan hasta el tope del H1.
      if (oferta[0]) ej.oferta = ajustar("oferta", `20% off en ${recortar(oferta[0], palabrasH1 - 3, 20)}`, palabrasH1);
      break;
    case "tip":
      if (mensaje) ej.titulo = ajustar("titulo", mensaje, palabrasH1);
      if (apoyo) ej.detalle = ajustar("detalle", apoyo);
      break;
    case "lanzamiento":
      if (oferta[0]) ej.novedad = ajustar("novedad", `Llegó ${recortar(oferta[0], 4, 28)}`, palabrasH1);
      else if (mensaje) ej.novedad = ajustar("novedad", mensaje, palabrasH1);
      if (apoyo) ej.detalle = ajustar("detalle", apoyo);
      break;
    case "faq":
      if (apoyo) ej.respuesta = ajustar("respuesta", apoyo);
      break;
    case "antes_despues":
      if (oferta[0]) ej.titulo = ajustar("titulo", `Antes y después: ${recortar(oferta[0], 2, 20)}`, palabrasH1);
      break;
    case "testimonio":
      ej.autor = ajustar("autor", `Cliente de ${marca.nombre}`);
      break;
    case "evento":
      break;
  }
  if ("cta" in ej) {
    if (objetivo) {
      // Con objetivo (cap. 7b) el CTA se precarga con el del diagnóstico o, si no hay, con el del objetivo; el ejemplo
      // del campo ya no hace de respaldo.
      const sugerido = cta || OBJETIVOS[objetivo].ctaPorDefecto || "";
      ej.cta = sugerido ? ajustar("cta", sugerido) : "";
    } else if (cta && !campo("cta").opcional) {
      // Sin objetivo, como antes de E15: el CTA opcional de promoción y evento queda vacío.
      ej.cta = ajustar("cta", cta);
    }
  }
  return ej;
}

/**
 * Traduce los campos del tipo a una pieza: el mensaje va al H1, el detalle al body y, según el tipo, el lugar a un
 * dato de contacto o el antes y el después a dos ítems del catálogo. Lo que falta cae al ejemplo del tipo.
 */
export function armarPieza(tipo: TipoContenido, campos: CamposContenido, marca: Marca, objetivo?: ObjetivoMarketing): Pieza {
  const plantilla = TIPOS_CONTENIDO[tipo];
  const base = piezaNueva(marca);
  const v = (id: string) => (campos[id] ?? "").trim() || plantilla.campos.find((x) => x.id === id)?.ejemplo || "";
  const variante = varianteDeTipo(tipo, marca);
  const pieza: Pieza = {
    ...base,
    canal: plantilla.canal,
    formato: plantilla.formato,
    variante,
    contenido: { h1: "", body: null, cta: null },
  };
  const cta = (id = "cta") => v(id) || null;
  // Lo escrito a mano en el CTA va siempre que la variante lo admita (cap. 7b): ningún objetivo ni control lo pisa.
  const escrito = (campos.cta ?? "").trim();
  const ctaEscrito = escrito && admiteCta(variante) ? escrito : null;

  switch (tipo) {
    case "promocion":
      pieza.contenido = { h1: v("oferta"), body: v("vigencia"), cta: escrito ? ctaEscrito : variante === "2" ? null : OBJETIVOS.vender.ctaPorDefecto };
      break;
    case "testimonio":
      pieza.contenido = { h1: `“${v("cita").replace(/^[“"«]|[”"»]$/g, "")}”`, body: `— ${v("autor").replace(/^[—–-]\s*/, "")}`, cta: variante === "2" ? null : CTA_TESTIMONIO };
      break;
    case "tip":
      pieza.contenido = { h1: v("titulo"), body: v("detalle"), cta: cta() };
      break;
    case "lanzamiento":
      pieza.contenido = { h1: v("novedad"), body: v("detalle"), cta: cta() };
      break;
    case "evento":
      pieza.contenido = { h1: v("nombre"), body: `${v("fecha")} · ${v("hora")}`, cta: escrito ? ctaEscrito : variante === "3" ? null : OBJETIVOS.evento.ctaPorDefecto };
      pieza.contacto = [{ tipo: "direccion", valor: v("lugar") }];
      break;
    case "faq":
      pieza.contenido = { h1: v("pregunta"), body: v("respuesta"), cta: cta() };
      break;
    case "antes_despues": {
      const [a, b] = ICONOS[BIBLIOTECA_RUBRO[marca.rubro].iconosSugeridos[0]];
      // El catálogo no dibuja el body, pero el ajuste de texto necesita que exista: va el detalle del cambio.
      pieza.contenido = { h1: v("titulo"), body: v("detalle"), cta: cta() };
      pieza.items = [
        { texto: `Antes: ${v("antes")}`, icono: a, foto: null },
        { texto: `Después: ${v("despues")}`, icono: b, foto: null },
      ];
      break;
    }
  }
  if (objetivo) {
    pieza.objetivo = objetivo;
    pieza.contenido.cta = ctaConObjetivo(objetivo, ctaEscrito, variante, marca);
  }
  return pieza;
}

/**
 * CTA de una pieza con objetivo (cap. 7b). Prioridad: lo escrito a mano > el CTA del diagnóstico > el del objetivo.
 * Con el campo vacío solo se completa si el objetivo lo requiere y la variante lo admite: con CTA opcional, vacío es
 * una decisión válida; con "ninguno" (confianza), el sistema nunca propone uno.
 */
function ctaConObjetivo(objetivo: ObjetivoMarketing, escrito: string | null, variante: Pieza["variante"], marca: Marca): string | null {
  if (escrito) return escrito;
  const def = OBJETIVOS[objetivo];
  if (def.politicaCta !== "requerido" || !admiteCta(variante)) return null;
  return recortar(marca.diagnostico.contenido?.cta ?? "", 99, 28) || def.ctaPorDefecto;
}
