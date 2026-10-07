// Ajuste de texto al slot y medición de la pieza renderizada (lado navegador).
// Trabaja sobre el DOM real a tamaño de lienzo; si la pieza está escalada con CSS para la vista previa, las medidas
// se normalizan a px del lienzo.

import { hslToRgb, type HSL } from "@/engine/color";
import type { Medicion, MedidaTexto, Rect } from "@/engine/checklist";
import type { TipoDeco } from "@/engine/biblioteca";
import { cajaVisible } from "@/engine/logo";
import { h1Minimo, type PlantillaVariante } from "@/engine/pieza";
import { tocaDecoracion, type GeometriaDecoracion } from "@/engine/decoraciones";
import { aplicarFiltro, encuadre, FOCO_CENTRO, peorContraste, type CapaProteccion, type FiltroFoto, type Foco } from "@/engine/fotografia";
import { dimensionesImagen } from "@/lib/imagen";
import { CTA_MIN, JERARQUIA_H1 } from "@/engine/typography";

const q = (root: HTMLElement, slot: string) => root.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

/**
 * Busca el H1 más grande que entra en la zona del mensaje, achicando primero el body para que la jerarquía la
 * conserve el H1. No desborda a lo ancho ni pasa el alto máximo del H1 de la variante. Si nada entra al mínimo,
 * informa desborde.
 */
export function ajustarTexto(
  root: HTMLElement,
  plantilla: PlantillaVariante,
  alto: number,
  escala: number,
  /** 2B-L con imagen: posiciones posibles del círculo (variable --deco-izq), en orden de preferencia. */
  decoIzq?: number[],
): boolean {
  // El CTA va en una línea; si así no entra en ninguna posición, se le permite partirse en dos.
  root.style.setProperty("--cta-salto", "nowrap");
  root.style.setProperty("--h1-mayuscula", "0px");
  let desborde = ajustarEnPosiciones(root, plantilla, alto, escala, decoIzq);
  if (desborde && q(root, "cta")) {
    root.style.setProperty("--cta-salto", "normal");
    desborde = ajustarEnPosiciones(root, plantilla, alto, escala, decoIzq);
  }
  // 2B-L con imagen: el tope de las mayúsculas del H1 (no el del renglón) se alinea con el borde del círculo. Subir el
  // bloque solo libera lugar abajo, así que el ajuste sigue valiendo.
  const h1 = q(root, "h1");
  if (decoIzq && h1) root.style.setProperty("--h1-mayuscula", `${aireSobreMayuscula(h1)}px`);
  return desborde;
}

/** Distancia entre el borde superior del renglón del H1 y el tope de sus mayúsculas, en px. */
function aireSobreMayuscula(h1: HTMLElement): number {
  const cs = getComputedStyle(h1);
  const fs = parseFloat(cs.fontSize);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0;
  ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  const m = ctx.measureText("H");
  const alto = parseFloat(cs.lineHeight) || fs * 1.04;
  const aire = (alto - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent;
  return Math.max(0, Math.round(aire));
}

function ajustarEnPosiciones(root: HTMLElement, plantilla: PlantillaVariante, alto: number, escala: number, decoIzq?: number[]): boolean {
  if (decoIzq && decoIzq.length > 1) {
    // Se queda en la primera posición si el H1 llega a un tamaño cómodo (el medio de su rango); si no, usa la que dé
    // el H1 más grande.
    const deseado = Math.round(((plantilla.h1.min + plantilla.h1.max) / 2) * escala);
    let mejor: { v: number; h1: number; desborde: boolean } | null = null;
    for (const v of decoIzq) {
      root.style.setProperty("--deco-izq", `${v}px`);
      const desborde = ajustarTextoUna(root, plantilla, alto, escala);
      const h1 = parseFloat(root.style.getPropertyValue("--h1"));
      if (!desborde && h1 >= deseado) return false;
      if (!mejor || (mejor.desborde && !desborde) || (mejor.desborde === desborde && h1 > mejor.h1)) mejor = { v, h1, desborde };
    }
    root.style.setProperty("--deco-izq", `${mejor!.v}px`);
    return ajustarTextoUna(root, plantilla, alto, escala);
  }
  if (decoIzq) root.style.setProperty("--deco-izq", `${decoIzq[0]}px`);
  return ajustarTextoUna(root, plantilla, alto, escala);
}

function ajustarTextoUna(root: HTMLElement, plantilla: PlantillaVariante, alto: number, escala: number): boolean {
  const zona = q(root, "mensaje");
  const contenido = q(root, "mensaje-contenido");
  const h1 = q(root, "h1");
  if (!zona || !contenido || !h1) return false;
  const body = q(root, "body");
  const cta = q(root, "cta");
  const px = (v: number) => Math.round(v * escala);
  // Las cajas reales de las letras (ascendentes y descendentes) pueden sobresalir del interlineado: tienen que quedar
  // dentro de la columna de contenido (la zona segura), si no pisan el margen.
  const columna = zona.closest<HTMLElement>("[data-columna]") ?? zona;
  const letrasDentro = () => {
    const z = columna.getBoundingClientRect();
    return [h1, body].every((el) => {
      if (!el) return true;
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].every((r) => r.top >= z.top - 0.5 && r.bottom <= z.bottom + 0.5);
    });
  };
  // 2B-L vertical: la forma real (no su caja), con un aire de 40 px de lienzo. El título puede acercarse al contorno
  // pero no pasarlo: si lo toca, se achica. El círculo se mide exacto; otra forma, sobre su contorno muestreado.
  const lateralEl = root.querySelector<HTMLElement>("[data-deco-lateral]");
  const circuloEl = lateralEl?.hasAttribute("data-circulo") ? lateralEl : null;
  const escalaVista = root.getBoundingClientRect().width / root.offsetWidth || 1;
  const lejosDelCirculo = () => {
    if (!lateralEl) return true;
    const cajas = [h1, body].flatMap((el) => {
      if (!el) return [];
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()];
    });
    if (cta) cajas.push(cta.getBoundingClientRect());
    if (!circuloEl) {
      const puntos = contornoForma(lateralEl, 240);
      return cajas.every((k) => !tocaContorno(k, puntos, 40 * escalaVista));
    }
    const c = circuloEl.getBoundingClientRect();
    const circulo = { cx: c.left + c.width / 2, cy: c.top + c.height / 2, r: c.width / 2 + 40 * escalaVista };
    return cajas.every((k) => !tocaCirculo(k, circulo));
  };
  // Decoración de plantilla: el texto se aleja 40 px de sus figuras; si las toca, se achica.
  const decoEl = root.querySelector<SVGElement>("[data-decoracion]");
  const geoDeco = decoEl ? (JSON.parse(decoEl.dataset.decoracion!) as GeometriaDecoracion) : null;
  const lejosDeLaDecoracion = () => {
    if (!geoDeco) return true;
    const cajas = [h1, body].flatMap((el) => {
      if (!el) return [];
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()];
    });
    if (cta) cajas.push(cta.getBoundingClientRect());
    root.querySelectorAll<HTMLElement>('[data-slot="contacto-item"]').forEach((el) => cajas.push(el.getBoundingClientRect()));
    return cajas.every((k) => !tocaDecoracion(relativo(root, k), geoDeco, 40));
  };
  const cabe = () =>
    contenido.offsetHeight <= zona.clientHeight + 1 &&
    lejosDelCirculo() &&
    lejosDeLaDecoracion() &&
    zona.scrollHeight <= zona.clientHeight + 1 &&
    letrasDentro() &&
    h1.scrollWidth <= h1.clientWidth + 1 &&
    (!body || body.scrollWidth <= body.clientWidth + 1) &&
    // El CTA no pasa el borde derecho de la columna (no pisa la capa decorativa).
    (!cta || cta.getBoundingClientRect().right <= columna.getBoundingClientRect().right + 0.5) &&
    h1.offsetHeight <= plantilla.h1.altoMax * alto &&
    (!plantilla.h1.maxLineas || lineasH1() <= plantilla.h1.maxLineas);
  // Renglones del H1 a partir de su alto y su interlineado (1,04).
  const lineasH1 = () => Math.round(h1.offsetHeight / (parseFloat(getComputedStyle(h1).fontSize) * 1.04));

  // Jerarquía: el CTA acompaña al H1 (a lo sumo la mitad) y el body nunca pasa la mitad del H1.
  const ctaMin = Math.min(px(CTA_MIN), px(plantilla.cta));
  const ctaPara = (h: number) => Math.max(ctaMin, Math.min(px(plantilla.cta), Math.floor(h / JERARQUIA_H1)));
  const prueba = (h: number, b: number) => {
    root.style.setProperty("--h1", `${h}px`);
    root.style.setProperty("--body", `${b}px`);
    root.style.setProperty("--cta", `${ctaPara(h)}px`);
    return cabe();
  };
  const bodyMin = px(plantilla.body.min);
  const h1Min = h1Minimo(plantilla, escala);
  // 1) El H1 más grande que entra con el body al mínimo; 2) con ese H1, el body más grande que entra.
  // Búsqueda binaria en pasos de 2 px: unas 10 mediciones en vez de recorrer todas las combinaciones.
  const h1Px = mayorQueCabe(h1Min, px(plantilla.h1.max), (h) => prueba(h, bodyMin));
  if (h1Px == null) {
    prueba(h1Min, bodyMin);
    return true;
  }
  const bodyMax = Math.max(bodyMin, Math.min(px(plantilla.body.max), Math.floor(h1Px / JERARQUIA_H1)));
  const bodyPx = mayorQueCabe(bodyMin, bodyMax, (b) => prueba(h1Px, b)) ?? bodyMin;
  prueba(h1Px, bodyPx);
  return false;
}

/**
 * Contorno de la forma de una capa decorativa, en px de pantalla: puntos a lo largo del trazado de su recorte. El SVG
 * ocupa la caja del elemento con viewBox 0 0 100 100.
 */
function contornoForma(el: HTMLElement, n: number): { x: number; y: number }[] {
  const path = el.querySelector<SVGPathElement>("clipPath path");
  if (!path) return [];
  const caja = el.getBoundingClientRect();
  const s = caja.width / 100;
  const largo = path.getTotalLength();
  return Array.from({ length: n }, (_, i) => {
    const p = path.getPointAtLength((largo * i) / n);
    return { x: caja.left + p.x * s, y: caja.top + p.y * s };
  });
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

/**
 * El rectángulo toca la forma con un aire de `aire` px: algún punto del contorno queda a menos de ese aire del
 * rectángulo, o el rectángulo quedó adentro de la forma.
 */
export function tocaContorno(
  k: { left: number; top: number; right: number; bottom: number },
  pol: { x: number; y: number }[],
  aire = 0,
): boolean {
  if (!pol.length) return false;
  const cerca = pol.some((p) => {
    const dx = Math.max(k.left - p.x, 0, p.x - k.right);
    const dy = Math.max(k.top - p.y, 0, p.y - k.bottom);
    return Math.hypot(dx, dy) < aire || (dx === 0 && dy === 0);
  });
  return cerca || dentroDePoligono((k.left + k.right) / 2, (k.top + k.bottom) / 2, pol);
}

/** El rectángulo toca el círculo: el punto del rectángulo más cercano al centro está a menos de un radio. */
export function tocaCirculo(k: { left: number; top: number; right: number; bottom: number }, c: { cx: number; cy: number; r: number }): boolean {
  const x = Math.max(k.left, Math.min(c.cx, k.right));
  const y = Math.max(k.top, Math.min(c.cy, k.bottom));
  return Math.hypot(x - c.cx, y - c.cy) < c.r;
}

/** Mayor valor (en pasos de 2 entre min y max) para el que `cabe` es verdadero, suponiendo que achicar siempre ayuda. */
function mayorQueCabe(min: number, max: number, cabe: (v: number) => boolean): number | null {
  if (!cabe(min)) return null;
  let lo = 0;
  let hi = Math.floor((max - min) / 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (cabe(min + mid * 2)) lo = mid;
    else hi = mid - 1;
  }
  return min + lo * 2;
}

function relativo(root: HTMLElement, r: DOMRect): Rect {
  const R = root.getBoundingClientRect();
  const s = R.width / root.offsetWidth || 1;
  return { x: (r.left - R.left) / s, y: (r.top - R.top) / s, w: r.width / s, h: r.height / s };
}

/** Cajas de cada línea de texto: une los fragmentos que comparten renglón. */
function lineas(root: HTMLElement, el: HTMLElement): Rect[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const frag = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map((r) => relativo(root, r));
  const renglones: Rect[] = [];
  for (const f of frag) {
    const mismo = renglones.find((l) => Math.abs(l.y - f.y) < f.h / 2);
    if (mismo) {
      const x1 = Math.max(mismo.x + mismo.w, f.x + f.w);
      const y1 = Math.max(mismo.y + mismo.h, f.y + f.h);
      mismo.x = Math.min(mismo.x, f.x);
      mismo.y = Math.min(mismo.y, f.y);
      mismo.w = x1 - mismo.x;
      mismo.h = y1 - mismo.y;
    } else renglones.push({ ...f });
  }
  return renglones;
}

function medirTexto(root: HTMLElement, el: HTMLElement): MedidaTexto {
  const cs = getComputedStyle(el);
  return {
    lineas: lineas(root, el),
    px: Math.round(parseFloat(cs.fontSize)),
    peso: parseInt(cs.fontWeight, 10),
    italica: cs.fontStyle === "italic",
  };
}

function leerHsl(json: string | undefined): HSL | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as HSL;
  } catch {
    return null;
  }
}

function cajaDelLogo(root: HTMLElement, logo: HTMLElement) {
  const caja = relativo(root, logo.getBoundingClientRect());
  const aspecto = parseFloat(logo.dataset.logoAspecto ?? "");
  return aspecto > 0 ? cajaVisible(caja, aspecto) : caja;
}

export function medirPieza(root: HTMLElement, desborde: boolean): Medicion {
  const h1 = q(root, "h1")!;
  const body = q(root, "body");
  const cta = q(root, "cta");
  const logo = q(root, "logo");
  const forma = q(root, "forma");
  return {
    h1: medirTexto(root, h1),
    body: body && body.textContent?.trim() ? medirTexto(root, body) : null,
    cta: cta ? { ...medirTexto(root, cta), caja: relativo(root, cta.getBoundingClientRect()) } : null,
    // El logo se mide por su caja visible (object-fit: contain deja aire dentro del <img>), no por la del elemento.
    logo: logo ? cajaDelLogo(root, logo) : null,
    logoColor: leerHsl(logo?.dataset.logoColor),
    logoFondo: leerHsl(logo?.dataset.logoFondo),
    logoImagen: logo?.tagName === "IMG",
    forma: forma
      ? {
          caja: relativo(root, forma.getBoundingClientRect()),
          color: JSON.parse(forma.dataset.color!) as HSL,
          opacidad: parseFloat(getComputedStyle(forma).opacity),
        }
      : null,
    deco: medirDeco(root),
    iconos: root.querySelectorAll("[data-icono]").length,
    contacto: [...root.querySelectorAll<HTMLElement>('[data-slot="contacto-item"]')].map((fila) => {
      const icono = q(fila, "contacto-icono")!;
      return {
        icono: relativo(root, icono.getBoundingClientRect()),
        texto: medirTexto(root, q(fila, "contacto-texto")!),
        soporte: icono.dataset.soporte ? (JSON.parse(icono.dataset.soporte) as { fondo: HSL; icono: HSL }) : undefined,
      };
    }),
    decoracion: (() => {
      const el = root.querySelector<SVGElement>("[data-decoracion]");
      return el ? (JSON.parse(el.dataset.decoracion!) as GeometriaDecoracion) : null;
    })(),
    items: [...root.querySelectorAll<HTMLElement>('[data-slot="item"]')].map((it) => {
      const visual = q(it, "item-visual")!;
      return {
        visual: relativo(root, visual.getBoundingClientRect()),
        tieneVisual: visual.querySelector("[data-icono], [data-foto]") != null,
        texto: medirTexto(root, q(it, "item-texto")!),
      };
    }),
    fotosSinForma: [...root.querySelectorAll("image:not([data-foto-fondo])")].filter((img) => !img.closest("g[clip-path]")).length,
    desborde,
  };
}

function recortarAlLienzo(r: Rect, ancho: number, alto: number): Rect {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  return { x, y, w: Math.max(0, Math.min(ancho, r.x + r.w) - x), h: Math.max(0, Math.min(alto, r.y + r.h) - y) };
}

/** Contorno de la forma del 2B-L vertical cuando no es un círculo, en px del lienzo. */
function medirContorno(root: HTMLElement): { x: number; y: number }[] | undefined {
  const el = root.querySelector<HTMLElement>("[data-deco-lateral]");
  if (!el || el.hasAttribute("data-circulo")) return undefined;
  const R = root.getBoundingClientRect();
  const s = R.width / root.offsetWidth || 1;
  return contornoForma(el, 160).map((p) => ({ x: (p.x - R.left) / s, y: (p.y - R.top) / s }));
}

/** Círculo del 2B-L vertical, en px del lienzo (centro y radio). */
function medirCirculo(root: HTMLElement): { cx: number; cy: number; r: number } | undefined {
  const el = root.querySelector<HTMLElement>("[data-deco-lateral][data-circulo]");
  if (!el) return undefined;
  const c = relativo(root, el.getBoundingClientRect());
  return { cx: c.x + c.w / 2, cy: c.y + c.h / 2, r: c.w / 2 };
}

function medirDeco(root: HTMLElement): Medicion["deco"] {
  const el = q(root, "deco");
  if (!el) return null;
  return {
    tipo: el.dataset.decoTipo as TipoDeco,
    // La forma puede estar sangrada fuera del lienzo: se mide solo la parte visible.
    caja: recortarAlLienzo(relativo(root, el.getBoundingClientRect()), root.offsetWidth, root.offsetHeight),
    opacidad: parseFloat(el.dataset.opacidad ?? "1"),
    overlay: el.dataset.overlay ? parseFloat(el.dataset.overlay) : null,
    color: JSON.parse(el.dataset.color!) as HSL,
    protagonista: el.dataset.protagonista === "true",
    circulo: medirCirculo(root),
    contorno: medirContorno(root),
  };
}

/**
 * Contraste del texto sobre foto medido sobre la imagen real (E6): se dibuja en un lienzo del tamaño de la pieza (a la
 * mitad, por velocidad) la foto con el mismo encuadre, el mismo filtro de color y la misma protección que dibuja la
 * pieza, y se muestrean los píxeles que quedan debajo de cada línea del H1 y del body (el CTA lleva su propio botón de fondo). El resultado
 * es el peor contraste (percentil bajo) del color del texto contra esos píxeles.
 */
export async function medirContrasteSobreFoto(o: {
  foto: string;
  foco?: Foco;
  filtro: FiltroFoto | null;
  capa: CapaProteccion | null;
  ancho: number;
  alto: number;
  fondo: HSL;
  colorTexto: HSL;
  medicion: Medicion;
}): Promise<NonNullable<Medicion["contrasteSobreFoto"]>> {
  const dim = await dimensionesImagen(o.foto);
  const img = new Image();
  img.src = o.foto;
  await img.decode();
  const k = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(o.ancho * k);
  canvas.height = Math.round(o.alto * k);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const e = encuadre(o.foco ?? FOCO_CENTRO, dim, { w: o.ancho, h: o.alto });
  ctx.drawImage(img, e.x * k, e.y * k, e.w * k, e.h * k);
  if (o.filtro) {
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    d.data.set(aplicarFiltro(d.data, o.filtro));
    ctx.putImageData(d, 0, 0);
  }
  if (o.capa) {
    const { rect, eje, paradas, tipo } = o.capa;
    const [r, g, b] = hslToRgb(o.fondo);
    if (tipo === "placa") ctx.fillStyle = `rgba(${r},${g},${b},${paradas[0][1]})`;
    else {
      const grad = ctx.createLinearGradient((rect.x + eje[0] * rect.w) * k, (rect.y + eje[1] * rect.h) * k, (rect.x + eje[2] * rect.w) * k, (rect.y + eje[3] * rect.h) * k);
      for (const [off, a] of paradas) grad.addColorStop(off, `rgba(${r},${g},${b},${a})`);
      ctx.fillStyle = grad;
    }
    ctx.fillRect(rect.x * k, rect.y * k, rect.w * k, rect.h * k);
  }
  /** Píxeles (RGBA) debajo de las cajas, recortados al lienzo. */
  const debajo = (cajas: Rect[], color: HSL) => {
    const trozos: Uint8ClampedArray[] = [];
    for (const c of cajas) {
      const x = Math.max(0, Math.floor(c.x * k));
      const y = Math.max(0, Math.floor(c.y * k));
      const w = Math.min(canvas.width, Math.ceil((c.x + c.w) * k)) - x;
      const h = Math.min(canvas.height, Math.ceil((c.y + c.h) * k)) - y;
      if (w > 0 && h > 0) trozos.push(ctx.getImageData(x, y, w, h).data);
    }
    const todo = new Uint8ClampedArray(trozos.reduce((n, t) => n + t.length, 0));
    let i = 0;
    for (const t of trozos) {
      todo.set(t, i);
      i += t.length;
    }
    return peorContraste(todo, color);
  };
  const m = o.medicion;
  return {
    h1: debajo(m.h1.lineas, o.colorTexto),
    ...(m.body ? { body: debajo(m.body.lineas, o.colorTexto) } : {}),
  };
}
