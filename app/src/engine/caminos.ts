// Exploración de caminos (replanteo, E5): a partir del diagnóstico se proponen 2 o 3 caminos visiblemente distintos
// (ejes, matiz, tipografía y forma propia) para que el cliente elija uno. Todo es determinista: el mismo diagnóstico
// da siempre los mismos caminos.

import { distanciaH } from "./color";
import type { Forma } from "./biblioteca";
import {
  bandasProhibidas,
  chipDeMatiz,
  construirMarca,
  enAlgunaBanda,
  fueraDeBandas,
  generarChips,
  type Chip,
  type Diagnostico,
  type Marca,
} from "./diagnostico";
import { tonoDeEjes, valorDeEjes, familiaDeEjes, type Ejes } from "./ejes";
import { PRESETS } from "./presets";
import { formaParametrica } from "./recursos";
import { elegirPar, paresSugeridos, resolverTipografia, type Tipografia } from "./typography";

export type IdCamino = "fiel" | "expresivo" | "sobrio" | "moodboard";

export interface Camino {
  id: IdCamino;
  /** Nombre y descripción en lenguaje de cliente, sin jerga. */
  nombre: string;
  descripcion: string;
  ejes: Ejes;
  chip: Chip;
  tipografia: Tipografia;
  /** Forma propia paramétrica, con semilla estable por marca y camino (E2). */
  forma: Forma;
}

/** Dos caminos difieren si el matiz está a 20° o más, o si la familia tipográfica es otra. */
export const MATIZ_DISTINTO = 20;

const IDS_EJES = ["clasico_moderno", "sobrio_expresivo", "artesanal_tecnologico", "calido_frio", "accesible_premium", "serio_ludico"] as const;
const acotar = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const mover = (e: Ejes, cambios: Partial<Ejes>): Ejes =>
  Object.fromEntries(IDS_EJES.map((k) => [k, acotar(e[k] + (cambios[k] ?? 0))])) as Ejes;

/** Diagnóstico con los ejes del camino: tono y valor se derivan de ellos, como en el asistente. */
export function diagnosticoDeCamino(d: Diagnostico, c: Camino): Diagnostico {
  return {
    ...d,
    ejes: c.ejes,
    personalidad: { tono: tonoDeEjes(c.ejes), valor: valorDeEjes(c.ejes) },
    matiz_elegido: c.chip.H,
    decision_color: "chip_optimizado",
  };
}

/**
 * Distancia entre dos caminos, de 0 (iguales) a 1: mitad matiz (hasta 90°), 30 % familia y 20 % ejes. Sirve para
 * ordenarlos y para el control de que difieren.
 */
export function distanciaCamino(a: Camino, b: Camino): number {
  const matiz = Math.min(distanciaH(a.chip.H, b.chip.H), 90) / 90;
  const familia = a.tipografia.familia_variable === b.tipografia.familia_variable ? 0 : 1;
  const ejes = Math.hypot(...IDS_EJES.map((k) => a.ejes[k] - b.ejes[k])) / (100 * Math.sqrt(IDS_EJES.length));
  return 0.5 * matiz + 0.3 * familia + 0.2 * ejes;
}

export function sonDistintos(a: Camino, b: Camino): boolean {
  return distanciaH(a.chip.H, b.chip.H) >= MATIZ_DISTINTO || a.tipografia.familia_variable !== b.tipografia.familia_variable;
}

/** Matiz dominante del moodboard: el color más presente que tenga carácter (ni gris ni casi blanco o negro). */
export function matizDominante(moodboard: Diagnostico["moodboard"]): number | null {
  const util = (moodboard ?? []).filter((m) => m.color.S >= 20 && m.color.L >= 15 && m.color.L <= 90);
  if (!util.length) return null;
  return util.reduce((a, b) => (b.peso > a.peso ? b : a)).color.H;
}

function semilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

function tipografiaDe(d: Diagnostico, ejes: Ejes): Tipografia {
  const base = resolverTipografia(d.rubro, tonoDeEjes(ejes), d.tipografia_previa, familiaDeEjes(ejes));
  const par = paresSugeridos(base.familia_variable, base)[0] ?? null;
  return elegirPar(base, base.familia_variable, par, PRESETS[d.rubro].italic);
}

/** Chips con paleta que respetan las bandas prohibidas (la del cliente y la de la competencia). */
function candidatos(d: Diagnostico, ejes: Ejes, conPrevio: boolean): Chip[] {
  const bandas = bandasProhibidas(d);
  return generarChips({ ...d, ejes, personalidad: { tono: tonoDeEjes(ejes), valor: valorDeEjes(ejes) } }).filter(
    (c) => c.resultado.paleta && (c.id.startsWith("rango-") || (conPrevio && c.id === "previo-optimizado")) && !enAlgunaBanda(c.H, bandas),
  );
}

/** Elige el chip más lejano en matiz de los ya elegidos; el primer camino toma el del medio (o el color actual del cliente). */
function elegirChip(cands: Chip[], previos: Camino[]): Chip | null {
  if (!cands.length) return null;
  if (!previos.length) return cands.find((c) => c.id === "previo-optimizado") ?? cands[Math.floor((cands.length - 1) / 2)];
  const lejania = (c: Chip) => Math.min(...previos.map((p) => distanciaH(c.H, p.chip.H)));
  return cands.reduce((a, b) => (lejania(b) > lejania(a) ? b : a));
}

/** Chip para el matiz dominante del moodboard: el exacto si la paleta sale, y si no el más cercano que salga. */
function chipDeMoodboard(d: Diagnostico, ejes: Ejes, H: number): Chip | null {
  const dd = { ...d, ejes, personalidad: { tono: tonoDeEjes(ejes), valor: valorDeEjes(ejes) } };
  const bandas = bandasProhibidas(d);
  for (let delta = 0; delta <= 40; delta += 8) {
    for (const s of delta ? [delta, -delta] : [0]) {
      const h = fueraDeBandas((H + s + 360) % 360, bandas);
      const chip = chipDeMatiz(dd, h, "moodboard", "Desde tu moodboard");
      if (chip.resultado.paleta) return chip;
    }
  }
  return null;
}

const TEXTOS: Record<IdCamino, { nombre: string; descripcion: string }> = {
  fiel: { nombre: "Fiel a lo que contaste", descripcion: "Respeta la personalidad que marcaste, tal cual: un punto de partida seguro y equilibrado." },
  expresivo: { nombre: "Más expresivo", descripcion: "Más color y más energía, con un tono cercano y juguetón. Se hace notar." },
  sobrio: { nombre: "Más sobrio y clásico", descripcion: "Más calma y seriedad, con letras de aire clásico. Transmite confianza y oficio." },
  moodboard: { nombre: "Inspirado en tus referencias", descripcion: "Parte del color que más aparece en las imágenes que compartiste." },
};

/** Cuánto se corre cada eje respecto de los del cliente en los caminos que no son el fiel. */
const VARIACION: Record<"expresivo" | "sobrio", Partial<Ejes>> = {
  expresivo: { sobrio_expresivo: 35, serio_ludico: 30, calido_frio: -20 },
  sobrio: { sobrio_expresivo: -35, serio_ludico: -30, clasico_moderno: -25, calido_frio: 20 },
};

/**
 * Hasta 3 caminos del diagnóstico: "Fiel" (los ejes tal cual), "Más expresivo", "Más sobrio y clásico" y, si hay
 * moodboard, uno que sale de su color dominante (que ocupa el segundo lugar). Todos respetan la banda prohibida y la
 * competencia, y difieren entre sí en matiz o en familia: si dos salen parecidos, se empujan los ejes del segundo
 * hasta que se separen.
 */
export function generarCaminos(d: Diagnostico, n = 3): Camino[] {
  const dominante = matizDominante(d.moodboard);
  const orden: IdCamino[] = dominante != null ? ["fiel", "moodboard", "expresivo", "sobrio"] : ["fiel", "expresivo", "sobrio"];
  const caminos: Camino[] = [];
  for (const id of orden) {
    if (caminos.length >= Math.max(1, Math.min(n, 3))) break;
    let ejes = id === "fiel" || id === "moodboard" ? d.ejes : mover(d.ejes, VARIACION[id]);
    for (let intento = 0; intento < 4; intento++) {
      const chip = id === "moodboard" ? chipDeMoodboard(d, ejes, dominante!) : elegirChip(candidatos(d, ejes, id === "fiel"), caminos);
      if (!chip) break;
      const camino: Camino = {
        id,
        ...TEXTOS[id],
        ejes,
        chip,
        tipografia: tipografiaDe(d, ejes),
        forma: formaParametrica(semilla(`${d.nombre}|${id}`), ejes, "Forma propia"),
      };
      // Primero se busca que el matiz se vea distinto; solo al final alcanza con otra familia.
      const ok = caminos.every((c) => (intento < 3 ? distanciaH(c.chip.H, camino.chip.H) >= MATIZ_DISTINTO : sonDistintos(c, camino)));
      if (ok || intento === 3) {
        caminos.push(camino);
        break;
      }
      // Salió parecido a otro: se empuja hacia el lado opuesto del eje clásico y del cálido ↔ frío.
      const paso = 25 * (intento + 1);
      ejes = mover(ejes, { clasico_moderno: ejes.clasico_moderno >= 50 ? -paso : paso, calido_frio: ejes.calido_frio >= 50 ? -paso : paso });
    }
  }
  return caminos;
}

/** Aplica el camino a una marca ya armada: su par tipográfico y su forma propia. */
export function aplicarCamino(m: Marca, c: Camino): Marca {
  return {
    ...m,
    identidad: { ...m.identidad, tipografia: c.tipografia, recursos: { ...m.identidad.recursos, formas: [c.forma] } },
  };
}

/** Marca completa del camino elegido: color, par tipográfico y forma propia. */
export function marcaDeCamino(d: Diagnostico, c: Camino, organizacion_id = "hualito"): Marca {
  return aplicarCamino(construirMarca(diagnosticoDeCamino(d, c), c.chip, organizacion_id), c);
}

