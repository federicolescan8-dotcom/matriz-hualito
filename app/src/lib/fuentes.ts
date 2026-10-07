import {
  Bricolage_Grotesque,
  DM_Sans,
  Fraunces,
  Inter,
  Literata,
  Manrope,
  Newsreader,
  Outfit,
  Playfair_Display,
  Sora,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import type { FuentePropia } from "@/engine/typography";

// Las familias variables del sistema (manual cap. 4) y el catálogo ampliado (E3). Solo se pide itálica a las que la
// tienen. Las del catálogo ampliado no se precargan: se bajan recién cuando una pieza las usa.
const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-manrope" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-fraunces" });
const sora = Sora({ subsets: ["latin"], variable: "--f-sora" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-newsreader" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--f-space-grotesk" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-playfair", preload: false });
const literata = Literata({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-literata", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-dm-sans", preload: false });
const workSans = Work_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-work-sans", preload: false });
const outfit = Outfit({ subsets: ["latin"], variable: "--f-outfit", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-bricolage", preload: false });

export const variablesFuentes = [inter, manrope, fraunces, sora, newsreader, spaceGrotesk, playfair, literata, dmSans, workSans, outfit, bricolage]
  .map((f) => f.variable)
  .join(" ");

const VAR_POR_FAMILIA: Record<string, string> = {
  Inter: "--f-inter",
  Manrope: "--f-manrope",
  Fraunces: "--f-fraunces",
  Sora: "--f-sora",
  Newsreader: "--f-newsreader",
  "Space Grotesk": "--f-space-grotesk",
  "Playfair Display": "--f-playfair",
  Literata: "--f-literata",
  "DM Sans": "--f-dm-sans",
  "Work Sans": "--f-work-sans",
  Outfit: "--f-outfit",
  "Bricolage Grotesque": "--f-bricolage",
};

/** Pila CSS de una familia. Una fuente propia (E3) se nombra tal cual: la registra `cargarFuentePropia`. */
export function fontFamily(familia: string): string {
  const v = VAR_POR_FAMILIA[familia];
  return v ? `var(${v}), system-ui, sans-serif` : `"${familia.replaceAll('"', "")}", system-ui, sans-serif`;
}

const POR_FAMILIA: Record<string, { style: { fontFamily: string } }> = {
  Inter: inter,
  Manrope: manrope,
  Fraunces: fraunces,
  Sora: sora,
  Newsreader: newsreader,
  "Space Grotesk": spaceGrotesk,
  "Playfair Display": playfair,
  Literata: literata,
  "DM Sans": dmSans,
  "Work Sans": workSans,
  Outfit: outfit,
  "Bricolage Grotesque": bricolage,
};

/**
 * Pide al navegador las familias que usa la pieza y espera a que carguen. Las del catálogo ampliado no se precargan, y
 * `document.fonts.ready` no espera una fuente que todavía nadie pidió: sin esto el ajuste de texto mediría con la de
 * reemplazo.
 */
export function asegurarFamilias(familias: string[]): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const pedidos = [...new Set(familias)].flatMap((f) => {
    // Solo la primera familia de la pila: la de reemplazo de next/font es un local() que en Linux no existe, y si
    // falla una cara `document.fonts.load` rechaza todo, aunque la principal siga cargando.
    const principal = (POR_FAMILIA[f]?.style.fontFamily ?? `"${f}"`).split(",")[0].trim();
    return [400, 600, 900].map((w) => document.fonts.load(`${w} 32px ${principal}`).catch(() => []));
  });
  return Promise.all(pedidos).then(() => undefined);
}

const cargadas = new Map<string, Promise<void>>();

/**
 * Registra la fuente propia de la marca en el documento (FontFace) y espera a que cargue, para que el ajuste de texto
 * mida con la fuente real. Se registra una vez por nombre y archivo.
 */
export function cargarFuentePropia(f: FuentePropia | undefined): Promise<void> {
  if (!f || typeof document === "undefined") return Promise.resolve();
  const clave = `${f.nombre}:${f.archivo.length}`;
  if (!cargadas.has(clave)) {
    const cara = new FontFace(f.nombre, `url(${f.archivo})`, { weight: "100 900", style: "normal" });
    cargadas.set(
      clave,
      cara
        .load()
        .then((c) => {
          document.fonts.add(c);
        })
        .catch(() => undefined),
    );
  }
  return cargadas.get(clave)!;
}
