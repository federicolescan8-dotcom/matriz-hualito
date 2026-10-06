// Versiones de la identidad y aprobación (replanteo, E13): instantáneas con nombre para probar opciones con el cliente,
// volver atrás sin perder nada, comparar y dejar aprobada una versión. Publicaciones usa la versión aprobada.

import { distanciaColor, hslToHex } from "./color";
import type { Marca } from "./diagnostico";
import type { Identidad } from "./identidad";
import type { RolPaleta } from "./palette";
import { familiaTexto } from "./typography";

export type EstadoMarca = "en_diagnostico" | "en_identidad" | "aprobada" | "en_produccion";

export const ESTADOS_MARCA: { id: EstadoMarca; nombre: string }[] = [
  { id: "en_diagnostico", nombre: "En diagnóstico" },
  { id: "en_identidad", nombre: "En identidad" },
  { id: "aprobada", nombre: "Aprobada" },
  { id: "en_produccion", nombre: "En producción" },
];

export interface Comentario {
  autor: string;
  fecha: string;
  texto: string;
}

export interface VersionIdentidad {
  id: string;
  nombre: string;
  autor: string;
  fecha: string;
  identidad: Identidad;
  favorita?: boolean;
  comentarios?: Comentario[];
  /** Quién la aprobó, cuándo y con qué comentario. */
  aprobacion?: Comentario;
}

/** Estado de la marca: el elegido o, si no hay, el que se deduce de sus versiones. */
export function estadoMarca(m: Marca): EstadoMarca {
  if (m.estado) return m.estado;
  return m.version_aprobada ? "aprobada" : "en_identidad";
}

/** Guarda la identidad actual como una versión con nombre. */
export function guardarVersion(m: Marca, nombre: string, autor: string, fecha = new Date().toISOString()): Marca {
  const v: VersionIdentidad = { id: crypto.randomUUID(), nombre: nombre.trim() || `Versión ${(m.versiones?.length ?? 0) + 1}`, autor, fecha, identidad: m.identidad };
  return { ...m, versiones: [...(m.versiones ?? []), v] };
}

/** Vuelve la identidad actual a una versión guardada. La versión sigue guardada. */
export function restaurarVersion(m: Marca, id: string): Marca {
  const v = m.versiones?.find((x) => x.id === id);
  return v ? { ...m, identidad: v.identidad } : m;
}

function conVersion(m: Marca, id: string, cambio: (v: VersionIdentidad) => VersionIdentidad): Marca {
  return { ...m, versiones: (m.versiones ?? []).map((v) => (v.id === id ? cambio(v) : v)) };
}

export function marcarFavorita(m: Marca, id: string, favorita: boolean): Marca {
  return conVersion(m, id, (v) => ({ ...v, favorita }));
}

export function comentarVersion(m: Marca, id: string, c: Comentario): Marca {
  return conVersion(m, id, (v) => ({ ...v, comentarios: [...(v.comentarios ?? []), c] }));
}

/**
 * Aprueba una versión: queda registrado quién, cuándo y con qué comentario, la marca pasa a "aprobada" y Publicaciones
 * empieza a usar esa versión. Una aprobación anterior queda en su versión como historial.
 */
export function aprobarVersion(m: Marca, id: string, aprobacion: Comentario): Marca {
  if (!m.versiones?.some((v) => v.id === id)) return m;
  return { ...conVersion(m, id, (v) => ({ ...v, aprobacion })), version_aprobada: id, estado: "aprobada" };
}

export function versionAprobada(m: Marca): VersionIdentidad | null {
  return m.versiones?.find((v) => v.id === m.version_aprobada) ?? null;
}

/** La marca tal como la usa Publicaciones: con la identidad aprobada si hay una; si no, con la actual. */
export function marcaParaPublicar(m: Marca): Marca {
  const v = versionAprobada(m);
  return v ? { ...m, identidad: v.identidad } : m;
}

const NOMBRES_ROL: Record<RolPaleta, string> = {
  color_marca: "Color de marca",
  version_funcional: "Versión funcional",
  tono_apoyo: "Tono de apoyo",
  fondo_neutro: "Fondo neutro",
  acento: "Acento",
};

/** Diferencias legibles entre dos identidades, para comparar versiones con el cliente. */
export function diferencias(a: Identidad, b: Identidad): string[] {
  const salida: string[] = [];
  for (const rol of Object.keys(NOMBRES_ROL) as RolPaleta[]) {
    const x = a.paleta[rol];
    const y = b.paleta[rol];
    if (!x && !y) continue;
    if (!x || !y || distanciaColor(x, y) > 1)
      salida.push(`${NOMBRES_ROL[rol]}: ${x ? hslToHex(x).toUpperCase() : "—"} → ${y ? hslToHex(y).toUpperCase() : "—"}`);
  }
  if (a.tipografia.familia_variable !== b.tipografia.familia_variable)
    salida.push(`Tipografía de títulos: ${a.tipografia.familia_variable} → ${b.tipografia.familia_variable}`);
  if (familiaTexto(a.tipografia) !== familiaTexto(b.tipografia))
    salida.push(`Tipografía de texto: ${familiaTexto(a.tipografia)} → ${familiaTexto(b.tipografia)}`);
  if (a.graficos.estilo_iconos !== b.graficos.estilo_iconos) salida.push(`Íconos: ${a.graficos.estilo_iconos} → ${b.graficos.estilo_iconos}`);
  if (a.fotos_habilitadas !== b.fotos_habilitadas) salida.push(`Fotos propias: ${a.fotos_habilitadas ? "sí" : "no"} → ${b.fotos_habilitadas ? "sí" : "no"}`);
  if ((a.paleta_extendida?.armonia ?? null) !== (b.paleta_extendida?.armonia ?? null))
    salida.push(`Paleta extendida: ${a.paleta_extendida?.armonia ?? "sin"} → ${b.paleta_extendida?.armonia ?? "sin"}`);
  if (JSON.stringify(a.logo) !== JSON.stringify(b.logo)) salida.push("Logo distinto");
  return salida;
}

/** La identidad actual tiene cambios respecto de la aprobada (Publicaciones sigue usando la aprobada). */
export function cambiosSinAprobar(m: Marca): boolean {
  const v = versionAprobada(m);
  return v != null && diferencias(v.identidad, m.identidad).length > 0;
}

/** Historial de deshacer y rehacer de un borrador, puro: la vista solo guarda la lista y la posición. */
export interface Deshacer<T> {
  pasos: T[];
  pos: number;
}

export function deshacerNuevo<T>(inicial: T): Deshacer<T> {
  return { pasos: [inicial], pos: 0 };
}

/** Suma un paso y descarta lo que se había deshecho. Guarda hasta 50 pasos. */
export function registrarPaso<T>(h: Deshacer<T>, valor: T): Deshacer<T> {
  const pasos = [...h.pasos.slice(0, h.pos + 1), valor].slice(-50);
  return { pasos, pos: pasos.length - 1 };
}

export function deshacer<T>(h: Deshacer<T>): Deshacer<T> {
  return { ...h, pos: Math.max(0, h.pos - 1) };
}

export function rehacer<T>(h: Deshacer<T>): Deshacer<T> {
  return { ...h, pos: Math.min(h.pasos.length - 1, h.pos + 1) };
}
