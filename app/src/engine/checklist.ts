// Checklist de control de calidad (manual cap. 8 / A.8, v1.1).
// Función pura: recibe la pieza, la marca y las medidas reales tomadas del render (cajas, tamaños, líneas) y
// devuelve cada control con resultado binario y acción. No depende del navegador, así que se testea directo.

import { contraste, mezclar, type HSL } from "./color";
import type { Marca } from "./diagnostico";
import { FORMATOS } from "./formatos";
import { coloresModo, controlesCtaModoA, controlesCtaModoB, ctaModoA, ctaModoB, MIN_GRAFICO, MIN_TEXTO } from "./palette";
import { alineacionesPermitidas, MAX_CONTACTO, maxIconos, maxItems, plantillaPara, PLANTILLAS, type Pieza } from "./pieza";
import { OPACIDAD_ICONO_DECO, OPACIDAD_PATRON, OVERLAY_FOTO, type TipoDeco } from "./biblioteca";
import { FACTOR_STORY, pesoH1 } from "./typography";

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
  /** Forma de fondo (función estructural) con su color y opacidad efectivos. */
  forma: { caja: Rect; color: HSL; opacidad: number } | null;
  /** El texto no entró en su slot ni siquiera al tamaño mínimo. */
  desborde: boolean;
  /** Capa decorativa (variantes 2B). */
  deco?: { tipo: TipoDeco; caja: Rect; opacidad: number; overlay: number | null; color: HSL } | null;
  /** Total de íconos en la pieza (decorativos e informativos). */
  iconos?: number;
  /** Variante 3: cada dato de contacto con su ícono. */
  contacto?: { icono: Rect; texto: MedidaTexto }[];
  /** Variante 4: cada ítem del catálogo. */
  items?: { visual: Rect; tieneVisual: boolean; texto: MedidaTexto }[];
  /** Fotos que no están recortadas por una forma de contención. */
  fotosSinForma?: number;
}

export type Bloque = "Color y contraste" | "Tipografía" | "Composición" | "Zonas seguras" | "Contenido";

export interface Control {
  bloque: Bloque;
  control: string;
  ok: boolean;
  detalle: string;
  accion: string;
}

export interface ResultadoChecklist {
  estado: "ok" | "rechazado" | "revision_manual";
  controles: Control[];
  motivos_revision: string[];
}

export const ESPACIO_NEGATIVO_MIN = 0.3;
export const MAX_LINEAS_BODY_CENTRADO = 4;

function unir(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function seTocan(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
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
  const add = (bloque: Bloque, control: string, ok: boolean, detalle: string, accion: string) =>
    controles.push({ bloque, control, ok, detalle, accion });
  const f = FORMATOS[pieza.formato];
  const plantilla = PLANTILLAS[pieza.variante] ? plantillaPara(pieza.variante, pieza.formato) : undefined;
  const p = marca.paleta;
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
  add("Color y contraste", "H1 grande sobre su fondo", cH1 >= MIN_GRAFICO, `${r(cH1)} (mín. 3:1)`, "función de ajuste (cap. 3, paso 6)");
  if (m.body) {
    const cBody = peorContraste(c.texto, m.body.lineas);
    add("Color y contraste", "Body sobre su fondo", cBody >= MIN_TEXTO, `${r(cBody)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)");
  }
  if (m.cta) {
    const modo = pieza.modo === "B" ? ctaModoB(p) : ctaModoA(p);
    const lista = pieza.modo === "B" ? controlesCtaModoB(p, ctaModoB(p)) : controlesCtaModoA(p, ctaModoA(p));
    for (const k of lista) {
      add("Color y contraste", `CTA (${modo}): ${k.control}`, k.valor >= k.minimo, `${r(k.valor)} (mín. ${k.minimo}:1)`, "elegir otro tratamiento del CTA o corregir el acento");
    }
  }
  const contacto = m.contacto ?? [];
  const items = m.items ?? [];
  if (contacto.length) {
    const cT = Math.min(...contacto.map((k) => peorContraste(c.texto, k.texto.lineas)));
    add("Color y contraste", "Datos de contacto sobre su fondo", cT >= MIN_TEXTO, `${r(cT)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)");
  }
  if (items.length) {
    const cI = Math.min(...items.map((k) => peorContraste(c.texto, k.texto.lineas)));
    add("Color y contraste", "Texto de los ítems sobre su fondo", cI >= MIN_TEXTO, `${r(cI)} (mín. 4,5:1)`, "función de ajuste (cap. 3, paso 6)");
  }
  add("Color y contraste", "Tono de apoyo no usado en texto ni íconos", true, "el texto usa marca, funcional o neutro", "reasignar a color de marca");

  // ── Bloque 2: tipografía ──
  const pesoEsperado = pesoH1(pieza.contenido.h1, marca.tipografia.familia_variable);
  add("Tipografía", "Peso del H1 según largo", m.h1.peso === pesoEsperado, `${m.h1.peso} (esperado ${pesoEsperado})`, "corregir token");
  if (plantilla?.h1.maxLineas) {
    const n = m.h1.lineas.length;
    add("Tipografía", `H1 en ${plantilla.h1.maxLineas} líneas o menos (${pieza.formato})`, n <= plantilla.h1.maxLineas, `${n} líneas`, "recortar texto");
  }
  add("Tipografía", "H1 en tamaño mínimo o mayor", m.h1.px >= Math.round((plantilla?.h1.min ?? 48) * escala), `${m.h1.px} px`, "escalar o recortar texto");
  if (m.body) {
    const minBody = Math.round(24 * escala);
    add("Tipografía", "Body de 24 px o más", m.body.px >= minBody, `${m.body.px} px (mín. ${minBody})`, "escalar o recortar texto");
    add("Tipografía", "Body en peso regular", m.body.peso === 400, `${m.body.peso}`, "rechazo, corregir token");
  }
  add("Tipografía", "Itálica nunca en H1", !m.h1.italica, m.h1.italica ? "H1 en itálica" : "sin itálica", "quitar itálica");
  if (m.cta) add("Tipografía", "Itálica nunca en el CTA", !m.cta.italica, m.cta.italica ? "CTA en itálica" : "sin itálica", "quitar itálica");
  if (m.body?.italica) {
    add("Tipografía", "Itálica solo en rubros y familias habilitados", marca.tipografia.italic_habilitado, marca.tipografia.familia_variable, "quitar itálica");
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
  const cubierto = areaCubierta(contenido, f.ancho, f.alto);
  const negativo = 1 - cubierto;
  add("Composición", "Espacio negativo", negativo >= ESPACIO_NEGATIVO_MIN, `${Math.round(negativo * 100)}% (mín. 30%)`, "reducir elementos o escalar tipografía");
  const permitidas = alineacionesPermitidas(marca.rubro, pieza.variante);
  add("Composición", "Alineación del mensaje", permitidas.includes(pieza.alineacion), `${pieza.alineacion} (permitidas: ${permitidas.join(", ")})`, "corregir");
  // Elementos gráficos (cap. 5 y 6).
  const tope = maxIconos(pieza.variante, items.length);
  const nIconos = m.iconos ?? 0;
  add("Composición", "Íconos por pieza", nIconos <= tope, `${nIconos} (máx. ${tope})`, "quitar excedente");
  if (plantilla?.deco) {
    const d = m.deco;
    add("Composición", "Una capa decorativa", d != null, d ? d.tipo : "falta la capa decorativa", "agregar o corregir capa");
    if (d) {
      const pisa = [...textos, ...(m.logo ? [m.logo] : [])].some((k) => seTocan(k, d.caja));
      add("Composición", "Capa decorativa sin tapar texto ni logo", !pisa, pisa ? "se superpone" : "", "corregir capa");
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
      if (d.tipo === "foto") {
        const ov = d.overlay ?? 0;
        const ok = ov >= OVERLAY_FOTO.min - 1e-6 && ov <= OVERLAY_FOTO.max + 1e-6;
        add("Composición", "Foto decorativa con overlay de marca al 60-70%", ok, `${Math.round(ov * 100)}%`, "corregir overlay");
      }
    }
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
  const zona = { x: f.ancho * f.zonaMinima.x, y: f.alto * f.zonaMinima.y };
  const dentro = (k: Rect) =>
    k.x >= zona.x - 0.5 && k.y >= zona.y - 0.5 && k.x + k.w <= f.ancho - zona.x + 0.5 && k.y + k.h <= f.alto - zona.y + 0.5;
  add("Zonas seguras", "Logo dentro del margen seguro", !m.logo || dentro(m.logo), m.logo ? "" : "sin logo", "reubicar");
  const todo = unir(contenido);
  add("Zonas seguras", `Contenido dentro del margen (${Math.round(f.zonaMinima.x * 100)}% libre en bordes)`, !todo || contenido.every(dentro), "", "reubicar o recortar texto");

  if (f.columnaMensaje) {
    const limite = f.ancho * f.columnaMensaje;
    // Solo el mensaje (texto, CTA y logo): la capa decorativa, el contacto o los ítems van a la derecha (cap. 6).
    const fuera = [...textos, ...(m.logo ? [m.logo] : [])].filter((k) => k.x + k.w > limite + 0.5).length;
    add("Zonas seguras", `Mensaje en el ${Math.round(f.columnaMensaje * 100)}% izquierdo del ancho`, fuera === 0, fuera ? `${fuera} elemento(s) pasan el límite` : "", "recortar texto");
  }

  // ── Bloque 5: contenido ──
  add("Contenido", "Un mensaje principal", pieza.contenido.h1.trim().length > 0, pieza.contenido.h1.trim() ? "" : "falta el H1", "completar el H1");
  if (plantilla && !plantilla.tieneCta) {
    add("Contenido", "Variante sin CTA", !m.cta, m.cta ? "la variante no lleva CTA" : "", "quitar el CTA");
  }
  const fotoPedida = pieza.deco?.tipo === "foto";
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

  const motivos_revision = m.desborde ? ["El texto no entra en el slot ni siquiera en el tamaño mínimo permitido."] : [];
  const estado = motivos_revision.length ? "revision_manual" : controles.every((k) => k.ok) ? "ok" : "rechazado";
  return { estado, controles, motivos_revision };
}
