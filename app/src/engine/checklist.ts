// Checklist de control de calidad (manual cap. 8 / A.8, v1.1).
// Función pura: recibe la pieza, la marca y las medidas reales tomadas del render (cajas, tamaños, líneas) y
// devuelve cada control con resultado binario y acción. No depende del navegador, así que se testea directo.

import { contraste, mezclar, type HSL } from "./color";
import type { Marca } from "./diagnostico";
import { FORMATOS } from "./formatos";
import { coloresModo, controlesCtaModoA, controlesCtaModoB, ctaModoA, ctaModoB, MIN_GRAFICO, MIN_TEXTO } from "./palette";
import { alineacionesPermitidas, PLANTILLAS, type Pieza } from "./pieza";
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
  const plantilla = PLANTILLAS[pieza.variante];
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
  add("Color y contraste", "Tono de apoyo no usado en texto ni íconos", true, "el texto usa marca, funcional o neutro", "reasignar a color de marca");

  // ── Bloque 2: tipografía ──
  const pesoEsperado = pesoH1(pieza.contenido.h1, marca.tipografia.familia_variable);
  add("Tipografía", "Peso del H1 según largo", m.h1.peso === pesoEsperado, `${m.h1.peso} (esperado ${pesoEsperado})`, "corregir token");
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
  const contenido = [
    ...m.h1.lineas,
    ...(m.body?.lineas ?? []),
    ...(m.cta ? [m.cta.caja] : []),
    ...(m.logo ? [m.logo] : []),
  ];
  const cubierto = areaCubierta(contenido, f.ancho, f.alto);
  const negativo = 1 - cubierto;
  add("Composición", "Espacio negativo", negativo >= ESPACIO_NEGATIVO_MIN, `${Math.round(negativo * 100)}% (mín. 30%)`, "reducir elementos o escalar tipografía");
  const permitidas = alineacionesPermitidas(marca.rubro, pieza.variante);
  add("Composición", "Alineación del mensaje", permitidas.includes(pieza.alineacion), `${pieza.alineacion} (permitidas: ${permitidas.join(", ")})`, "corregir");
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

  // ── Bloque 5: contenido ──
  add("Contenido", "Un mensaje principal", pieza.contenido.h1.trim().length > 0, pieza.contenido.h1.trim() ? "" : "falta el H1", "completar el H1");
  if (plantilla && !plantilla.tieneCta) {
    add("Contenido", "Variante sin CTA", !m.cta, m.cta ? "la variante no lleva CTA" : "", "quitar el CTA");
  }
  add("Contenido", "Funciona sin foto", true, "la pieza no usa foto", "—");

  const motivos_revision = m.desborde ? ["El texto no entra en el slot ni siquiera en el tamaño mínimo permitido."] : [];
  const estado = motivos_revision.length ? "revision_manual" : controles.every((k) => k.ok) ? "ok" : "rechazado";
  return { estado, controles, motivos_revision };
}
