// Matriz de formatos y canales (manual cap. 1, cap. 6 "Grillas por formato").

export type Formato = "4:5" | "1:1" | "9:16" | "1200x630";
export type Canal = "feed_ig" | "stories_ig" | "estados_wa" | "feed_fb" | "link";

export interface EspecFormato {
  nombre: string;
  ancho: number;
  alto: number;
  /**
   * Margen de diseño como fracción de cada dimensión: el contenido va dentro de [x, 1-x] del ancho y de
   * [arriba, 1-abajo] del alto. Arriba y abajo pueden diferir: en 9:16 la interfaz tapa más abajo que arriba.
   */
  zona: Margenes;
  /** Margen mínimo que exige el checklist (bloque 4). */
  zonaMinima: Margenes;
  /**
   * Franjas que tapa la interfaz de la plataforma al ver la pieza (fracción del alto). Stories y estados: foto de
   * perfil, nombre y barra de progreso arriba (~250 px de 1920); barra de respuesta y botón abajo (~340 px).
   */
  interfaz?: { arriba: number; abajo: number; nombre: string };
  /**
   * Grilla del perfil de Instagram (3:4 desde 2025): la miniatura se recorta al centro y pierde esta fracción del
   * ancho de cada lado. 1:1 pierde 135 px por lado; 4:5, 34 px.
   */
  recorteGrilla?: number;
  escala: "feed" | "story";
  habilitado: boolean;
  /** Formatos horizontales: fracción del ancho donde termina la columna del mensaje (Facebook: 50%). */
  columnaMensaje?: number;
}

export interface Margenes {
  x: number;
  arriba: number;
  abajo: number;
}

/** Fracción del ancho que la grilla 3:4 del perfil recorta de cada lado en una pieza de ancho × alto. */
function recorte34(ancho: number, alto: number): number {
  return Math.max(0, (ancho - alto * 0.75) / 2 / ancho);
}

export const FORMATOS: Record<Formato, EspecFormato> = {
  "4:5": {
    nombre: "Feed 4:5 · 1080×1350",
    ancho: 1080,
    alto: 1350,
    zona: { x: 0.11, arriba: 0.11, abajo: 0.11 },
    zonaMinima: { x: 0.1, arriba: 0.1, abajo: 0.1 },
    recorteGrilla: recorte34(1080, 1350),
    escala: "feed",
    habilitado: true,
  },
  "1:1": {
    nombre: "Feed 1:1 · 1080×1080",
    ancho: 1080,
    alto: 1080,
    // Margen lateral del 14%: la grilla 3:4 del perfil recorta el 12,5% de cada lado y el mensaje tiene que seguir
    // entero (y con aire) en la miniatura.
    zona: { x: 0.14, arriba: 0.11, abajo: 0.11 },
    zonaMinima: { x: 0.1, arriba: 0.1, abajo: 0.1 },
    recorteGrilla: recorte34(1080, 1080),
    escala: "feed",
    habilitado: true,
  },
  "9:16": {
    nombre: "Story / estado 9:16 · 1080×1920",
    ancho: 1080,
    alto: 1920,
    // Abajo se reserva más: la barra de respuesta (y el botón en anuncios) tapa ~340 px; arriba, ~250 px.
    zona: { x: 0.11, arriba: 0.15, abajo: 0.2 },
    zonaMinima: { x: 0.1, arriba: 0.15, abajo: 0.18 },
    interfaz: { arriba: 250 / 1920, abajo: 340 / 1920, nombre: "interfaz de stories y estados" },
    escala: "story",
    habilitado: true,
  },
  "1200x630": {
    nombre: "Link / vista previa · 1200×630",
    ancho: 1200,
    alto: 630,
    zona: { x: 0.1, arriba: 0.1, abajo: 0.1 },
    zonaMinima: { x: 0.1, arriba: 0.1, abajo: 0.1 },
    escala: "feed",
    habilitado: true,
    columnaMensaje: 0.5,
  },
};

export const CANALES: Record<Canal, { nombre: string; formatos: Formato[] }> = {
  feed_ig: { nombre: "Instagram · feed", formatos: ["4:5", "1:1"] },
  stories_ig: { nombre: "Instagram · stories", formatos: ["9:16"] },
  estados_wa: { nombre: "WhatsApp · estados", formatos: ["9:16"] },
  // El post orgánico de Facebook rinde más en vertical (v1.1): el 1.91:1 queda para vistas previas de links y anuncios.
  feed_fb: { nombre: "Facebook · feed", formatos: ["4:5", "1:1"] },
  link: { nombre: "Link / vista previa · 1.91:1", formatos: ["1200x630"] },
};
