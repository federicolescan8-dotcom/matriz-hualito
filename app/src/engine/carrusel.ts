// Carrusel 4:5 (v1.1): de 2 a 10 slides con una estructura fija de lectura. La portada engancha, los slides de
// contenido desarrollan de a un punto y el cierre lleva el único llamado a la acción. Cada slide se convierte en una
// pieza simple (piezaDeSlide), así se dibuja, se mide y se controla con el mismo motor que el resto.

import type { Marca } from "./diagnostico";
import type { Bloque, Control, ResultadoChecklist } from "./checklist";
import { piezaNueva, secuenciaModo, type DatoContacto, type Deco, type ItemCatalogo, type Pieza } from "./pieza";
import type { Modo, Variante } from "./presets";

export type RolSlide = "portada" | "contenido" | "cierre";

export interface Slide {
  id: string;
  rol: RolSlide;
  variante: Variante;
  contenido: Pieza["contenido"];
  deco?: Deco | null;
  contacto?: DatoContacto[];
  items?: ItemCatalogo[];
}

export interface Carrusel {
  id: string;
  marca_id: string;
  slides: Slide[];
}

export const MIN_SLIDES = 2;
export const MAX_SLIDES = 10;

/** Variantes que admite cada rol. Portada sin CTA; contenido sin logo ni CTA; cierre con logo y CTA. */
export const VARIANTES_POR_ROL: Record<RolSlide, Variante[]> = {
  portada: ["2", "2B-L"],
  contenido: ["P", "2", "3", "4"],
  cierre: ["1"],
};

/** Palabras sugeridas para el H1 de la portada: un gancho que se lee de un vistazo. */
export const PALABRAS_PORTADA = 8;

export const NOMBRE_ROL: Record<RolSlide, string> = { portada: "Portada", contenido: "Contenido", cierre: "Cierre" };

function slide(rol: RolSlide, variante: Variante, contenido: Pieza["contenido"]): Slide {
  return { id: crypto.randomUUID(), rol, variante, contenido };
}

/** Slide de contenido nuevo (variante Punto). */
export function slideContenido(n: number): Slide {
  return slide("contenido", "P", { h1: `Punto ${n}`, body: "Desarrollá la idea en una o dos frases.", cta: null });
}

/** Estructura por defecto: portada, tres puntos y cierre. */
export function carruselNuevo(marca: Marca): Carrusel {
  return {
    id: crypto.randomUUID(),
    marca_id: marca.id,
    slides: [
      slide("portada", "2", { h1: "3 claves para tu marca", body: null, cta: null }),
      slideContenido(1),
      slideContenido(2),
      slideContenido(3),
      slide("cierre", "1", { h1: "¿Lo ponemos en marcha?", body: "Escribinos y lo armamos juntos.", cta: "Escribinos" }),
    ],
  };
}

/**
 * Modo de cada slide: portada y cierre en el modo predominante de la marca; el contenido en el opuesto, para marcar
 * el ritmo de lectura.
 */
export function modoDeSlide(marca: Marca, rol: RolSlide): Modo {
  const predominante = secuenciaModo(marca)[0];
  return rol === "contenido" ? (predominante === "A" ? "B" : "A") : predominante;
}

/** Número del punto (01, 02…) entre los slides de contenido. */
function numeroDePunto(c: Carrusel, i: number): number {
  return c.slides.slice(0, i + 1).filter((s) => s.rol === "contenido").length;
}

/** El slide i como pieza simple 4:5. Solo el cierre conserva el CTA. */
export function piezaDeSlide(marca: Marca, c: Carrusel, i: number): Pieza {
  const s = c.slides[i];
  const base = piezaNueva(marca);
  return {
    ...base,
    id: s.id,
    canal: "feed_ig",
    formato: "4:5",
    variante: s.variante,
    modo: modoDeSlide(marca, s.rol),
    alineacion: "izquierda",
    contenido: { ...s.contenido, cta: s.rol === "cierre" ? s.contenido.cta : null },
    deco: s.deco ?? null,
    contacto: s.contacto ?? base.contacto,
    items: s.items ?? base.items,
    carrusel: {
      indice: i + 1,
      total: c.slides.length,
      rol: s.rol,
      punto: s.rol === "contenido" ? numeroDePunto(c, i) : undefined,
    },
  };
}

/** Mueve un slide de contenido; la portada queda primera y el cierre último. */
export function moverSlide(c: Carrusel, i: number, delta: -1 | 1): Carrusel {
  const j = i + delta;
  if (c.slides[i]?.rol !== "contenido" || c.slides[j]?.rol !== "contenido") return c;
  const slides = [...c.slides];
  [slides[i], slides[j]] = [slides[j], slides[i]];
  return { ...c, slides };
}

/** Agrega un slide de contenido antes del cierre (hasta 10 en total). */
export function agregarSlide(c: Carrusel): Carrusel {
  if (c.slides.length >= MAX_SLIDES) return c;
  const n = c.slides.filter((s) => s.rol === "contenido").length + 1;
  const slides = [...c.slides];
  slides.splice(slides.length - 1, 0, slideContenido(n));
  return { ...c, slides };
}

/** Quita un slide de contenido (la portada y el cierre no se quitan). */
export function quitarSlide(c: Carrusel, i: number): Carrusel {
  if (c.slides[i]?.rol !== "contenido" || c.slides.length <= MIN_SLIDES) return c;
  return { ...c, slides: c.slides.filter((_, j) => j !== i) };
}

/**
 * Control del carrusel como serie: cantidad de slides, estructura (portada primera, cierre último), un único CTA en el
 * cierre, portada corta y que ningún slide quede rechazado o en revisión. `resultados[i]` es el checklist del slide i
 * (undefined mientras se mide).
 */
export function evaluarCarrusel(
  marca: Marca,
  c: Carrusel,
  resultados: (ResultadoChecklist | undefined)[],
): ResultadoChecklist {
  const controles: Control[] = [];
  const add = (bloque: Bloque, control: string, ok: boolean, detalle: string, accion: string) =>
    controles.push({ bloque, control, ok, detalle, accion, nivel: "aviso" });
  const n = c.slides.length;
  add("Contenido", `Entre ${MIN_SLIDES} y ${MAX_SLIDES} slides`, n >= MIN_SLIDES && n <= MAX_SLIDES, `${n}`, "agregar o quitar slides");
  const estructura =
    c.slides[0]?.rol === "portada" &&
    c.slides[n - 1]?.rol === "cierre" &&
    c.slides.slice(1, -1).every((s) => s.rol === "contenido");
  add("Composición", "Portada primera, contenido en el medio, cierre al final", estructura, "", "reordenar");
  const piezas = c.slides.map((_, i) => piezaDeSlide(marca, c, i));
  const conCta = piezas.filter((p) => p.contenido.cta?.trim()).map((p) => p.carrusel!.rol);
  add(
    "Contenido",
    "Un único CTA, en el cierre",
    conCta.length === 1 && conCta[0] === "cierre",
    conCta.length ? conCta.join(", ") : "sin CTA",
    "cargar el CTA del cierre",
  );
  const palabras = c.slides[0]?.contenido.h1.trim().split(/\s+/).filter(Boolean).length ?? 0;
  add(
    "Contenido",
    `Portada con gancho corto (hasta ${PALABRAS_PORTADA} palabras)`,
    palabras > 0 && palabras <= PALABRAS_PORTADA,
    `${palabras} palabras`,
    "acortar el H1 de la portada",
  );
  const pendientes = c.slides.filter((_, i) => !resultados[i]).length;
  const malos = c.slides.map((_, i) => (resultados[i] && resultados[i]!.estado !== "ok" ? i + 1 : null)).filter((v): v is number => v != null);
  add(
    "Contenido",
    "Todos los slides aprobados",
    malos.length === 0 && pendientes === 0,
    malos.length ? `slides ${malos.join(", ")}` : pendientes ? "midiendo…" : "",
    "corregir los slides marcados",
  );
  const revision = resultados.some((r) => r?.estado === "revision_manual");
  const motivos_revision = revision ? ["Hay slides en revisión manual: el texto no entra en su slot."] : [];
  const estado = revision ? "revision_manual" : controles.every((k) => k.ok) ? "ok" : "rechazado";
  return { estado, controles, motivos_revision };
}
