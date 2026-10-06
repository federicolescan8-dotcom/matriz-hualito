// Fórmula de paleta (manual cap. 3 / A.3, v1.1).

import { BLANCO, contraste, desdeOklch, distanciaColor, distanciaH, mezclar, normalizarH, oklch, type HSL } from "./color";
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
  /**
   * Modo heredado: si el color del cliente no alcanza 4,5:1 como texto, usar versión funcional (por defecto) o
   * respetar solo el color heredado (false, decisión del cliente, v1.1). Sin funcional, lo que no cumpla queda como aviso.
   */
  funcional?: boolean;
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
  /** Tratamiento del CTA en Modo B elegido a mano; si falta, se resuelve solo (ver ctaModoB). */
  cta_modo_b?: CtaModoB;
}

export interface ResultadoPaleta {
  paleta: Paleta | null;
  estado: "ok" | "revision_manual";
  motivos: string[];
  /** Controles que no cumplen y se aceptan por decisión del cliente (heredado sin versión funcional). */
  avisos?: string[];
  /** Modo heredado: el color del cliente no alcanza como texto y hay que elegir si se usa versión funcional. */
  requiere_funcional?: boolean;
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
 * Primero recorre el camino preferido según el matiz y después el alternativo, dentro de L 35-65.
 * Con `ampliado` el rango pasa a L 15-85: solo se usa cuando la cascada normal no encontró acento (colores de tono
 * medio, donde el acento tiene que ser muy claro o muy oscuro para separarse de la marca).
 */
function ajustarAcento(h: number, marcaTexto: HSL, marcaFondo: HSL, log: string[], ampliado = false): Acento | null {
  const S = 85;
  const subir = rango(50, ampliado ? 85 : 65, 2);
  const oscuros = [
    { texto: "color_marca" as const, Ls: subir },
    { texto: "tinta_marca" as const, Ls: subir },
  ];
  const blanco = { texto: "blanco" as const, Ls: rango(50, ampliado ? 15 : 35, -2) };
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
  const candidatos = candidatosAcento(H, tipo).filter((h) => {
    const fuera = !enBandaProhibida(h, excluido);
    if (!fuera) log.push(`Acento H${h} cae en la banda prohibida, se prueba el siguiente de la cascada.`);
    return fuera;
  });
  for (const h of candidatos) {
    const a = ajustarAcento(h, marcaTexto, marcaFondo, log);
    if (a) return a;
    log.push(`Acento H${h}: ninguna L entre 35 y 65 cumple 4,5:1 con su texto y 3:1 sobre la marca.`);
  }
  // Segunda pasada con L 15-85, en el mismo orden de matices.
  for (const h of candidatos) {
    const a = ajustarAcento(h, marcaTexto, marcaFondo, log, true);
    if (a) {
      log.push(`Acento resuelto con rango de luminosidad ampliado (H${h} L${a.L}).`);
      return a;
    }
  }
  // Último paso de la cascada: mismo matiz que la marca, diferenciado por S y L.
  for (const L of [...rango(60, 90, 2), ...rango(20, 8, -2)]) {
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

  const requiere_funcional = contraste(orig, fondo) < MIN_TEXTO;
  if (requiere_funcional && e.funcional === false) return heredadoSinFuncional(orig, tipo, banda, e.excluido_H, log);

  // Cascada 2: versión funcional para texto, íconos y elementos finos.
  let funcional: HSL | null = null;
  if (contraste(orig, fondo) < MIN_TEXTO) {
    funcional = ajustarContraste({ H, S: orig.S, L: L_tabla(H) }, fondo);
    if (!funcional) {
      return { paleta: null, estado: "revision_manual", motivos: ["Versión funcional sin contraste (L < 15)"], log, requiere_funcional };
    }
    log.push(`Versión funcional generada: H${H} S${orig.S} L${funcional.L} (texto e íconos).`);
  }

  // Cascada 2b (v1.1): si el original tampoco sirve como fondo con texto encima (Modo B), se profundiza la versión
  // funcional hasta que funcione sobre él. Así un color de tono medio (ni claro ni oscuro) no requiere revisión:
  // el original queda para masas y fondos, y la funcional hace de texto sobre el neutro y sobre el original.
  if (funcional && Math.max(contraste(orig, fondo), contraste(orig, funcional)) < MIN_TEXTO) {
    const candidatos = rango(funcional.L, 6, -2).map((L) => ({ ...funcional!, L }));
    const profunda =
      candidatos.find((f) => contraste(orig, f) >= MIN_TEXTO) ??
      candidatos.find((f) => contraste(orig, f) >= MIN_GRAFICO);
    if (profunda && profunda.L !== funcional.L) {
      log.push(`Versión funcional profundizada a L${profunda.L} para que también funcione como texto sobre el color original.`);
      funcional = profunda;
    }
  }
  const texto = funcional ?? orig;

  // Guarda: el original tiene que servir como texto (sin funcional) o como fondo (3:1 con algún texto encima).
  const sirveComoFondo =
    contraste(orig, fondo) >= MIN_GRAFICO || (funcional != null && contraste(orig, funcional) >= MIN_GRAFICO);
  if (funcional && !sirveComoFondo) {
    return {
      paleta: null,
      estado: "revision_manual",
      motivos: ["El color heredado no funciona ni como texto ni como fondo"],
      log,
      requiere_funcional,
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
    requiere_funcional,
  };
}

/**
 * Modo heredado sin versión funcional (v1.1, decisión del cliente): el color heredado es el color de marca y también el
 * texto. El resto de la paleta se genera desde él lo más apegado posible a la fórmula; lo que no alcance los mínimos no
 * se fuerza cambiando el color de marca: queda como aviso, y la ficha sugiere el tono de apoyo, el fondo neutro o el
 * acento más próximos que cumplen.
 */
function heredadoSinFuncional(
  orig: HSL,
  tipo: TipoAcento,
  banda: [number, number] | null,
  excluido: number | null | undefined,
  log: string[],
): ResultadoPaleta {
  const H = orig.H;
  log.push("Sin versión funcional por decisión del cliente: el color heredado se usa también como texto.");
  // Fondo neutro: el de la fórmula (S30) con la L de 85 a 100 que más contraste con el heredado.
  const fondo = rango(85, 100, 1)
    .map((L) => ({ H, S: 30, L }))
    .reduce((a, b) => (contraste(orig, b) > contraste(orig, a) ? b : a));
  log.push(`Fondo neutro en L${fondo.L}: el de mayor contraste con el heredado (${contraste(orig, fondo).toFixed(1)}:1).`);
  const acento = resolverAcento(H, tipo, excluido, orig, orig, log) ?? acentoMasCercano(H, tipo, excluido, orig);
  const paleta: Paleta = {
    color_marca: orig,
    version_funcional: null,
    tono_apoyo: tonoApoyo(H, orig.L, fondo.L, Math.min(55, Math.max(orig.S, 20))),
    fondo_neutro: fondo,
    acento,
    tipo_acento: tipo,
    banda_prohibida: banda,
    invertir_modo: orig.L > 70,
  };
  const avisos = fallasPaleta(paleta).map((c) => `${c.control}: ${c.valor.toFixed(1)}:1 (mín. ${c.minimo})`);
  return { paleta, estado: "ok", motivos: [], avisos, log, requiere_funcional: true };
}

/** Acento que más se acerca a los mínimos (4,5:1 con su texto y 3:1 sobre la marca) cuando ninguno los cumple. */
function acentoMasCercano(H: number, tipo: TipoAcento, excluido: number | null | undefined, marca: HSL): Acento {
  let mejor: Acento = { H: normalizarH(H + 180), S: 85, L: 50, texto: "blanco" };
  let puntaje = -Infinity;
  for (const h of candidatosAcento(H, tipo).filter((x) => !enBandaProhibida(x, excluido))) {
    for (const L of rango(10, 90, 2)) {
      for (const texto of ["blanco", "color_marca", "tinta_marca"] as const) {
        const a = { H: h, S: 85, L };
        const t = texto === "blanco" ? BLANCO : texto === "tinta_marca" ? tintaMarca(marca) : marca;
        const p = Math.min(contraste(a, t) / MIN_TEXTO, contraste(a, marca) / MIN_GRAFICO);
        if (p > puntaje) {
          puntaje = p;
          mejor = { ...a, texto };
        }
      }
    }
  }
  return mejor;
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
  // Modo B: la marca es el fondo; el texto va en fondo neutro, o en la versión funcional si contrasta más
  // (color heredado claro o de tono medio).
  const texto =
    contraste(p.color_marca, p.fondo_neutro) >= contraste(p.color_marca, colorTexto(p)) ? p.fondo_neutro : colorTexto(p);
  const oscuro = contraste(p.color_marca, BLANCO) >= MIN_GRAFICO;
  return { fondo: p.color_marca, texto, apoyo: p.tono_apoyo, logo: oscuro ? "mono_claro" : "mono_oscuro" };
}

export type RolPaleta = "color_marca" | "version_funcional" | "tono_apoyo" | "fondo_neutro" | "acento";

/**
 * Texto sobre el acento para un acento dado: el primero que alcance 4,5:1 en el orden preferido según el matiz
 * (paso 4b); si ninguno llega, el de mayor contraste.
 */
export function elegirTextoAcento(p: Paleta): TextoAcento {
  const orden: TextoAcento[] = acentoEsClaro(p.acento.H)
    ? ["color_marca", "tinta_marca", "blanco"]
    : ["blanco", "color_marca", "tinta_marca"];
  const ratio = (t: TextoAcento) => contraste(p.acento, colorTextoAcento({ ...p, acento: { ...p.acento, texto: t } }));
  return orden.find((t) => ratio(t) >= MIN_TEXTO) ?? orden.reduce((a, b) => (ratio(b) > ratio(a) ? b : a));
}

/** Ajuste manual de un rol desde la ficha de marca. El texto sobre el acento se vuelve a elegir siempre. */
export function ajustarRol(p: Paleta, rol: RolPaleta, color: HSL): Paleta {
  const nueva: Paleta =
    rol === "acento" ? { ...p, acento: { ...color, texto: p.acento.texto } } : { ...p, [rol]: color };
  return { ...nueva, acento: { ...nueva.acento, texto: elegirTextoAcento(nueva) } };
}

/** Relación real entre el acento y la marca (puede diferir de la pedida si la cascada cambió el matiz). */
export function relacionAcento(p: Paleta): string {
  const d = distanciaH(p.acento.H, p.color_marca.H);
  if (d <= 5) return "mismo matiz";
  if (Math.abs(d - 30) <= 5) return "análogo";
  if (Math.abs(d - 150) <= 5) return "split-complementario";
  if (d >= 175) return "complementario";
  return `a ${Math.round(d)}° de la marca`;
}

/**
 * Cómo va el CTA en Modo B, donde el fondo es el color de marca (v1.1):
 *   - directo:    botón en acento sobre la marca. Requiere acento vs. marca >= 3:1.
 *   - contorno:   botón en acento con un anillo de fondo neutro que lo separa de la marca.
 *   - invertido:  botón en fondo neutro con el texto en acento.
 * Contorno e invertido permiten usar un acento de luminosidad parecida a la marca (p. ej. rojo sobre verde), que
 * se distingue solo por matiz y se pierde para quien no ve bien esa diferencia de color.
 */
export type CtaModoB = "directo" | "contorno" | "invertido";

export interface ControlContraste {
  control: string;
  valor: number;
  minimo: number;
}

export function controlesCtaModoB(p: Paleta, modo: CtaModoB): ControlContraste[] {
  const texto = colorTextoAcento(p);
  if (modo === "directo") {
    return [
      { control: "texto sobre el acento", valor: contraste(p.acento, texto), minimo: MIN_TEXTO },
      { control: "acento sobre la marca", valor: contraste(p.acento, p.color_marca), minimo: MIN_GRAFICO },
    ];
  }
  if (modo === "contorno") {
    return [
      { control: "texto sobre el acento", valor: contraste(p.acento, texto), minimo: MIN_TEXTO },
      { control: "acento sobre el contorno", valor: contraste(p.acento, p.fondo_neutro), minimo: MIN_GRAFICO },
      { control: "contorno sobre la marca", valor: contraste(p.fondo_neutro, p.color_marca), minimo: MIN_GRAFICO },
    ];
  }
  return [
    { control: "acento como texto sobre el botón", valor: contraste(p.acento, p.fondo_neutro), minimo: MIN_TEXTO },
    { control: "botón sobre la marca", valor: contraste(p.fondo_neutro, p.color_marca), minimo: MIN_GRAFICO },
  ];
}

export function cumple(controles: ControlContraste[]): boolean {
  return controles.every((c) => c.valor >= c.minimo);
}

/** Resolución automática: directo si alcanza; si no, contorno; si no, invertido; si nada cumple, contorno. */
export function ctaModoBAuto(p: Paleta): CtaModoB {
  const orden: CtaModoB[] = ["directo", "contorno", "invertido"];
  return orden.find((m) => cumple(controlesCtaModoB(p, m))) ?? "contorno";
}

/**
 * Tratamiento vigente: el elegido a mano solo si cumple sus controles (una corrección de colores posterior puede
 * invalidarlo); si no, el automático.
 */
export function ctaModoB(p: Paleta): CtaModoB {
  return p.cta_modo_b && cumple(controlesCtaModoB(p, p.cta_modo_b)) ? p.cta_modo_b : ctaModoBAuto(p);
}

/** El tratamiento elegido a mano no cumple con los colores actuales y se está usando el automático. */
export function ctaModoBElegidoInvalido(p: Paleta): boolean {
  return p.cta_modo_b != null && !cumple(controlesCtaModoB(p, p.cta_modo_b));
}

/**
 * CTA en Modo A (fondo neutro). Un acento claro (amarillos, cianes) se lee bien con su texto pero el botón se funde
 * con el fondo neutro claro: en ese caso lleva un contorno fino en el color de texto de la marca, como los botones
 * claros con borde de las marcas reales.
 */
export type CtaModoA = "directo" | "contorno";

export function controlesCtaModoA(p: Paleta, modo: CtaModoA): ControlContraste[] {
  const base = { control: "texto sobre el acento", valor: contraste(p.acento, colorTextoAcento(p)), minimo: MIN_TEXTO };
  return modo === "directo"
    ? [base, { control: "acento sobre el fondo neutro", valor: contraste(p.acento, p.fondo_neutro), minimo: MIN_GRAFICO }]
    : [base, { control: "contorno sobre el fondo neutro", valor: contraste(colorTexto(p), p.fondo_neutro), minimo: MIN_GRAFICO }];
}

export function ctaModoA(p: Paleta): CtaModoA {
  return cumple(controlesCtaModoA(p, "directo")) ? "directo" : "contorno";
}

export interface EstiloCta {
  tratamiento: CtaModoA | CtaModoB;
  fondo: HSL;
  texto: HSL;
  /** Anillo alrededor del botón (contorno) y su grosor en px sobre un lienzo de 1080. */
  anillo: { color: HSL; px: number } | null;
}

/** Colores del botón de CTA según el modo y su tratamiento. */
export function estiloCta(p: Paleta, modo: "A" | "B"): EstiloCta {
  if (modo === "A") {
    const t = ctaModoA(p);
    return {
      tratamiento: t,
      fondo: p.acento,
      texto: colorTextoAcento(p),
      anillo: t === "contorno" ? { color: colorTexto(p), px: 4 } : null,
    };
  }
  const t = ctaModoB(p);
  return {
    tratamiento: t,
    fondo: t === "invertido" ? p.fondo_neutro : p.acento,
    texto: t === "invertido" ? p.acento : colorTextoAcento(p),
    anillo: t === "contorno" ? { color: p.fondo_neutro, px: 8 } : null,
  };
}

/**
 * Opacidad máxima (hasta `base`) de una forma decorativa puesta sobre `fondo`, para que el texto que le pasa por
 * encima siga cumpliendo `minimo` contra la mezcla. La forma nunca puede bajar el contraste del texto (cap. 5).
 */
export function opacidadSegura(fondo: HSL, forma: HSL, texto: HSL, base: number, minimo = MIN_TEXTO): number {
  for (let a = base; a > 0; a = Math.round((a - 0.01) * 100) / 100) {
    if (contraste(texto, mezclar(fondo, forma, a)) >= minimo) return a;
  }
  return 0;
}

/**
 * CTA sobre un fondo arbitrario (v1.1: la cúpula del 2B-S, donde el botón se apoya sobre la capa decorativa). Se
 * elige el primer tratamiento que cumple: directo, con contorno (anillo del color que más contraste con el fondo) o
 * invertido (botón de ese color con el texto en acento o en color de marca).
 */
export function estiloCtaSobre(p: Paleta, fondo: HSL): EstiloCta {
  const texto = colorTextoAcento(p);
  if (contraste(p.acento, fondo) >= MIN_GRAFICO && contraste(p.acento, texto) >= MIN_TEXTO) {
    return { tratamiento: "directo", fondo: p.acento, texto, anillo: null };
  }
  // Candidatos de contorno: neutro, marca, su tinta profunda (para fondos de luminosidad media) y blanco.
  const [anillo] = [p.fondo_neutro, colorTexto(p), tintaMarca(colorTexto(p)), BLANCO].sort(
    (a, b) => contraste(b, fondo) - contraste(a, fondo),
  );
  if (contraste(anillo, fondo) >= MIN_GRAFICO && contraste(p.acento, anillo) >= MIN_GRAFICO && contraste(p.acento, texto) >= MIN_TEXTO) {
    return { tratamiento: "contorno", fondo: p.acento, texto, anillo: { color: anillo, px: 8 } };
  }
  // Invertido: botón del color que más contrasta con el fondo; el texto va en acento si se lee, si no en el color de la
  // paleta que más contraste con el botón.
  const [textoInv] = [p.acento, colorTexto(p), tintaMarca(colorTexto(p)), p.fondo_neutro, BLANCO].sort(
    (a, b) => (contraste(b, anillo) >= MIN_TEXTO && b === p.acento ? 1 : 0) - (contraste(a, anillo) >= MIN_TEXTO && a === p.acento ? 1 : 0) || contraste(b, anillo) - contraste(a, anillo),
  );
  return { tratamiento: "invertido", fondo: anillo, texto: textoInv, anillo: null };
}

export function controlesCtaSobre(p: Paleta, fondo: HSL): ControlContraste[] {
  const e = estiloCtaSobre(p, fondo);
  const lista: ControlContraste[] = [{ control: "texto sobre el botón", valor: contraste(e.fondo, e.texto), minimo: MIN_TEXTO }];
  if (e.anillo) {
    lista.push({ control: "contorno sobre la capa decorativa", valor: contraste(e.anillo.color, fondo), minimo: MIN_GRAFICO });
    lista.push({ control: "botón sobre el contorno", valor: contraste(e.fondo, e.anillo.color), minimo: MIN_GRAFICO });
  } else {
    lista.push({ control: "botón sobre la capa decorativa", valor: contraste(e.fondo, fondo), minimo: MIN_GRAFICO });
  }
  return lista;
}

/** Fondo sobre el que se apoyan el CTA y el logo en la cúpula del 2B-S. Con foto, el overlay de marca domina. */
export function fondoCapaDecorativa(p: Paleta, relleno: "foto" | "patron" | "icono"): HSL {
  return relleno === "foto" ? p.color_marca : p.tono_apoyo;
}

/**
 * Controles de la paleta completa (v1.1, ajuste manual). Cada control indica qué roles intervienen: sirven para marcar
 * en la ficha qué color ajustado a mano rompe la fórmula y para buscar el color válido más próximo.
 */
export interface ControlPaleta extends ControlContraste {
  roles: RolPaleta[];
}

export function controlesPaleta(p: Paleta): ControlPaleta[] {
  const rolTexto: RolPaleta = p.version_funcional ? "version_funcional" : "color_marca";
  const B = coloresModo(p, "B");
  const lista: ControlPaleta[] = [
    { control: "texto de marca sobre el fondo neutro", valor: contraste(colorTexto(p), p.fondo_neutro), minimo: MIN_TEXTO, roles: [rolTexto, "fondo_neutro"] },
    { control: "texto sobre la marca (Modo B)", valor: contraste(B.texto, p.color_marca), minimo: MIN_GRAFICO, roles: ["color_marca", "fondo_neutro", rolTexto] },
    { control: "texto sobre el acento", valor: contraste(p.acento, colorTextoAcento(p)), minimo: MIN_TEXTO, roles: ["acento", rolTexto] },
  ];
  if (p.version_funcional) {
    lista.push({ control: "versión funcional sobre la marca", valor: contraste(p.version_funcional, p.color_marca), minimo: MIN_GRAFICO, roles: ["version_funcional", "color_marca"] });
  }
  // CTA: vale el mejor tratamiento disponible en cada modo (el peor control de ese tratamiento).
  const peor = (cs: ControlContraste[]) => cs.reduce((a, b) => (b.valor / b.minimo < a.valor / a.minimo ? b : a));
  const mejorB = peor(controlesCtaModoB(p, ctaModoBAuto(p)));
  lista.push({ control: `CTA en Modo B: ${mejorB.control}`, valor: mejorB.valor, minimo: mejorB.minimo, roles: ["acento", "color_marca", "fondo_neutro"] });
  const mejorA = peor(controlesCtaModoA(p, ctaModoA(p)));
  lista.push({ control: `CTA en Modo A: ${mejorA.control}`, valor: mejorA.valor, minimo: mejorA.minimo, roles: ["acento", "fondo_neutro", rolTexto] });
  const cupula = peor(controlesCtaSobre(p, p.tono_apoyo));
  lista.push({ control: `CTA sobre el tono de apoyo: ${cupula.control}`, valor: cupula.valor, minimo: cupula.minimo, roles: ["tono_apoyo", "acento"] });
  return lista;
}

/** Controles de la paleta que no cumplen y en los que interviene `rol` (o todos, si no se indica). */
export function fallasPaleta(p: Paleta, rol?: RolPaleta): ControlPaleta[] {
  return controlesPaleta(p).filter((c) => c.valor < c.minimo && (!rol || c.roles.includes(rol)));
}

/**
 * Lo que comparten las dos sugerencias del ajuste manual: la banda prohibida (solo para marca y acento), los controles
 * que tiene que cumplir el rol y la luminosidad HSL que le da la fórmula (el fondo neutro es claro y el tono de apoyo no
 * pasa de L67).
 */
function restriccionesRol(p: Paleta, rol: RolPaleta) {
  const excluido = p.banda_prohibida ? normalizarH(p.banda_prohibida[0] + BANDA_PROHIBIDA_RADIO) : null;
  const vigilaBanda = rol === "color_marca" || rol === "acento";
  const [Lmin, Lmax] = rol === "fondo_neutro" ? [85, 100] : rol === "tono_apoyo" ? [0, 67] : [0, 100];
  return {
    enBanda: (H: number) => vigilaBanda && enBandaProhibida(H, excluido),
    valido: (c: HSL) => fallasPaleta(ajustarRol(p, rol, c), rol).length === 0,
    Lmin,
    Lmax,
  };
}

/**
 * Color más próximo a `deseado` (ΔE en CIELAB) que, puesto en `rol` con el resto de la paleta como está, cumple todos
 * los controles en los que interviene ese rol y queda fuera de la banda prohibida. Prioriza conservar el matiz: se
 * recorre primero la luminosidad y la saturación, y el matiz se aleja a lo sumo 40°. Null si no hay ninguno.
 */
export function colorValidoCercano(p: Paleta, rol: RolPaleta, deseado: HSL): HSL | null {
  const { enBanda, valido, Lmin, Lmax } = restriccionesRol(p, rol);
  // El primero que cumple entre los candidatos, del más próximo al más lejano.
  const buscar = (Hs: number[], Ss: number[], Ls: number[]) => {
    const candidatos: { c: HSL; d: number }[] = [];
    for (const h of Hs) {
      const H = normalizarH(Math.round(h));
      if (enBanda(H)) continue;
      for (const S of Ss) for (const L of Ls) candidatos.push({ c: { H, S, L }, d: distanciaColor({ H, S, L }, deseado) });
    }
    candidatos.sort((a, b) => a.d - b.d);
    return candidatos.find(({ c }) => valido(c))?.c ?? null;
  };
  const pasos = (desde: number, hasta: number, paso: number) =>
    Array.from({ length: Math.floor((hasta - desde) / paso) + 1 }, (_, i) => desde + i * paso);
  const dentro = (v: number) => Math.min(100, Math.max(0, v));
  // Grilla gruesa y después un refinamiento alrededor del resultado.
  const grueso = buscar(pasos(deseado.H - 40, deseado.H + 40, 5), pasos(0, 100, 5), pasos(Lmin, Lmax, rol === "fondo_neutro" ? 1 : 2));
  if (!grueso) return null;
  const fino = buscar(
    pasos(grueso.H - 4, grueso.H + 4, 1),
    pasos(dentro(grueso.S - 5), dentro(grueso.S + 5), 1),
    pasos(Math.max(Lmin, grueso.L - 3), Math.min(Lmax, grueso.L + 3), 1),
  );
  return fino ?? grueso;
}

/**
 * Variante por contraste de la sugerencia (paso 9, técnica de Adobe Leonardo): conserva el matiz y el croma percibidos
 * de `deseado` (OKLCH) y mueve solo la luminosidad, del cambio más chico al más grande, hasta cumplir los mismos
 * controles que `colorValidoCercano`. A diferencia de esa, nunca cambia el matiz: el resultado es el mismo color, más
 * claro o más oscuro. Si el croma no entra en sRGB a esa luminosidad, se baja. Null si ninguna luminosidad cumple.
 */
export function colorPorContraste(p: Paleta, rol: RolPaleta, deseado: HSL): HSL | null {
  const { enBanda, valido, Lmin, Lmax } = restriccionesRol(p, rol);
  const [L0, C, h] = oklch(deseado);
  const Ls = [L0, ...Array.from({ length: 201 }, (_, i) => i / 200)].sort((a, b) => Math.abs(a - L0) - Math.abs(b - L0));
  for (const L of Ls) {
    const c = desdeOklch(L, C, h);
    if (c.L < Lmin || c.L > Lmax || enBanda(c.H)) continue;
    if (valido(c)) return c;
  }
  return null;
}
