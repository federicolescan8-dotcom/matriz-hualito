// Objeto de pieza (manual cap. 9) y plantillas de slots de las variantes (cap. 6).

import {
  BIBLIOTECA_RUBRO,
  ICONOS,
  rellenosDisponibles,
  type EstiloIconos,
  type Patron,
  type RellenoDeco,
  type TipoContacto,
} from "./biblioteca";
import type { IdDecoracion } from "./decoraciones";
import type { Marca } from "./diagnostico";
import { CANALES, FORMATOS, type Canal, type Formato } from "./formatos";
import { PRESETS, type Alineacion, type Modo, type Rubro, type Variante } from "./presets";
import { compensacionOptica, CTA_MIN, JERARQUIA_H1 } from "./typography";

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
  /** Capa decorativa de las variantes 2B (una sola por pieza). null = la sugerida del rubro. */
  deco?: Deco | null;
  /** Decoración de plantilla (v1.1): figuras propias del diseño. null = forma de fondo automática. */
  decoracion?: IdDecoracion | null;
  /** Variante 3: cada ícono de contacto sobre un soporte (cuadrado redondeado). */
  soporte_iconos?: boolean;
  /** Variante 3: hasta 4 datos de contacto. */
  contacto?: DatoContacto[];
  /** Variante 4: de 2 a 4 ítems (3 en 1:1). */
  items?: ItemCatalogo[];
  /** La pieza es un slide de un carrusel: su posición, su rol y, en el contenido, el número de punto (carrusel.ts). */
  carrusel?: { indice: number; total: number; rol: "portada" | "contenido" | "cierre"; punto?: number };
  /** Color de la decoración de plantilla: índice de un secundario de la paleta extendida (E3). null = tono de apoyo. */
  color_decoracion?: number | null;
  /** Avisos del checklist aceptados a mano, con su justificación (E9). */
  aceptaciones?: Aceptacion[];
}

/** Un aviso del checklist aceptado a propósito: qué control, por qué, quién y cuándo (E9). */
export interface Aceptacion {
  /** Nombre del control, tal como lo muestra el checklist. */
  control: string;
  motivo: string;
  autor: string;
  /** ISO 8601. */
  fecha: string;
}

/** Acepta un aviso del checklist con su justificación. Reemplaza una aceptación anterior del mismo control. */
export function aceptarControl(pieza: Pieza, control: string, motivo: string, autor: string, fecha = new Date().toISOString()): Pieza {
  const otras = (pieza.aceptaciones ?? []).filter((a) => a.control !== control);
  return { ...pieza, aceptaciones: [...otras, { control, motivo: motivo.trim(), autor, fecha }] };
}

/** Quita la aceptación de un control: vuelve a frenar la pieza si sigue fallando. */
export function quitarAceptacion(pieza: Pieza, control: string): Pieza {
  return { ...pieza, aceptaciones: (pieza.aceptaciones ?? []).filter((a) => a.control !== control) };
}

/** Capa decorativa 2B: una forma sangrada y su relleno. */
export interface Deco {
  /** id de la forma (del rubro) que se sangra contra el borde. */
  forma: string;
  relleno: RellenoDeco;
  patron?: Patron;
  icono?: string;
  /** Foto como data URL (relleno foto). */
  foto?: string | null;
}

export interface DatoContacto {
  tipo: TipoContacto;
  valor: string;
}

export interface ItemCatalogo {
  texto: string;
  icono: string | null;
  foto: string | null;
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
  /** Variantes 2B: dónde va la capa decorativa. */
  deco?: "lateral" | "inferior";
  /** Variantes con bloque informativo. */
  bloque?: "contacto" | "catalogo";
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
  "2B-L": {
    nombre: "2B-L · Deco lateral",
    descripcion: "Mensaje a la izquierda y una capa decorativa a la derecha. Impacto con refuerzo visual.",
    orden: ["H1", "body", "cta", "logo"],
    tieneCta: true,
    // La columna del mensaje es angosta (la mitad izquierda): el mínimo del H1 es más alto para sostener la jerarquía.
    h1: { min: 64, max: 104, altoMax: 0.42 },
    body: { min: 26, max: 32 },
    cta: 32,
    logoPx: 90,
    deco: "lateral",
  },
  "2B-S": {
    nombre: "2B-S · Deco inferior",
    descripcion: "Mensaje arriba y una capa decorativa debajo. Impacto con refuerzo visual.",
    orden: ["H1", "body", "cta", "logo"],
    tieneCta: true,
    h1: { min: 56, max: 116, altoMax: 0.34 },
    body: { min: 26, max: 32 },
    cta: 32,
    logoPx: 90,
    deco: "inferior",
  },
  "3": {
    nombre: "3 · Contacto",
    descripcion: "Ficha institucional: mensaje y hasta 4 datos de contacto con ícono. Sin llamado a la acción.",
    orden: ["H1", "body", "logo"],
    tieneCta: false,
    h1: { min: 56, max: 104, altoMax: 0.34 },
    body: { min: 26, max: 32 },
    cta: 32,
    logoPx: 100,
    bloque: "contacto",
  },
  "4": {
    nombre: "4 · Catálogo",
    descripcion: "Logo y mensaje, de 2 a 4 productos o servicios con foto o ícono, y llamado a la acción.",
    orden: ["logo", "H1", "cta"],
    tieneCta: true,
    h1: { min: 48, max: 92, altoMax: 0.24 },
    body: { min: 24, max: 30 },
    cta: 32,
    logoPx: 80,
    bloque: "catalogo",
  },
  P: {
    nombre: "P · Punto",
    descripcion: "Slide de contenido del carrusel: número grande, un título corto y su desarrollo.",
    orden: ["H1", "body"],
    tieneCta: false,
    h1: { min: 56, max: 104, altoMax: 0.3 },
    body: { min: 26, max: 34 },
    cta: 32,
    logoPx: 60,
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
    "2B-L": { h1: { max: 88, altoMax: 0.4, maxLineas: 3 }, logoPx: 76 },
    "2B-S": { h1: { max: 96, altoMax: 0.3, maxLineas: 2 }, logoPx: 76 },
    "3": { h1: { max: 88, altoMax: 0.3, maxLineas: 2 }, logoPx: 80 },
    "4": { h1: { max: 76, altoMax: 0.22, maxLineas: 2 }, logoPx: 64 },
  },
  "9:16": {
    "1": { h1: { altoMax: 0.42 } },
    "2": { h1: { max: 150, altoMax: 0.55 } },
    // 2B-L: mismo H1 que en 4:5 (la columna tiene el mismo ancho); con la escala de story se partiría palabra por palabra.
    "2B-L": { h1: { max: 86 } },
    "2B-S": { h1: { altoMax: 0.3 } },
    "3": { h1: { altoMax: 0.3 } },
    "4": { h1: { altoMax: 0.2 } },
  },
  "1200x630": {
    "1": { h1: { min: 48, max: 80, altoMax: 0.5 }, body: { min: 24, max: 28 }, cta: 26, logoPx: 60 },
    "2": { h1: { min: 56, max: 104, altoMax: 0.66 }, body: { min: 24, max: 28 }, logoPx: 54 },
    "2B-L": { h1: { min: 48, max: 80, altoMax: 0.5 }, body: { min: 24, max: 28 }, cta: 26, logoPx: 56 },
    "2B-S": { h1: { min: 48, max: 80, altoMax: 0.5 }, body: { min: 24, max: 28 }, cta: 26, logoPx: 56 },
    "3": { h1: { min: 48, max: 84, altoMax: 0.55 }, body: { min: 24, max: 28 }, logoPx: 56 },
    "4": { h1: { min: 48, max: 72, altoMax: 0.45 }, body: { min: 24, max: 26 }, cta: 26, logoPx: 56 },
  },
};

/**
 * Plantilla de la variante en el formato. Con `familia`, el rango del body se agranda según la compensación óptica de
 * la familia (las de x baja se ven más chicas al mismo tamaño).
 */
export function plantillaPara(variante: Variante, formato: Formato, familia?: string): PlantillaVariante {
  const base = PLANTILLAS[variante]!;
  const a = AJUSTES_FORMATO[formato]?.[variante] ?? {};
  const k = familia ? compensacionOptica(familia) : 1;
  const body = { ...base.body, ...a.body };
  return { ...base, ...a, h1: { ...base.h1, ...a.h1 }, body: { min: Math.round(body.min * k), max: Math.round(body.max * k) } };
}

/**
 * Piso real del H1 en px: el mínimo de la variante, subido si hace falta para que el H1 siga siendo el doble del body
 * y del CTA en sus mínimos. El ajuste de texto nunca baja de acá.
 */
export function h1Minimo(plantilla: PlantillaVariante, escala: number): number {
  const px = (v: number) => Math.round(v * escala);
  const ctaMin = Math.min(px(CTA_MIN), px(plantilla.cta));
  return Math.max(px(plantilla.h1.min), JERARQUIA_H1 * px(plantilla.body.min), JERARQUIA_H1 * ctaMin);
}

/** Variantes de una publicación simple. La P (Punto) se usa solo dentro del carrusel. */
export const VARIANTES_HABILITADAS = (Object.keys(PLANTILLAS) as Variante[]).filter((v) => v !== "P");

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
  return marca.identidad.paleta.invertir_modo ? s.map((m) => (m === "A" ? "B" : "A")) : s;
}

/** Variante sugerida: la primera prioritaria del rubro que esté habilitada. */
export function varianteSugerida(rubro: Rubro): Variante {
  return PRESETS[rubro].prioritarias.find((v) => PLANTILLAS[v]) ?? "1";
}

/** Máximo de ítems de catálogo por formato (cap. 6: hasta 3-4; 1:1 hasta 3). */
export function maxItems(formato: Formato): number {
  return formato === "1:1" || formato === "1200x630" ? 3 : 4;
}
export const MAX_CONTACTO = 4;

/** Máximo de íconos por pieza según la variante (cap. 6 / A.6). */
export function maxIconos(variante: Variante, items: number): number {
  if (variante === "3") return MAX_CONTACTO;
  if (variante === "4") return items;
  return 2;
}

export function estiloIconos(marca: Marca): EstiloIconos {
  return marca.identidad.graficos.estilo_iconos;
}

/** Capa decorativa por defecto del rubro con un relleno dado. */
export function decoPorDefecto(rubro: Rubro, relleno: RellenoDeco): Deco {
  const lib = BIBLIOTECA_RUBRO[rubro];
  return { forma: lib.formasDeco[0], relleno, patron: lib.patrones[0], icono: ICONOS[lib.iconosSugeridos[0]][0], foto: null };
}

/**
 * Capa decorativa efectiva: la elegida si su relleno está habilitado; si es foto y no hay foto cargada, se usa el
 * siguiente relleno del rubro con la misma forma (la pieza tiene que funcionar completa sin foto, cap. 5).
 */
export function decoEfectiva(marca: Marca, pieza: Pieza): Deco {
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const disponibles = rellenosDisponibles(marca.rubro, marca.identidad.fotos_habilitadas);
  const base = decoPorDefecto(marca.rubro, disponibles[0]);
  const elegida = { ...base, ...pieza.deco };
  if (!lib.formasDeco.includes(elegida.forma)) elegida.forma = base.forma;
  if (!elegida.patron || !lib.patrones.includes(elegida.patron)) elegida.patron = base.patron;
  const valido = disponibles.includes(elegida.relleno) && (elegida.relleno !== "foto" || !!elegida.foto);
  // Sin foto, el respaldo se queda en el mismo modo: una foto pasa a ícono (imagen), no a patrón.
  if (!valido) {
    elegida.relleno =
      (elegida.relleno === "foto" && disponibles.includes("icono") ? "icono" : disponibles.find((t) => t !== "foto")) ?? "patron";
  }
  // 2B-L con imagen o ícono (v1.1): el relleno va siempre en un círculo.
  if (pieza.variante === "2B-L" && elegida.relleno !== "patron") elegida.forma = "circulo";
  return elegida;
}

export function piezaNueva(marca: Marca): Pieza {
  const variante = varianteSugerida(marca.rubro);
  const oferta = (marca.diagnostico.contenido?.oferta ?? []).map((o) => o.trim()).filter(Boolean);
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
    deco: null,
    decoracion: null,
    soporte_iconos: false,
    contacto: [
      { tipo: "whatsapp", valor: "11 5555-5555" },
      { tipo: "instagram", valor: "@" + marca.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "") },
      { tipo: "direccion", valor: "Av. Siempre Viva 742" },
    ],
    // La oferta real del cliente (E12) nombra los ítems del catálogo.
    items: [
      { texto: oferta[0] ?? "Producto uno", icono: ICONOS[BIBLIOTECA_RUBRO[marca.rubro].iconosSugeridos[0]][0], foto: null },
      { texto: oferta[1] ?? "Producto dos", icono: ICONOS[BIBLIOTECA_RUBRO[marca.rubro].iconosSugeridos[0]][1], foto: null },
      { texto: oferta[2] ?? "Producto tres", icono: ICONOS[BIBLIOTECA_RUBRO[marca.rubro].iconosSugeridos[0]][2], foto: null },
    ],
  };
}

/** Al cambiar de canal, el formato pasa al primero habilitado de ese canal. */
export function formatoDeCanal(canal: Canal, actual: Formato): Formato {
  const formatos = CANALES[canal].formatos;
  return formatos.includes(actual) ? actual : formatos[0];
}

/**
 * Modo de la capa decorativa (v1.1): "imagen" es un círculo con foto o ícono; "figura" es una forma geométrica de la
 * biblioteca con un patrón adentro.
 */
export function modoDeco(relleno: RellenoDeco): "imagen" | "figura" {
  return relleno === "patron" ? "figura" : "imagen";
}

/**
 * Geometría del 2B-L en modo imagen, formatos verticales (v1.1). El círculo mide el 80% del ancho, arranca en el centro
 * de la pieza y se recorta contra el borde derecho; va centrado en el alto de la zona segura. El H1 arranca a la altura del borde superior
 * del círculo y el logo cierra en el margen inferior. En 9:16 el mensaje sube y el logo baja un 8% del alto respecto
 * de los bordes del círculo, sin salir de la zona segura.
 */
export function geometria2BLImagen(formato: Formato): {
  diametro: number;
  izquierda: number;
  /** Posiciones posibles del borde izquierdo del círculo, en orden de preferencia. */
  posiciones: number[];
  arriba: number;
  textoArriba: number;
  logoAbajo: number;
} {
  const f = FORMATOS[formato];
  const diametro = f.ancho * 0.8;
  // Desde el centro; si el H1 no llega a un tamaño cómodo, desde el 60% del ancho (más lugar para el mensaje). En 1:1,
  // donde el H1 tiene pocas líneas, siempre desde el 60%.
  const posiciones = formato === "1:1" ? [f.ancho * 0.6] : [f.ancho * 0.5, f.ancho * 0.6];
  const izquierda = posiciones[0];
  const zonaArriba = f.alto * f.zona.arriba;
  const zonaAbajo = f.alto * (1 - f.zona.abajo);
  // Centrado en la zona segura (no en el lienzo): en 9:16 la zona es asimétrica porque la interfaz tapa más abajo.
  const arriba = zonaArriba + (zonaAbajo - zonaArriba - diametro) / 2;
  if (formato === "9:16") {
    return {
      diametro,
      izquierda,
      posiciones,
      arriba,
      textoArriba: Math.max(zonaArriba + 16, arriba - f.alto * 0.08),
      logoAbajo: Math.min(zonaAbajo, arriba + diametro + f.alto * 0.08),
    };
  }
  // 4:5 y 1:1: el bloque del mensaje queda enmarcado por el alto del círculo: el H1 arranca en su borde superior y el
  // logo termina en su borde inferior (siempre dentro de la zona segura, con 16 px para las ascendentes).
  return {
    diametro,
    izquierda,
    posiciones,
    arriba,
    textoArriba: Math.max(zonaArriba + 16, arriba),
    logoAbajo: Math.min(zonaAbajo, arriba + diametro),
  };
}

/**
 * Piezas para la grilla del feed en la presentación (E13): la variante va rotando (primero las prioritarias del rubro)
 * y el modo sigue la secuencia de la marca (cap. 7), así el cliente ve el ritmo real del perfil.
 */
export function piezasDeGrilla(marca: Marca, contenido: Pieza["contenido"], n = 9): Pieza[] {
  const prioritarias = PRESETS[marca.rubro].prioritarias.filter((v) => (VARIANTES_HABILITADAS as Variante[]).includes(v));
  const variantes = [...prioritarias, ...VARIANTES_HABILITADAS.filter((v) => !prioritarias.includes(v))];
  const secuencia = secuenciaModo(marca);
  const base = piezaNueva(marca);
  return Array.from({ length: n }, (_, i) => {
    const variante = variantes[i % variantes.length];
    return {
      ...base,
      id: `${base.id}-${i}`,
      canal: "feed_ig",
      formato: "4:5",
      variante,
      modo: secuencia[i % secuencia.length],
      alineacion: "izquierda",
      contenido: {
        h1: contenido.h1,
        body: PLANTILLAS[variante]?.orden.includes("body") ? contenido.body : null,
        cta: PLANTILLAS[variante]?.tieneCta ? contenido.cta : null,
      },
    };
  });
}
