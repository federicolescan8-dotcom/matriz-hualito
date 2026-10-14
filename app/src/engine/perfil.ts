// Perfil de una marca existente (replanteo, E11 + perfilador externo). El perfilador (`herramientas/perfilador`) mira
// capturas reales de una empresa que no tiene su identidad definida y escribe un JSON con el diagnóstico interpretado
// y los colores medidos. Acá vive lo puro: validar ese JSON (viene de un modelo de lenguaje, así que no se confía en
// nada) y convertirlo en una marca en rescate. La paleta no sale del JSON: la arma el motor con `construirMarca`.

import { hexToHsl, type HSL } from "./color";
import { construirMarca, diagnosticoVacio, generarChips, MAX_PUBLICO, publicoLimpio, type Diagnostico, type Marca } from "./diagnostico";
import { EJES, tonoDeEjes, valorDeEjes, type Eje, type Ejes } from "./ejes";
import { RUBROS, type Rubro, type Tono, type ValorMarca } from "./presets";
import { conRescate, gruposDeReferencias, type GradoCambio, type ReferenciaRescate } from "./rescate";
import { FAMILIAS } from "./typography";

export const FORMATO_PERFIL = "hualito.perfil.v1";

/** Máximo de productos o servicios del contenido (el catálogo usa hasta 4). */
export const MAX_OFERTA = 4;
/** Largo máximo de los textos del contenido: una frase para la vista previa, no un párrafo. */
export const MAX_TEXTO_CONTENIDO = 140;

const TONOS: Tono[] = ["seria", "cercana"];
const VALORES: ValorMarca[] = ["confianza", "energia", "calma", "innovacion"];
const GRADOS: GradoCambio[] = ["rescate", "refresco", "evolucion"];

export interface Perfil {
  formato: typeof FORMATO_PERFIL;
  fuente: { empresa: string; usuario_red: string | null; fecha: string; archivos: string[] };
  diagnostico: Omit<Diagnostico, "logo">;
  /** Archivo del logo que viaja al lado del JSON (la app lo carga aparte). */
  logo: { archivo: string } | null;
  rescate: { grado: GradoCambio; referencias: ReferenciaRescate[] };
  /** Por qué se decidió cada cosa: es para el diseñador, el motor no la usa. */
  evidencia: { ejes: Partial<Record<Eje, string>>; tipografia_observada: string; notas: string[] };
  /** Seguridad del perfilador en cada decisión, de 0 a 1. */
  confianza: { ejes: number; tono: number; rubro: number };
}

export type ResultadoPerfil = { ok: true; perfil: Perfil; avisos: string[] } | { ok: false; errores: string[] };

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Valida un perfil tal como lo devuelve el perfilador. Los errores son lo que el modelo tiene que corregir (tipos,
 * enums, rangos); los avisos son lo que se completó o se descartó sin bloquear (campos opcionales faltantes, una
 * tipografía que no está en el catálogo). Los mensajes se le devuelven tal cual al modelo en el reintento.
 */
export function validarPerfil(json: unknown): ResultadoPerfil {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!esObj(json)) return { ok: false, errores: ["El perfil tiene que ser un objeto JSON."] };
  if (json.formato !== FORMATO_PERFIL) errores.push(`formato: tiene que ser "${FORMATO_PERFIL}".`);

  const f = esObj(json.fuente) ? json.fuente : {};
  const empresa = texto(f.empresa);
  if (!empresa) errores.push("fuente.empresa: falta el nombre de la empresa.");

  const d = esObj(json.diagnostico) ? json.diagnostico : null;
  if (!d) errores.push("diagnostico: falta.");
  const dd = d ?? {};

  const rubro = dd.rubro as Rubro;
  if (!RUBROS.includes(rubro)) errores.push(`diagnostico.rubro: tiene que ser uno de ${RUBROS.join(", ")}.`);
  const secundario = dd.rubro_secundario ?? null;
  if (secundario !== null && !RUBROS.includes(secundario as Rubro))
    errores.push(`diagnostico.rubro_secundario: null o uno de ${RUBROS.join(", ")}.`);

  const ejes = {} as Ejes;
  const e = esObj(dd.ejes) ? dd.ejes : {};
  for (const { id } of EJES) {
    const v = e[id];
    if (!esNumero(v) || v < 0 || v > 100) errores.push(`diagnostico.ejes.${id}: número de 0 a 100.`);
    else ejes[id] = Math.round(v);
  }

  const p = esObj(dd.personalidad) ? dd.personalidad : {};
  const tono = (p.tono ?? null) as Tono | null;
  const valor = (p.valor ?? null) as ValorMarca | null;
  if (tono !== null && !TONOS.includes(tono)) errores.push(`diagnostico.personalidad.tono: null o ${TONOS.join(", ")}.`);
  if (valor !== null && !VALORES.includes(valor)) errores.push(`diagnostico.personalidad.valor: null o ${VALORES.join(", ")}.`);

  const c = esObj(dd.contenido) ? dd.contenido : {};
  const oferta = Array.isArray(c.oferta) ? c.oferta.map(texto).filter(Boolean) : [];
  if (oferta.length > MAX_OFERTA) errores.push(`diagnostico.contenido.oferta: hasta ${MAX_OFERTA} productos o servicios.`);
  const contenido = { oferta, mensaje: texto(c.mensaje), apoyo: texto(c.apoyo), cta: texto(c.cta) };
  for (const k of ["mensaje", "apoyo", "cta"] as const)
    if (contenido[k].length > MAX_TEXTO_CONTENIDO) errores.push(`diagnostico.contenido.${k}: hasta ${MAX_TEXTO_CONTENIDO} caracteres.`);

  const pub = esObj(dd.publico) ? dd.publico : {};
  for (const k of ["aquien", "motiva", "frena"] as const)
    if (texto(pub[k]).length > MAX_PUBLICO) errores.push(`diagnostico.publico.${k}: hasta ${MAX_PUBLICO} caracteres.`);

  const hex = dd.color_previo_hex ?? null;
  if (hex !== null && (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex) || !hexToHsl(hex)))
    errores.push("diagnostico.color_previo_hex: null o un HEX de 6 dígitos (#RRGGBB).");

  let tipografia: string | null = texto(dd.tipografia_previa) || null;
  if (tipografia && !FAMILIAS[tipografia]) {
    // Solo sirven las familias del catálogo; lo observado queda en la evidencia para el diseñador.
    avisos.push(`La tipografía «${tipografia}» no está en el catálogo: se descarta y la elige el motor por los ejes.`);
    tipografia = null;
  }

  const r = esObj(json.rescate) ? json.rescate : {};
  const grado = (r.grado ?? "rescate") as GradoCambio;
  if (!GRADOS.includes(grado)) errores.push(`rescate.grado: uno de ${GRADOS.join(", ")}.`);
  const referencias: ReferenciaRescate[] = [];
  (Array.isArray(r.referencias) ? r.referencias : []).forEach((ref, i) => {
    const colores = esObj(ref) && Array.isArray(ref.colores) ? ref.colores : null;
    if (!esObj(ref) || !texto(ref.nombre) || !colores) {
      errores.push(`rescate.referencias[${i}]: necesita nombre y colores.`);
      return;
    }
    const validos: { color: HSL; peso: number }[] = [];
    for (const x of colores) {
      if (esObj(x) && esHsl(x.color) && esNumero(x.peso) && x.peso >= 0 && x.peso <= 1) validos.push({ color: x.color, peso: x.peso });
      else errores.push(`rescate.referencias[${i}].colores: cada color es { color: {H,S,L}, peso 0–1 }.`);
    }
    referencias.push({ nombre: texto(ref.nombre), colores: validos });
  });
  if (!referencias.length) avisos.push("No hay referencias de color: la auditoría del rescate queda vacía.");

  if (errores.length) return { ok: false, errores: [...new Set(errores)] };

  const ev = esObj(json.evidencia) ? json.evidencia : {};
  const evEjes: Partial<Record<Eje, string>> = {};
  if (esObj(ev.ejes)) for (const { id } of EJES) if (texto(ev.ejes[id])) evEjes[id] = texto(ev.ejes[id]);
  const conf = esObj(json.confianza) ? json.confianza : {};
  const confianza = (k: string) => (esNumero(conf[k]) ? Math.max(0, Math.min(1, conf[k] as number)) : 0);
  const logo = esObj(json.logo) && texto(json.logo.archivo) ? { archivo: texto(json.logo.archivo) } : null;

  const base = diagnosticoVacio();
  const publico = publicoLimpio({ aquien: texto(pub.aquien), motiva: texto(pub.motiva), frena: texto(pub.frena) });
  const diagnostico: Omit<Diagnostico, "logo"> = {
    nombre: texto(dd.nombre) || empresa,
    rubro,
    rubro_secundario: secundario === rubro ? null : (secundario as Rubro | null),
    rubro_libre: texto(dd.rubro_libre) || null,
    ejes,
    // Tono y valor salen de los ejes si el perfilador no los fijó (igual que en el diagnóstico de la app).
    personalidad: { tono: tono ?? tonoDeEjes(ejes), valor: valor ?? valorDeEjes(ejes) },
    contenido,
    color_previo_hex: hex ? (hex as string).toUpperCase() : null,
    excluido_H: null,
    matiz_elegido: null,
    decision_color: base.decision_color,
    tiene_fotos_propias: dd.tiene_fotos_propias === true,
    tipografia_previa: tipografia,
    // El moodboard del rescate son los colores medidos: la auditoría los agrupa aparte.
    moodboard: [],
    competencia: [],
    ...(publico ? { publico } : {}),
  };

  return {
    ok: true,
    avisos,
    perfil: {
      formato: FORMATO_PERFIL,
      fuente: {
        empresa,
        usuario_red: texto(f.usuario_red) || null,
        fecha: texto(f.fecha) || new Date().toISOString(),
        archivos: Array.isArray(f.archivos) ? f.archivos.map(texto).filter(Boolean) : [],
      },
      diagnostico,
      logo,
      rescate: { grado, referencias },
      evidencia: {
        ejes: evEjes,
        tipografia_observada: texto(ev.tipografia_observada),
        notas: Array.isArray(ev.notas) ? ev.notas.map(texto).filter(Boolean) : [],
      },
      confianza: { ejes: confianza("ejes"), tono: confianza("tono"), rubro: confianza("rubro") },
    },
  };
}

function esHsl(v: unknown): v is HSL {
  return esObj(v) && esNumero(v.H) && esNumero(v.S) && esNumero(v.L) && v.H >= 0 && v.H <= 360 && v.S >= 0 && v.S <= 100 && v.L >= 0 && v.L <= 100;
}

/**
 * Marca en rescate armada desde un perfil válido. El chip sale del color previo medido: en grado rescate se hereda tal
 * cual (nada visible cambia, cap. E11); en refresco o evolución se usa su versión optimizada. Sin color previo, el
 * primer chip del rango de los ejes. La auditoría de color queda hecha con las referencias medidas.
 */
export function marcaDePerfil(perfil: Perfil, logo?: Partial<Diagnostico["logo"]>, organizacion_id?: string): Marca {
  const vacio = diagnosticoVacio();
  const d: Diagnostico = { ...vacio, ...perfil.diagnostico, logo: { ...vacio.logo, ...logo } };
  const chips = generarChips(d).filter((c) => c.resultado.paleta);
  const preferido = perfil.rescate.grado === "rescate" ? "previo-heredado" : "previo-optimizado";
  const chip = chips.find((c) => c.id === preferido) ?? chips[0];
  if (!chip) throw new Error("Ningún color del perfil da una paleta válida: revisar el diagnóstico a mano.");
  const marca = construirMarca(d, chip, organizacion_id);
  const { referencias, grado } = perfil.rescate;
  return { ...conRescate(marca, { grado, referencias, grupos: gruposDeReferencias(referencias) }), estado: "en_diagnostico" };
}
