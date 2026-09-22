// Ajuste de texto al slot y medición de la pieza renderizada (lado navegador).
// Trabaja sobre el DOM real a tamaño de lienzo; si la pieza está escalada con CSS para la vista previa, las medidas
// se normalizan a px del lienzo.

import type { HSL } from "@/engine/color";
import type { Medicion, MedidaTexto, Rect } from "@/engine/checklist";
import type { TipoDeco } from "@/engine/biblioteca";
import type { PlantillaVariante } from "@/engine/pieza";

const q = (root: HTMLElement, slot: string) => root.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

/**
 * Busca el H1 más grande que entra en la zona del mensaje, achicando primero el body para que la jerarquía la
 * conserve el H1. No desborda a lo ancho ni pasa el alto máximo del H1 de la variante. Si nada entra al mínimo,
 * informa desborde.
 */
export function ajustarTexto(root: HTMLElement, plantilla: PlantillaVariante, alto: number, escala: number): boolean {
  const zona = q(root, "mensaje");
  const contenido = q(root, "mensaje-contenido");
  const h1 = q(root, "h1");
  if (!zona || !contenido || !h1) return false;
  const body = q(root, "body");
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
  const cabe = () =>
    contenido.offsetHeight <= zona.clientHeight + 1 &&
    letrasDentro() &&
    h1.scrollWidth <= h1.clientWidth + 1 &&
    (!body || body.scrollWidth <= body.clientWidth + 1) &&
    h1.offsetHeight <= plantilla.h1.altoMax * alto &&
    (!plantilla.h1.maxLineas || lineasH1() <= plantilla.h1.maxLineas);
  // Renglones del H1 a partir de su alto y su interlineado (1,04).
  const lineasH1 = () => Math.round(h1.offsetHeight / (parseFloat(getComputedStyle(h1).fontSize) * 1.04));

  const prueba = (h: number, b: number) => {
    root.style.setProperty("--h1", `${h}px`);
    root.style.setProperty("--body", `${b}px`);
    return cabe();
  };
  const h1Min = px(plantilla.h1.min);
  const bodyMin = px(plantilla.body.min);
  // 1) El H1 más grande que entra con el body al mínimo; 2) con ese H1, el body más grande que entra.
  // Búsqueda binaria en pasos de 2 px: unas 10 mediciones en vez de recorrer todas las combinaciones.
  const h1Px = mayorQueCabe(h1Min, px(plantilla.h1.max), (h) => prueba(h, bodyMin));
  if (h1Px == null) {
    prueba(h1Min, bodyMin);
    return true;
  }
  const bodyPx = mayorQueCabe(bodyMin, px(plantilla.body.max), (b) => prueba(h1Px, b)) ?? bodyMin;
  prueba(h1Px, bodyPx);
  return false;
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
    logo: logo ? relativo(root, logo.getBoundingClientRect()) : null,
    forma: forma
      ? {
          caja: relativo(root, forma.getBoundingClientRect()),
          color: JSON.parse(forma.dataset.color!) as HSL,
          opacidad: parseFloat(getComputedStyle(forma).opacity),
        }
      : null,
    deco: medirDeco(root),
    iconos: root.querySelectorAll("[data-icono]").length,
    contacto: [...root.querySelectorAll<HTMLElement>('[data-slot="contacto-item"]')].map((fila) => ({
      icono: relativo(root, q(fila, "contacto-icono")!.getBoundingClientRect()),
      texto: medirTexto(root, q(fila, "contacto-texto")!),
    })),
    items: [...root.querySelectorAll<HTMLElement>('[data-slot="item"]')].map((it) => {
      const visual = q(it, "item-visual")!;
      return {
        visual: relativo(root, visual.getBoundingClientRect()),
        tieneVisual: visual.querySelector("[data-icono], [data-foto]") != null,
        texto: medirTexto(root, q(it, "item-texto")!),
      };
    }),
    fotosSinForma: [...root.querySelectorAll("image")].filter((img) => !img.closest("g[clip-path]")).length,
    desborde,
  };
}

function medirDeco(root: HTMLElement): Medicion["deco"] {
  const el = q(root, "deco");
  if (!el) return null;
  return {
    tipo: el.dataset.decoTipo as TipoDeco,
    caja: relativo(root, el.getBoundingClientRect()),
    opacidad: parseFloat(el.dataset.opacidad ?? "1"),
    overlay: el.dataset.overlay ? parseFloat(el.dataset.overlay) : null,
    color: JSON.parse(el.dataset.color!) as HSL,
  };
}
