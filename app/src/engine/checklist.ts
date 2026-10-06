// Checklist de control de calidad (manual cap. 8 / A.8, v1.1).
// Función pura: recibe la pieza, la marca y las medidas reales tomadas del render (cajas, tamaños, líneas) y
// devuelve cada control con resultado binario y acción. No depende del navegador, así que se testea directo.

import { contraste, mezclar, type HSL } from "./color";
import type { Marca } from "./diagnostico";
import { FORMATOS } from "./formatos";
import {
  coloresModo,
  controlesCtaModoA,
  controlesCtaModoB,
  controlesCtaSobre,
  ctaModoA,
  ctaModoB,
  fondoCapaDecorativa,
  MIN_GRAFICO,
  MIN_TEXTO,
} from "./palette";
import { alineacionesPermitidas, h1Minimo, MAX_CONTACTO, maxIconos, maxItems, plantillaPara, PLANTILLAS, type Aceptacion, type Pieza } from "./pieza";
import { decoracionEfectiva, tocaDecoracion, type GeometriaDecoracion } from "./decoraciones";
import { OPACIDAD_ICONO_DECO, OPACIDAD_PATRON, OVERLAY_FOTO, type TipoDeco } from "./biblioteca";
import { AREA_SEGURIDAD, LOGO_MIN_PX } from "./logo";
import { FACTOR_STORY, familiaTexto, JERARQUIA_H1, pesoH1 } from "./typography";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MedidaTexto {
  /** Cajas de cada línea de texto (más ajustadas que la caja del bloque). */
  lineas: Rect[];
  px: number;
  peso: number;
  italica: boolean;
}

export interface Medicion {
  h1: MedidaTexto;
  body: MedidaTexto | null;
  cta: (MedidaTexto & { caja: Rect }) | null;
  logo: Rect | null;
  /** Color del logo tal como está dibujado (E4): blanco, tinta o su color dominante. Null si no se conoce. */
  logoColor?: HSL | null;
  /** Fondo inmediato sobre el que está el logo (E4). */
  logoFondo?: HSL | null;
  /** El logo es una imagen cargada (E4). Sin logo cargado, en su lugar va el nombre en texto, que no se controla. */
  logoImagen?: boolean;
  /** Forma de fondo (función estructural) con su color y opacidad efectivos. */
  forma: { caja: Rect; color: HSL; opacidad: number } | null;
  /** El texto no entró en su slot ni siquiera al tamaño mínimo. */
  desborde: boolean;
  /** Capa decorativa (variantes 2B). */
  deco?: {
    tipo: TipoDeco;
    caja: Rect;
    opacidad: number;
    overlay: number | null;
    color: HSL;
    /** Foto protagonista (círculo del 2B-L): va sin overlay de marca. */
    protagonista?: boolean;
    /** Si la capa es un círculo, su geometría: el choque con el texto se mide contra el círculo, no contra su caja. */
    circulo?: { cx: number; cy: number; r: number };
    /** 2B-L vertical con otra forma: su contorno muestreado, para medir el choque contra la forma real. */
    contorno?: { x: number; y: number }[];
  } | null;
  /** Total de íconos en la pieza (decorativos e informativos). */
  iconos?: number;
  /** Variante 3: cada dato de contacto con su ícono (y el soporte del ícono, si lo lleva). */
  contacto?: { icono: Rect; texto: MedidaTexto; soporte?: { fondo: HSL; icono: HSL } }[];
  /** Decoración de plantilla dibujada en la pieza (su geometría, en px del lienzo). */
  decoracion?: GeometriaDecoracion | null;
  /** Variante 4: cada ítem del catálogo. */
  items?: { visual: Rect; tieneVisual: boolean; texto: MedidaTexto }[];
  /** Fotos que no están recortadas por una forma de contención. */
  fotosSinForma?: number;
}

export type Bloque = "Color y contraste" | "Tipografía" | "Composición" | "Zonas seguras" | "Contenido";

/**
 * Nivel de cada regla (replanteo, E9):
 * - bloqueante: legibilidad crítica (texto bajo 3:1, texto tapado o fuera de la zona segura, pieza sin mensaje).
 *   Si falla, la pieza no se exporta y no se puede aceptar;
 * - aviso: el resto de las reglas del manual. Si falla, bloquea hasta que se acepte con justificación;
 * - sugerencia: lo que fija el rubro (alineación, itálica por familia). Se muestra y no frena.
 */
export type NivelRegla = "bloqueante" | "aviso" | "sugerencia";

export interface Control {
  bloque: Bloque;
  control: string;
  ok: boolean;
  detalle: string;
  accion: string;
  nivel: NivelRegla;
  /** Aviso aceptado a mano en la pieza: quién, cuándo y por qué (E9). */
  justificacion?: Aceptacion;
  /**
   * No cumple, pero se acepta sin bloquear: la paleta tiene colores ajustados a mano después del cálculo de la fórmula
   * (decisión del cliente, v1.1). Solo aplica a los controles de color.
   */
  aceptado?: boolean;
  /**
   * Cumple, pero hay una mejora de oficio: no bloquea la exportación, se muestra como sugerencia. Por ejemplo, un H1
   * que quedó en su tamaño mínimo: menos palabras se leen mejor que letra más chica.
   */
  aviso?: string;
}

export interface ResultadoChecklist {
  estado: "ok" | "rechazado" | "revision_manual";
  controles: Control[];
  motivos_revision: string[];
}

export const ESPACIO_NEGATIVO_MIN = 0.3;
export const MAX_LINEAS_BODY_CENTRADO = 4;
/** H1 protagonista (variante 2): como una frase de impacto, se lee de un golpe hasta unas 6 palabras. */
export const MAX_PALABRAS_H1_PROTAGONISTA = 6;
/** Tolerancia de superposición entre elementos (px de lienzo): menos que esto es un roce de las cajas de las letras. */
const ROCE = 2;

function unir(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** El rectángulo toca el círculo (punto del rectángulo más cercano al centro a menos de un radio). */
function tocaCirculo(k: Rect, c: { cx: number; cy: number; r: number }): boolean {
  const x = Math.max(k.x, Math.min(c.cx, k.x + k.w));
  const y = Math.max(k.y, Math.min(c.cy, k.y + k.h));
  return Math.hypot(x - c.cx, y - c.cy) < c.r;
}

/** Punto dentro del polígono (regla par-impar). */
function dentroDePoligono(x: number, y: number, pol: { x: number; y: number }[]): boolean {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const a = pol[i];
    const b = pol[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

/** El rectángulo toca la forma: un punto del contorno cae adentro, o una esquina del rectángulo cae dentro de la forma. */
function tocaContorno(k: Rect, pol: { x: number; y: number }[]): boolean {
  if (pol.some((p) => p.x > k.x && p.x < k.x + k.w && p.y > k.y && p.y < k.y + k.h)) return true;
  return [
    [k.x, k.y],
    [k.x + k.w, k.y],
    [k.x, k.y + k.h],
    [k.x + k.w, k.y + k.h],
  ].some(([x, y]) => dentroDePoligono(x, y, pol));
}

/** Rect achicado `k` px por cada lado (la tolerancia de roce de las cajas de las letras). */
function achicar(a: Rect, k: number): Rect {
  return { x: a.x + k, y: a.y + k, w: Math.max(0, a.w - 2 * k), h: Math.max(0, a.h - 2 * k) };
}

function seTocan(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Elementos que informan, cada uno con sus cajas: dos de ellos nunca se pisan. */
export function elementosInformativos(m: Medicion): { nombre: string; cajas: Rect[] }[] {
  const lista = [
    { nombre: "H1", cajas: m.h1.lineas },
    { nombre: "body", cajas: m.body?.lineas ?? [] },
    { nombre: "CTA", cajas: m.cta ? [m.cta.caja] : [] },
    { nombre: "logo", cajas: m.logo ? [m.logo] : [] },
    ...(m.contacto ?? []).flatMap((k, i) => [
      { nombre: `ícono de contacto ${i + 1}`, cajas: [k.icono] },
      { nombre: `dato de contacto ${i + 1}`, cajas: k.texto.lineas },
    ]),
    ...(m.items ?? []).flatMap((k, i) => [
      { nombre: `imagen del ítem ${i + 1}`, cajas: [k.visual] },
      { nombre: `texto del ítem ${i + 1}`, cajas: k.texto.lineas },
    ]),
  ];
  return lista.filter((e) => e.cajas.length > 0);
}

/** Pares de elementos informativos que se pisan (más que un roce), con la zona donde se cruzan. */
export function superposiciones(m: Medicion): { a: string; b: string; zona: Rect }[] {
  const els = elementosInformativos(m);
  const res: { a: string; b: string; zona: Rect }[] = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      for (const p of els[i].cajas) {
        const q = els[j].cajas.find((k) => Math.min(p.x + p.w, k.x + k.w) - Math.max(p.x, k.x) > ROCE && Math.min(p.y + p.h, k.y + k.h) - Math.max(p.y, k.y) > ROCE);
        if (!q) continue;
        const x = Math.max(p.x, q.x);
        const y = Math.max(p.y, q.y);
        res.push({ a: els[i].nombre, b: els[j].nombre, zona: { x, y, w: Math.min(p.x + p.w, q.x + q.w) - x, h: Math.min(p.y + p.h, q.y + q.h) - y } });
        break;
      }
    }
  }
  return res;
}

/** Fracción del lienzo cubierta por la unión de rectángulos (muestreo en grilla de `paso` px). */
export function areaCubierta(rects: Rect[], ancho: number, alto: number, paso = 6): number {
  let cubiertos = 0;
  let total = 0;
  for (let y = paso / 2; y < alto; y += paso) {
    for (let x = paso / 2; x < ancho; x += paso) {
      total++;
      if (rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) cubiertos++;
    }
  }
  return total ? cubiertos / total : 0;
}

export function evaluarPieza(marca: Marca, pieza: Pieza, m: Medicion): ResultadoChecklist {
  const controles: Control[] = [];
  const add = (bloque: Bloque, control: string, ok: boolean, detalle: string, accion: string, nivel: NivelRegla = "aviso") =>
    controles.push({ bloque, control, ok, detalle, accion, nivel });
  /** Control que no bloquea: si no se cumple, queda como sugerencia. */
  const sugerir = (bloque: Bloque, control: string, cumple: boolean, detalle: string, sugerencia: string) =>
    controles.push({ bloque, control, ok: true, detalle, accion: "—", nivel: "sugerencia", ...(cumple ? {} : { aviso: sugerencia }) });
  // Un texto por debajo de 3:1 no se lee: es bloqueante. Entre 3:1 y el mínimo de su regla es un aviso.
  const nivelTexto = (valor: number): NivelRegla => (valor < MIN_GRAFICO ? "bloqueante" : "aviso");
  const f = FORMATOS[pieza.formato];
  const plantilla = PLANTILLAS[pieza.variante] ? plantillaPara(pieza.variante, pieza.formato, familiaTexto(marca.identidad.tipografia)) : undefined;
  const p = marca.identidad.paleta;
  const c = coloresModo(p, pieza.modo);
  const escala = f.escala === "story" ? FACTOR_STORY : 1;
  const r = (v: number) => `${v.toFixed(1)}:1`;

  // Fondo efectivo detrás de un bloque: el fondo de la pieza, o la forma mezclada si se superponen.
  const fondosDe = (cajas: Rect[]): HSL[] => {
    const fondos = [c.fondo];
    if (m.forma && cajas.some((k) => seTocan(k, m.forma!.caja))) fondos.push(mezclar(c.fondo, m.forma.color, m.forma.opacidad));
    return fondos;
  };
  const peorContraste = (color: HSL, cajas: Rect[]) => Math.min(...fondosDe(cajas).map((b) => contraste(color, b)));

  // ── Bloque 1: color y contraste ──
  const cH1 = peorContraste(c.texto, m.h1.lineas);
  add("Color y contraste", "H1 grande sobre su fondo", cH1 >= MIN_GRAFICO, `${r(cH1)} (mín. 3:1)`, "función de ajuste (cap. 3, paso 6)", nivelTexto(cH1));
  if (m.body) {
    const cBody = peorContraste(c.texto, m.body.lineas);
    add("Color y contraste", "Body sobre su fondo", cBody >= MIN_TEXTO, `${r(cBody)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)", nivelTexto(cBody));
  }
  // 2B-S vertical (v1.1): el CTA y el logo se apoyan sobre la cúpula decorativa.
  const cupula = plantilla?.deco === "inferior" && !f.columnaMensaje && m.deco != null;
  if (m.cta && cupula) {
    for (const k of controlesCtaSobre(p, fondoCapaDecorativa(p, m.deco!.tipo))) {
      add("Color y contraste", `CTA sobre la cúpula: ${k.control}`, k.valor >= k.minimo, `${r(k.valor)} (mín. ${k.minimo}:1)`, "corregir el acento o el tono de apoyo", k.control.includes("texto") ? nivelTexto(k.valor) : "aviso");
    }
  } else if (m.cta) {
    const modo = pieza.modo === "B" ? ctaModoB(p) : ctaModoA(p);
    const lista = pieza.modo === "B" ? controlesCtaModoB(p, ctaModoB(p)) : controlesCtaModoA(p, ctaModoA(p));
    for (const k of lista) {
      add("Color y contraste", `CTA (${modo}): ${k.control}`, k.valor >= k.minimo, `${r(k.valor)} (mín. ${k.minimo}:1)`, "elegir otro tratamiento del CTA o corregir el acento", k.control.includes("texto") ? nivelTexto(k.valor) : "aviso");
    }
  }
  const contacto = m.contacto ?? [];
  const items = m.items ?? [];
  if (contacto.length) {
    const cT = Math.min(...contacto.map((k) => peorContraste(c.texto, k.texto.lineas)));
    add("Color y contraste", "Datos de contacto sobre su fondo", cT >= MIN_TEXTO, `${r(cT)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)", nivelTexto(cT));
  }
  if (items.length) {
    const cI = Math.min(...items.map((k) => peorContraste(c.texto, k.texto.lineas)));
    add("Color y contraste", "Texto de los ítems sobre su fondo", cI >= MIN_TEXTO, `${r(cI)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)", nivelTexto(cI));
  }
  const soportes = contacto.filter((k) => k.soporte);
  if (soportes.length) {
    const cS = Math.min(...soportes.map((k) => contraste(k.soporte!.icono, k.soporte!.fondo)));
    add("Color y contraste", "Íconos sobre su soporte", cS >= MIN_GRAFICO, `${r(cS)} (mín. 3:1)`, "corregir colores del soporte");
  }
  add("Color y contraste", "Tono de apoyo no usado en texto ni íconos", true, "el texto usa marca, funcional o neutro", "reasignar a color de marca");

  // ── Bloque 2: tipografía ──
  const pesoEsperado = pesoH1(pieza.contenido.h1, marca.identidad.tipografia.familia_variable);
  add("Tipografía", "Peso del H1 según largo", m.h1.peso === pesoEsperado, `${m.h1.peso} (esperado ${pesoEsperado})`, "corregir token");
  if (plantilla?.h1.maxLineas) {
    const n = m.h1.lineas.length;
    add("Tipografía", `H1 en ${plantilla.h1.maxLineas} líneas o menos (${pieza.formato})`, n <= plantilla.h1.maxLineas, `${n} líneas`, "recortar texto");
  }
  add("Tipografía", "H1 en tamaño mínimo o mayor", m.h1.px >= Math.round((plantilla?.h1.min ?? 48) * escala), `${m.h1.px} px`, "escalar o recortar texto");
  // Legibilidad: menos palabras antes que letra más chica. Si el H1 quedó en el piso de su rango, el ajuste ya no tiene
  // margen y la pieza se lee peor que con un mensaje más corto.
  if (plantilla && !m.desborde) {
    const piso = h1Minimo(plantilla, escala);
    sugerir(
      "Tipografía",
      "H1 con margen sobre su tamaño mínimo",
      m.h1.px > piso + 2,
      `${m.h1.px} px (mínimo ${piso})`,
      "El H1 quedó en su tamaño mínimo: conviene recortar palabras antes que achicar la letra.",
    );
  }
  if (pieza.variante === "2") {
    const palabras = pieza.contenido.h1.trim().split(/\s+/).filter(Boolean).length;
    sugerir(
      "Tipografía",
      `H1 protagonista en ${MAX_PALABRAS_H1_PROTAGONISTA} palabras o menos`,
      palabras <= MAX_PALABRAS_H1_PROTAGONISTA,
      `${palabras} palabras`,
      "Una frase de impacto se lee de un golpe: dejá lo esencial y pasá el resto al dato de apoyo.",
    );
  }
  if (m.body) {
    const minBody = Math.round(24 * escala);
    add("Tipografía", "Body de 24 px o más", m.body.px >= minBody, `${m.body.px} px (mín. ${minBody})`, "escalar o recortar texto");
    add("Tipografía", "Body en peso regular", m.body.peso === 400, `${m.body.peso}`, "rechazo, corregir token");
  }
  const mayorSecundario = Math.max(m.body?.px ?? 0, m.cta?.px ?? 0);
  add(
    "Tipografía",
    `Jerarquía: H1 al menos ${JERARQUIA_H1} veces el body y el CTA`,
    m.h1.px >= JERARQUIA_H1 * mayorSecundario - 0.5,
    `H1 ${m.h1.px} px · body ${m.body?.px ?? "—"} px · CTA ${m.cta?.px ?? "—"} px`,
    "achicar body o CTA, o recortar el H1",
  );
  add("Tipografía", "Itálica nunca en H1", !m.h1.italica, m.h1.italica ? "H1 en itálica" : "sin itálica", "quitar itálica");
  if (m.cta) add("Tipografía", "Itálica nunca en el CTA", !m.cta.italica, m.cta.italica ? "CTA en itálica" : "sin itálica", "quitar itálica");
  if (m.body?.italica) {
    add("Tipografía", "Itálica solo en rubros y familias habilitados", marca.identidad.tipografia.italic_habilitado, marca.identidad.tipografia.familia_variable, "quitar itálica", "sugerencia");
  }

  // ── Bloque 3: composición ──
  // Espacio negativo: cuenta todo lo que informa (texto, CTA, logo, contacto, ítems). La capa decorativa no.
  const textos = [...m.h1.lineas, ...(m.body?.lineas ?? []), ...(m.cta ? [m.cta.caja] : [])];
  const contenido = [
    ...textos,
    ...(m.logo ? [m.logo] : []),
    ...contacto.flatMap((k) => [k.icono, ...k.texto.lineas]),
    ...items.flatMap((k) => [k.visual, ...k.texto.lineas]),
  ];
  // Ningún elemento que informa pisa a otro (texto, CTA, logo, íconos y fotos de contacto o catálogo).
  const pisadas = superposiciones(m);
  add(
    "Composición",
    "Ningún texto tapado por otro elemento",
    pisadas.length === 0,
    pisadas.map((k) => `${k.a} con ${k.b}`).join(", "),
    "recortar texto o reubicar",
  );
  const cubierto = areaCubierta(contenido, f.ancho, f.alto);
  const negativo = 1 - cubierto;
  add("Composición", "Espacio negativo", negativo >= ESPACIO_NEGATIVO_MIN, `${Math.round(negativo * 100)}% (mín. 30%)`, "reducir elementos o escalar tipografía");
  const permitidas = alineacionesPermitidas(marca.rubro, pieza.variante);
  add("Composición", "Alineación del mensaje", permitidas.includes(pieza.alineacion), `${pieza.alineacion} (permitidas: ${permitidas.join(", ")})`, "corregir", "sugerencia");
  // Elementos gráficos (cap. 5 y 6).
  const tope = maxIconos(pieza.variante, items.length);
  const nIconos = m.iconos ?? 0;
  add("Composición", "Íconos por pieza", nIconos <= tope, `${nIconos} (máx. ${tope})`, "quitar excedente");
  if (plantilla?.deco) {
    const d = m.deco;
    add("Composición", "Una capa decorativa", d != null, d ? d.tipo : "falta la capa decorativa", "agregar o corregir capa");
    if (d) {
      // En la cúpula el CTA y el logo van encima a propósito (con contraste validado); el mensaje nunca.
      const protegidos = cupula ? [...m.h1.lineas, ...(m.body?.lineas ?? [])] : [...textos, ...(m.logo ? [m.logo] : [])];
      const pisa = protegidos.some((k) =>
        d.circulo
          ? tocaCirculo(k, d.circulo) && seTocan(k, d.caja)
          : d.contorno?.length
            ? tocaContorno(k, d.contorno)
            : seTocan(k, d.caja),
      );
      add("Composición", cupula ? "Capa decorativa sin tapar el mensaje" : "Capa decorativa sin tapar texto ni logo", !pisa, pisa ? "se superpone" : "", "corregir capa", "bloqueante");
      if (d.tipo === "icono") {
        const ok = d.opacidad >= OPACIDAD_ICONO_DECO.min - 1e-6 && d.opacidad <= OPACIDAD_ICONO_DECO.max + 1e-6;
        add("Composición", "Ícono decorativo al 15-25% de opacidad", ok, `${Math.round(d.opacidad * 100)}%`, "corregir opacidad");
        const noMarca = contraste(d.color, p.color_marca) > 1.01 && contraste(d.color, p.acento) > 1.01;
        add("Composición", "Ícono decorativo en tono de apoyo o fondo neutro", noMarca, "", "reasignar color");
      }
      if (d.tipo === "patron") {
        const ok = d.opacidad >= OPACIDAD_PATRON.min - 1e-6 && d.opacidad <= OPACIDAD_PATRON.max + 1e-6;
        add("Composición", "Patrón al 10-20% de opacidad", ok, `${Math.round(d.opacidad * 100)}%`, "corregir opacidad");
        add("Composición", "Patrón nunca en acento", contraste(d.color, p.acento) > 1.01, "", "reasignar a marca o tono de apoyo");
      }
      if (d.tipo === "foto" && !d.protagonista) {
        const ov = d.overlay ?? 0;
        const ok = ov >= OVERLAY_FOTO.min - 1e-6 && ov <= OVERLAY_FOTO.max + 1e-6;
        add("Composición", "Foto decorativa con overlay de marca al 60-70%", ok, `${Math.round(ov * 100)}%`, "corregir overlay");
      }
    }
  }
  // Decoración de plantilla (v1.1): sus figuras nunca pasan por debajo de un texto ni del logo.
  const decoracion = decoracionEfectiva(pieza);
  if (decoracion) {
    const g = decoracion.geometria(pieza.formato);
    const tapados = elementosInformativos(m).filter((e) => e.cajas.some((k) => tocaDecoracion(k, g)));
    add(
      "Composición",
      `Decoración (${decoracion.nombre.toLowerCase()}) sin tapar texto ni logo`,
      tapados.length === 0,
      tapados.map((e) => e.nombre).join(", "),
      "recortar texto o quitar la decoración",
      "bloqueante",
    );
  }
  if (plantilla?.bloque === "contacto") {
    const n = contacto.length;
    add("Composición", "Datos de contacto (1 a 4)", n >= 1 && n <= MAX_CONTACTO, `${n}`, n ? "quitar excedente" : "cargar al menos un dato");
    const izquierda = contacto.every((k) => k.icono.x + k.icono.w <= Math.min(...k.texto.lineas.map((l) => l.x)) + 0.5);
    add("Composición", "Ícono a la izquierda de cada dato", izquierda, "", "reordenar");
  }
  if (plantilla?.bloque === "catalogo") {
    const n = items.length;
    const max = maxItems(pieza.formato);
    add("Composición", `Ítems de catálogo (2 a ${max})`, n >= 2 && n <= max, `${n}`, n < 2 ? "cargar al menos 2 ítems" : "quitar excedente");
    const completos = items.every((k) => k.tieneVisual && k.texto.lineas.length > 0);
    add("Composición", "Cada ítem con foto o ícono y texto", completos, "", "completar el ítem");
  }
  if (pieza.alineacion === "centrado" && m.body) {
    const n = m.body.lineas.length;
    add("Composición", "Body centrado en 4 líneas o menos", n <= MAX_LINEAS_BODY_CENTRADO, `${n} líneas`, "recortar texto");
  }

  // ── Bloque 4: zonas seguras ──
  const zm = f.zonaMinima;
  const dentro = (k: Rect) =>
    k.x >= f.ancho * zm.x - 0.5 &&
    k.y >= f.alto * zm.arriba - 0.5 &&
    k.x + k.w <= f.ancho * (1 - zm.x) + 0.5 &&
    k.y + k.h <= f.alto * (1 - zm.abajo) + 0.5;
  add("Zonas seguras", "Logo dentro del margen seguro", !m.logo || dentro(m.logo), m.logo ? "" : "sin logo", "reubicar");
  // Logo como sistema (E4): tamaño mínimo, área de seguridad y contraste con su fondo, sobre la caja visible del logo.
  // Solo con un logo cargado: el nombre en texto que lo reemplaza no es el logo.
  if (m.logo && m.logoImagen) {
    const minimo = Math.round(LOGO_MIN_PX * (f.escala === "story" ? FACTOR_STORY : 1));
    add("Zonas seguras", `Logo de tamaño mínimo (${minimo} px de alto)`, m.logo.h >= minimo - 0.5, `${Math.round(m.logo.h)} px`, "agrandar el logo o usar una versión más legible");
    const aire = m.logo.h * AREA_SEGURIDAD;
    const area: Rect = { x: m.logo.x - aire, y: m.logo.y - aire, w: m.logo.w + 2 * aire, h: m.logo.h + 2 * aire };
    const invade = elementosInformativos(m)
      .filter((e) => e.nombre !== "logo")
      .filter((e) => e.cajas.some((k) => seTocan(area, achicar(k, ROCE))))
      .map((e) => e.nombre);
    add("Zonas seguras", "Área de seguridad del logo", invade.length === 0, invade.length ? `invade: ${invade.join(", ")}` : "", "separar el logo de los otros elementos");
    if (m.logoColor && m.logoFondo) {
      const cL = contraste(m.logoColor, m.logoFondo);
      add("Color y contraste", "Logo contrasta con su fondo", cL >= MIN_GRAFICO, `${r(cL)} (mín. 3:1)`, "usar la versión monocromo o una placa detrás");
    }
  }
  const todo = unir(contenido);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const margenTexto =
    zm.arriba === zm.x && zm.abajo === zm.x
      ? `${pct(zm.x)} libre en bordes`
      : `${pct(zm.x)} a los lados, ${pct(zm.arriba)} arriba y ${pct(zm.abajo)} abajo`;
  add("Zonas seguras", `Contenido dentro del margen (${margenTexto})`, !todo || contenido.every(dentro), "", "reubicar o recortar texto", "bloqueante");

  // Interfaz de la plataforma (stories y estados): nada que informe queda debajo de la cabecera ni de la barra de
  // respuesta.
  if (f.interfaz) {
    const ui = f.interfaz;
    const arriba = f.alto * ui.arriba;
    const abajo = f.alto * (1 - ui.abajo);
    const tapados = elementosInformativos(m).filter((e) => e.cajas.some((k) => k.y < arriba - 0.5 || k.y + k.h > abajo + 0.5));
    add(
      "Zonas seguras",
      `Nada tapado por la ${ui.nombre} (${Math.round(arriba)} px arriba, ${Math.round(f.alto - abajo)} px abajo)`,
      tapados.length === 0,
      tapados.map((e) => e.nombre).join(", "),
      "reubicar dentro de la zona segura",
      "bloqueante",
    );
  }

  // Grilla del perfil de Instagram (3:4): la miniatura recorta los lados. El mensaje (H1, CTA) y el logo tienen que
  // verse enteros ahí, porque es lo que identifica la publicación en el perfil.
  if (f.recorteGrilla && pieza.canal === "feed_ig") {
    const izq = f.ancho * f.recorteGrilla;
    const der = f.ancho - izq;
    const clave = elementosInformativos(m).filter((e) => e.nombre === "H1" || e.nombre === "CTA" || e.nombre === "logo");
    const cortados = clave.filter((e) => e.cajas.some((k) => k.x < izq - 0.5 || k.x + k.w > der + 0.5));
    add(
      "Zonas seguras",
      `Mensaje y logo enteros en la grilla del perfil (3:4, ${Math.round(izq)} px menos por lado)`,
      cortados.length === 0,
      cortados.map((e) => e.nombre).join(", "),
      "reubicar o recortar texto",
    );
  }

  if (f.columnaMensaje) {
    const limite = f.ancho * f.columnaMensaje;
    // Solo el mensaje (texto, CTA y logo): la capa decorativa, el contacto o los ítems van a la derecha (cap. 6).
    const fuera = [...textos, ...(m.logo ? [m.logo] : [])].filter((k) => k.x + k.w > limite + 0.5).length;
    add("Zonas seguras", `Mensaje en el ${Math.round(f.columnaMensaje * 100)}% izquierdo del ancho`, fuera === 0, fuera ? `${fuera} elemento(s) pasan el límite` : "", "recortar texto");
  }

  // ── Bloque 5: contenido ──
  add("Contenido", "Un mensaje principal", pieza.contenido.h1.trim().length > 0, pieza.contenido.h1.trim() ? "" : "falta el H1", "completar el H1", "bloqueante");
  if (plantilla && !plantilla.tieneCta) {
    add("Contenido", "Variante sin CTA", !m.cta, m.cta ? "la variante no lleva CTA" : "", "quitar el CTA");
  }
  const fotoPedida = pieza.deco?.relleno === "foto";
  const usaFoto = m.deco?.tipo === "foto" || items.some((k) => k.tieneVisual) && (pieza.items ?? []).some((i) => i.foto);
  add(
    "Contenido",
    "Funciona sin foto",
    true,
    usaFoto ? "la foto es una capa opcional" : fotoPedida ? "sin foto cargada: se usa la capa del rubro" : "la pieza no usa foto",
    "—",
  );
  const sinForma = m.fotosSinForma ?? 0;
  add("Contenido", "Fotos dentro de una forma de contención", sinForma === 0, sinForma ? `${sinForma} sin recortar` : "", "recortar en una forma");

  // Excepción v1.1 (decisión del cliente): con colores ajustados a mano o con el color heredado sin versión funcional,
  // los contrastes que no cumplen se aceptan con aviso. Un bloqueante nunca se acepta (E9).
  if ((marca.identidad.ajustes_manuales ?? []).length > 0 || marca.identidad.color.solo_heredado) {
    for (const k of controles) if (!k.ok && k.bloque === "Color y contraste" && k.nivel !== "bloqueante") k.aceptado = true;
  }
  aplicarAceptaciones(controles, pieza.aceptaciones);

  const motivos_revision = m.desborde ? ["El texto no entra en el slot ni siquiera en el tamaño mínimo permitido."] : [];
  return { estado: estadoDe(controles, motivos_revision), controles, motivos_revision };
}

/**
 * Avisos aceptados a mano en la pieza (E9): el control que falla se da por aceptado con su justificación. Solo los
 * avisos: un bloqueante no se puede aceptar y una sugerencia no hace falta aceptarla.
 */
export function aplicarAceptaciones(controles: Control[], aceptaciones: Aceptacion[] | undefined): void {
  for (const k of controles) {
    if (k.ok || k.nivel !== "aviso") continue;
    const j = aceptaciones?.find((a) => a.control === k.control);
    if (j) {
      k.aceptado = true;
      k.justificacion = j;
    }
  }
}

/** Estado de la pieza: solo frenan los bloqueantes y los avisos sin aceptar. Las sugerencias no frenan. */
export function estadoDe(controles: Control[], motivos_revision: string[]): ResultadoChecklist["estado"] {
  if (motivos_revision.length) return "revision_manual";
  return controles.every((k) => k.ok || k.aceptado || k.nivel === "sugerencia") ? "ok" : "rechazado";
}
