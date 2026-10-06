// Presets por rubro (manual cap. 7 / A.7, v1.1) y tabla de luminosidad por banda de matiz (cap. 3 paso 3).

export type Rubro = "servicios" | "gastronomia" | "belleza" | "tech";
export type Tono = "seria" | "cercana";
export type ValorMarca = "confianza" | "energia" | "calma" | "innovacion";
export type TipoAcento = "complementario" | "analogo";
export type Modo = "A" | "B";
export type Alineacion = "izquierda" | "centrado";
/** "P" (Punto) es solo para los slides de contenido del carrusel. */
export type Variante = "1" | "2" | "2B-L" | "2B-S" | "3" | "4" | "P";

export interface PresetRubro {
  nombre: string;
  ejemplos: string;
  personalidad: string;
  H_rango: [number, number];
  secuencia: Modo[];
  /** Familia según pregunta 1 de personalidad (v1.1). */
  familia: Record<Tono, string>;
  italic: boolean;
  acento_default: TipoAcento;
  formas: string[];
  patron: string[];
  dependencia_foto: "nula" | "media" | "alta";
  deco_2B: string[];
  alineacion_2_3: Alineacion[];
  prioritarias: Variante[];
}

export const PRESETS: Record<Rubro, PresetRubro> = {
  servicios: {
    nombre: "Servicios / B2B",
    ejemplos: "abogados, contadores, consultoras, inmobiliarias",
    personalidad: "confiable",
    H_rango: [200, 230],
    secuencia: ["A", "A", "B"],
    familia: { seria: "Inter", cercana: "Manrope" },
    italic: false,
    acento_default: "analogo",
    formas: ["geometricas", "lineales"],
    patron: ["grilla", "diagonales"],
    dependencia_foto: "nula",
    deco_2B: ["icono", "forma_geometrica", "foto_overlay si foto_habilitada"],
    alineacion_2_3: ["izquierda"],
    prioritarias: ["1", "2", "3"],
  },
  gastronomia: {
    nombre: "Gastronomía / retail",
    ejemplos: "restaurantes, cafés, tiendas, kioscos, delivery",
    personalidad: "cálido",
    H_rango: [15, 40],
    secuencia: ["A", "B"],
    familia: { seria: "Sora", cercana: "Fraunces" },
    italic: true,
    acento_default: "complementario",
    formas: ["contenedores", "geometricas"],
    patron: ["puntos"],
    dependencia_foto: "alta",
    deco_2B: ["foto_overlay"],
    alineacion_2_3: ["izquierda", "centrado"],
    prioritarias: ["4", "2B-L", "1"],
  },
  belleza: {
    nombre: "Belleza / lifestyle",
    ejemplos: "estética, spa, fitness, moda, peluquería",
    personalidad: "premium",
    H_rango: [260, 300],
    secuencia: ["A", "A", "B"],
    familia: { seria: "Newsreader", cercana: "Fraunces" },
    italic: true,
    acento_default: "analogo",
    formas: ["organicas", "lineales"],
    patron: ["ondas", "ruido"],
    dependencia_foto: "media",
    deco_2B: ["blob", "foto_overlay"],
    alineacion_2_3: ["izquierda", "centrado"],
    prioritarias: ["2B-L", "2", "1"],
  },
  tech: {
    nombre: "Tech / digital",
    ejemplos: "apps, software, e-commerce, servicios digitales",
    personalidad: "innovador",
    H_rango: [160, 190],
    secuencia: ["B", "B", "A"],
    familia: { seria: "Sora", cercana: "Space Grotesk" },
    italic: false,
    acento_default: "complementario",
    formas: ["geometricas", "contenedores"],
    patron: ["grilla"],
    dependencia_foto: "nula",
    deco_2B: ["forma", "patron_grilla", "foto_overlay si foto_habilitada"],
    alineacion_2_3: ["izquierda"],
    prioritarias: ["1", "2B-L", "4"],
  },
};

export const RUBROS = Object.keys(PRESETS) as Rubro[];

/** Cap. 3 paso 3: L del color de marca (S 70%) según banda de H. Única fuente de L (v1.1). */
const BANDAS_L: { hasta: number; L: number }[] = [
  { hasta: 20, L: 42 },  // rojos
  { hasta: 45, L: 32 },  // naranjas, terracota
  { hasta: 70, L: 25 },  // amarillos, dorados
  { hasta: 160, L: 25 }, // verdes
  { hasta: 200, L: 25 }, // turquesas
  { hasta: 250, L: 40 }, // azules
  { hasta: 320, L: 45 }, // violetas
  { hasta: 360, L: 42 }, // rosas, magentas
];

export function L_tabla(H: number): number {
  const h = ((H % 360) + 360) % 360;
  return BANDAS_L.find((b) => h < b.hasta)?.L ?? 42;
}
