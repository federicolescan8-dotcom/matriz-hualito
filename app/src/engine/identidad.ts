// Identidad de la marca (replanteo, etapa E1): todo lo visual agrupado en un solo lugar. La marca queda con sus datos
// (nombre, rubro, diagnóstico) y la identidad con el sistema visual. Publicar lee solo de acá.

import type { HSL } from "./color";
import type { Diagnostico, Marca } from "./diagnostico";
import type { EstiloIconos } from "./biblioteca";
import { BIBLIOTECA_RUBRO } from "./biblioteca";
import type { Paleta, RolPaleta } from "./palette";
import type { Tipografia } from "./typography";

export interface Identidad {
  /** Color: cómo se eligió el color de marca y la paleta que sale de él (cap. 3). */
  color: {
    modo: "optimizado" | "heredado";
    base: HSL;
    version_funcional: HSL | null;
    banda_prohibida: [number, number] | null;
    /**
     * Heredado que no alcanza como texto y el cliente eligió no usar versión funcional (v1.1). Los controles de color
     * que no cumplen se aceptan con aviso.
     */
    solo_heredado?: boolean;
  };
  paleta: Paleta;
  /** Paleta tal como la calculó la fórmula, antes de ajustes manuales. */
  paleta_calculada?: Paleta;
  /** Roles que se modificaron a mano después del cálculo. */
  ajustes_manuales?: RolPaleta[];
  /** Tipografía (cap. 4). */
  tipografia: Tipografia;
  /** Logo y su par monocromo, como data URLs. */
  logo: Diagnostico["logo"];
  /** Recursos gráficos: un solo estilo de íconos por marca (cap. 5). */
  graficos: { estilo_iconos: EstiloIconos };
  /** Fotografía: la marca tiene fotos propias (habilita la foto como capa decorativa y en el catálogo). */
  fotos_habilitadas: boolean;
}

/** Campos visuales que antes de E1 vivían en la raíz de la marca. */
const CAMPOS_VISUALES = ["color", "paleta", "paleta_calculada", "ajustes_manuales", "tipografia", "logo", "graficos", "fotos_habilitadas"] as const;

/** Marca guardada antes de E1: lo visual en la raíz, sin `identidad`. */
export type MarcaV1 = Omit<Marca, "identidad"> & Omit<Identidad, "graficos"> & { graficos?: Identidad["graficos"] };

/**
 * Lleva una marca guardada al formato actual. Las anteriores a E1 tienen lo visual en la raíz: se mueve a `identidad`
 * sin perder ningún dato. Las ya migradas pasan igual (misma referencia), así se puede llamar en cada lectura.
 */
export function migrarMarca(guardada: Marca | MarcaV1): Marca {
  if ("identidad" in guardada && guardada.identidad) {
    if (guardada.identidad.graficos) return guardada;
    return { ...guardada, identidad: { ...guardada.identidad, graficos: graficosPorDefecto(guardada) } };
  }
  const vieja = guardada as MarcaV1;
  const resto: Record<string, unknown> = { ...vieja };
  for (const campo of CAMPOS_VISUALES) delete resto[campo];
  const identidad: Identidad = {
    color: vieja.color,
    paleta: vieja.paleta,
    ...(vieja.paleta_calculada ? { paleta_calculada: vieja.paleta_calculada } : {}),
    ...(vieja.ajustes_manuales ? { ajustes_manuales: vieja.ajustes_manuales } : {}),
    tipografia: vieja.tipografia,
    logo: vieja.logo,
    // Antes los gráficos eran opcionales y, si faltaban, valía el estilo del rubro: se fija ese mismo valor.
    graficos: vieja.graficos ?? graficosPorDefecto(vieja),
    fotos_habilitadas: vieja.fotos_habilitadas ?? false,
  };
  return { ...(resto as Omit<Marca, "identidad">), identidad };
}

function graficosPorDefecto(m: { rubro: Marca["rubro"] }): Identidad["graficos"] {
  return { estilo_iconos: BIBLIOTECA_RUBRO[m.rubro].estiloIconos };
}

/** La marca está guardada con el formato anterior a E1. */
export function esMarcaV1(guardada: Marca | MarcaV1): guardada is MarcaV1 {
  return !("identidad" in guardada) || !guardada.identidad;
}
