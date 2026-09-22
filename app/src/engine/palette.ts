// Fórmula de paleta (manual cap. 3 / A.3, v1.1).

import { BLANCO, contraste, distanciaH, normalizarH, type HSL } from "./color";
import { L_tabla, PRESETS, type Rubro, type TipoAcento, type ValorMarca } from "./presets";

export const MIN_TEXTO = 4.5;
export const MIN_GRAFICO = 3;

export interface EntradaPaleta {
  rubro: Rubro;
  modo: "optimizado" | "heredado";
  /** Modo optimizado: matiz elegido en los chips. */
  H?: number;
  /** Modo heredado: color corporativo del cliente, inmutable. */
  heredado?: HSL;
  valor?: ValorMarca | null;
  /** Matiz del color excluido; la banda prohibida es ±25°. */
  excluido_H?: number | null;
}

/**
 * Texto sobre el acento. "tinta_marca" es el matiz de la marca en su versión profunda (L15): se agrega porque con solo
 * blanco o color de marca no hay acento que cumpla 4,5:1 con su texto y 3:1 sobre una marca oscura en Modo B.
 */
export type TextoAcento = "blanco" | "color_marca" | "tinta_marca";

export interface Acento extends HSL {
  texto: TextoAcento;
}

export const L_TINTA = 15;

export function tintaMarca(marcaTexto: HSL): HSL {
  return { H: marcaTexto.H, S: Math.max(marcaTexto.S, 40), L: L_TINTA };
}

export function colorTextoAcento(p: Paleta): HSL {
  if (p.acento.texto === "blanco") return BLANCO;
  if (p.acento.texto === "tinta_marca") return tintaMarca(colorTexto(p));
  return colorTexto(p);
}

export interface Paleta {
  color_marca: HSL;
  /** Solo en modo heredado cuando el original no alcanza 4,5:1 como texto. */
  version_funcional: HSL | null;
  tono_apoyo: HSL;
  fondo_neutro: HSL;
  acento: Acento;
  tipo_acento: TipoAcento;
  banda_prohibida: [number, number] | null;
  /** Modo heredado con L > 70: el Modo B pasa a ser el predominante. */
  invertir_modo: boolean;
}

export interface ResultadoPaleta {
  paleta: Paleta | null;
  estado: "ok" | "revision_manual";
  motivos: string[];
  /** Registro legible de cada decisión y ajuste, para mostrar en la reunión. */
  log: string[];
}

export const BANDA_PROHIBIDA_RADIO = 25;

export function enBandaProhibida(h: number, excluido: number | null | undefined): boolean {
  return excluido != null && distanciaH(h, excluido) <= BANDA_PROHIBIDA_RADIO;
}

export function tipoAcento(rubro: Rubro, valor?: ValorMarca | null): TipoAcento {
  if (valor === "energia" || valor === "innovacion") return "complementario";
  if (valor === "confianza" || valor === "calma") return "analogo";
  return PRESETS[rubro].acento_default;
}

/** Cap. 3 paso 6: baja L de a 2 hasta alcanzar 4,5:1 contra el fondo neutro. null si llega a L < 15. */
export function ajustarContraste(marca: HSL, fondo: HSL): HSL | null {
  let L = marca.L;
  while (contraste({ ...marca, L }, fondo) < MIN_TEXTO) {
    L -= 2;
    if (L < 15) return null;
  }
  return { ...marca, L };
}

function tonoApoyo(H: number, Lmarca: number, Lfondo: number, S = 55): HSL {
  return { H, S, L: Math.min(Math.round((Lmarca + Lfondo) / 2), 67) };
}

/** Matices candidatos para el acento, en el orden de la cascada del paso 5 (v1.1). */
function candidatosAcento(H: number, tipo: TipoAcento): number[] {
  const analogo = [H + 30, H - 30];
  const split = [H + 150, H + 210];
  const lista = tipo === "complementario" ? [H + 180, ...split, ...analogo] : [...analogo, ...split];
  return lista.map(normalizarH);
}

/** Acentos cálidos/claros (naranjas, amarillos, verdes, cianes) llevan texto oscuro, como en marcas reales. */
export function acentoEsClaro(h: number): boolean {
  return h >= 35 && h <= 200;
}

/**
 * Paso 4b (v1.1): ajusta L del acento conservando el matiz. Debe cumplir:
 *   - texto sobre el acento (blanco o color de marca) >= 4,5:1
 *   - acento sobre el color de marca (Modo B) >= 3:1
 * Primero recorre el camino preferido según el matiz y después el alternativo, siempre dentro de L 35-65.
 */
function ajustarAcento(h: number, marcaTexto: HSL, marcaFondo: HSL, log: string[]): Acento | null {
  const S = 85;
  const subir = rango(50, 65, 2);
  const oscuros = [
    { texto: "color_marca" as const, Ls: subir },
    { texto: "tinta_marca" as const, Ls: subir },
  ];
  const blanco = { texto: "blanco" as const, Ls: rango(50, 35, -2) };
  const caminos = acentoEsClaro(h) ? [...oscuros, blanco] : [blanco, ...oscuros];
  for (const camino of caminos) {
    const colorTexto =
      camino.texto === "blanco" ? BLANCO : camino.texto === "tinta_marca" ? tintaMarca(marcaTexto) : marcaTexto;
    for (const L of camino.Ls) {
      const a = { H: h, S, L };
      if (contraste(a, colorTexto) >= MIN_TEXTO && contraste(a, marcaFondo) >= MIN_GRAFICO) {
        if (camino !== caminos[0]) log.push(`Acento H${h}: el camino preferido no alcanzó, se usa texto ${camino.texto}.`);
        return { ...a, texto: camino.texto };
      }
    }
  }
  return null;
}

function rango(desde: number, hasta: number, paso: number): number[] {
  const out: number[] = [];
  for (let v = desde; paso > 0 ? v <= hasta : v >= hasta; v += paso) out.push(v);
  if (out[out.length - 1] !== hasta) out.push(hasta);
  return out;
}

function resolverAcento(
  H: number,
  tipo: TipoAcento,
  excluido: number | null | undefined,
  marcaTexto: HSL,
  marcaFondo: HSL,
  log: string[],
): Acento | null {
  for (const h of candidatosAcento(H, tipo)) {
    if (enBandaProhibida(h, excluido)) {
      log.push(`Acento H${h} cae en la banda prohibida, se prueba el siguiente de la cascada.`);
      continue;
    }
    const a = ajustarAcento(h, marcaTexto, marcaFondo, log);
    if (a) return a;
    log.push(`Acento H${h}: ninguna L entre 35 y 65 cumple 4,5:1 con su texto y 3:1 sobre la marca.`);
  }
  // Último paso de la cascada: mismo matiz que la marca, diferenciado por S y L.
  for (const L of rango(60, 80, 2)) {
    const a = { H, S: 90, L };
    for (const texto of ["color_marca", "tinta_marca", "blanco"] as const) {
      const t = texto === "blanco" ? BLANCO : texto === "tinta_marca" ? tintaMarca(marcaTexto) : marcaTexto;
      if (contraste(a, t) >= MIN_TEXTO && contraste(a, marcaFondo) >= MIN_GRAFICO) {
        log.push(`Acento resuelto con el mismo matiz de la marca (H${H} S90 L${L}).`);
        return { ...a, texto };
      }
    }
  }
  return null;
}

export function derivarPaleta(e: EntradaPaleta): ResultadoPaleta {
  const log: string[] = [];
  const motivos: string[] = [];
  const tipo = tipoAcento(e.rubro, e.valor);
  const banda: [number, number] | null =
    e.excluido_H != null
      ? [normalizarH(e.excluido_H - BANDA_PROHIBIDA_RADIO), normalizarH(e.excluido_H + BANDA_PROHIBIDA_RADIO)]
      : null;
  log.push(`Acento ${tipo} (${e.valor ? `personalidad: ${e.valor}` : "default del rubro"}).`);

  if (e.modo === "optimizado") {
    if (e.H == null) throw new Error("Modo optimizado requiere H");
    const H = normalizarH(Math.round(e.H));
    const fondo: HSL = { H, S: 30, L: 92 };
    const inicial: HSL = { H, S: 70, L: L_tabla(H) };
    const marca = ajustarContraste(inicial, fondo);
    if (!marca) {
      return { paleta: null, estado: "revision_manual", motivos: ["L < 15 sin alcanzar 4,5:1"], log };
    }
    if (marca.L !== inicial.L) log.push(`Función de ajuste: L de marca ${inicial.L} → ${marca.L}.`);
    const acento = resolverAcento(H, tipo, e.excluido_H, marca, marca, log);
    if (!acento) motivos.push("No se encontró un acento que cumpla los mínimos de contraste");
    return {
      paleta: acento
        ? {
            color_marca: marca,
            version_funcional: null,
            tono_apoyo: tonoApoyo(H, marca.L, fondo.L),
            fondo_neutro: fondo,
            acento,
            tipo_acento: tipo,
            banda_prohibida: banda,
            invertir_modo: false,
          }
        : null,
      estado: acento ? "ok" : "revision_manual",
      motivos,
      log,
    };
  }

  // Modo heredado (paso 8): el color del cliente no se toca, se ajusta lo que lo rodea.
  if (!e.heredado) throw new Error("Modo heredado requiere el color del cliente");
  const orig = { ...e.heredado, H: normalizarH(e.heredado.H) };
  const H = orig.H;
  let fondo: HSL = { H, S: 30, L: 92 };

  // Cascada 1: ajustar L del fondo neutro dentro de 85-100.
  if (contraste(orig, fondo) < MIN_TEXTO) {
    const mejor = rango(92, 100, 2)
      .map((L) => ({ ...fondo, L }))
      .find((f) => contraste(orig, f) >= MIN_TEXTO);
    if (mejor) {
      log.push(`Fondo neutro ajustado a L${mejor.L} para alcanzar 4,5:1 con el color heredado.`);
      fondo = mejor;
    }
  }

  // Cascada 2: versión funcional para texto, íconos y elementos finos.
  let funcional: HSL | null = null;
  if (contraste(orig, fondo) < MIN_TEXTO) {
    funcional = ajustarContraste({ H, S: orig.S, L: L_tabla(H) }, fondo);
    if (!funcional) {
      return { paleta: null, estado: "revision_manual", motivos: ["Versión funcional sin contraste (L < 15)"], log };
    }
    log.push(`Versión funcional generada: H${H} S${orig.S} L${funcional.L} (texto e íconos).`);
  }
  const texto = funcional ?? orig;

  // El original como fondo/masa (mínimo 3:1): contra el fondo neutro, o contra la versión funcional encima.
  const sirveComoFondo =
    contraste(orig, fondo) >= MIN_GRAFICO || (funcional != null && contraste(orig, funcional) >= MIN_GRAFICO);
  const sirveComoTexto = funcional == null;
  if (!sirveComoFondo && !sirveComoTexto) {
    return {
      paleta: null,
      estado: "revision_manual",
      motivos: ["El color heredado no funciona ni como texto ni como fondo"],
      log,
    };
  }

  // Cascada 3: color claro rinde mejor como fondo, se invierte el modo predominante.
  const invertir = orig.L > 70;
  if (invertir) log.push("Color heredado con L > 70: el Modo B pasa a ser el predominante.");

  const acento = resolverAcento(H, tipo, e.excluido_H, texto, orig, log);
  if (!acento) motivos.push("No se encontró un acento que cumpla los mínimos de contraste");
  return {
    paleta: acento
      ? {
          color_marca: orig,
          version_funcional: funcional,
          tono_apoyo: tonoApoyo(H, texto.L, fondo.L, Math.min(55, Math.max(orig.S, 20))),
          fondo_neutro: fondo,
          acento,
          tipo_acento: tipo,
          banda_prohibida: banda,
          invertir_modo: invertir,
        }
      : null,
    estado: acento ? "ok" : "revision_manual",
    motivos,
    log,
  };
}

/** Color que va como texto sobre el fondo neutro (marca o su versión funcional). */
export function colorTexto(p: Paleta): HSL {
  return p.version_funcional ?? p.color_marca;
}

export interface ColoresModo {
  fondo: HSL;
  texto: HSL;
  /** Masas de forma, nunca texto ni íconos. */
  apoyo: HSL;
  logo: "color" | "mono_claro" | "mono_oscuro";
}

/** Cap. 3 paso 7 y cap. 6 (selección de logo): qué color va en cada rol según el modo. */
export function coloresModo(p: Paleta, modo: "A" | "B"): ColoresModo {
  if (modo === "A") {
    return { fondo: p.fondo_neutro, texto: colorTexto(p), apoyo: p.tono_apoyo, logo: "color" };
  }
  // Modo B: la marca es el fondo; el texto va en fondo neutro salvo que no contraste (color heredado claro).
  const neutroSirve = contraste(p.color_marca, p.fondo_neutro) >= MIN_TEXTO;
  const texto = neutroSirve ? p.fondo_neutro : colorTexto(p);
  const oscuro = contraste(p.color_marca, BLANCO) >= MIN_GRAFICO;
  return { fondo: p.color_marca, texto, apoyo: p.tono_apoyo, logo: oscuro ? "mono_claro" : "mono_oscuro" };
}
