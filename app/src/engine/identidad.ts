// Identidad de la marca (replanteo, etapa E1): todo lo visual agrupado en un solo lugar. La marca queda con sus datos
// (nombre, rubro, diagnóstico) y la identidad con el sistema visual. Publicar lee solo de acá.

import type { HSL } from "./color";
import { contenidoVacio, type Diagnostico, type Marca } from "./diagnostico";
import { ejesDesdePersonalidad } from "./ejes";
import type { EstiloIconos } from "./biblioteca";
import { BIBLIOTECA_RUBRO } from "./biblioteca";
import type { Paleta, RolPaleta } from "./palette";
import type { Tipografia } from "./typography";
import type { PaletaExtendida } from "./laboratorio";
import type { RecursosPropios } from "./recursos";
import type { Rescate } from "./rescate";

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
  /** Paleta extendida (E3): secundarios de una armonía y neutro oscuro. Opcional. */
  paleta_extendida?: PaletaExtendida;
  /** Tipografía (cap. 4). */
  tipografia: Tipografia;
  /** Logo y su par monocromo, como data URLs. */
  logo: Diagnostico["logo"];
  /** Recursos gráficos: un solo estilo de íconos por marca (cap. 5). */
  graficos: { estilo_iconos: EstiloIconos };
  /** Rasgos propios (E2): forma, patrón y detalle recurrente. Van primero en la capa decorativa. */
  recursos?: RecursosPropios;
  /** Rescate de marca existente (E11): grado de cambio, referencias auditadas y el antes. Opcional. */
  rescate?: Rescate;
  /** Fotografía: la marca tiene fotos propias (habilita la foto como capa decorativa y en el catálogo). */
  fotos_habilitadas: boolean;
}

/** Campos visuales que antes de E1 vivían en la raíz de la marca. */
const CAMPOS_VISUALES = ["color", "paleta", "paleta_calculada", "ajustes_manuales", "tipografia", "logo", "graficos", "fotos_habilitadas"] as const;

/** Marca guardada antes de E1: lo visual en la raíz, sin `identidad`. */
export type MarcaV1 = Omit<Marca, "identidad"> & Omit<Identidad, "graficos"> & { graficos?: Identidad["graficos"] };

/**
 * Lleva una marca guardada al formato actual sin perder datos. Las ya migradas pasan igual (misma referencia), así se
 * puede llamar en cada lectura:
 * - anteriores a E1: lo visual estaba en la raíz y se mueve a `identidad`;
 * - anteriores a E12: el diagnóstico gana ejes equivalentes a su tono y valor, sin cambiar la identidad guardada.
 */
export function migrarMarca(guardada: Marca | MarcaV1): Marca {
  const m = migrarIdentidad(guardada);
  return migrarDiagnostico(m);
}

/** Diagnóstico guardado antes de E12: sin ejes, sin mezcla de rubros y sin contenido del cliente. */
type DiagnosticoV1 = Omit<Marca["diagnostico"], "ejes" | "rubro_secundario" | "rubro_libre" | "contenido"> &
  Partial<Pick<Marca["diagnostico"], "ejes" | "rubro_secundario" | "rubro_libre" | "contenido">>;

function migrarDiagnostico(m: Marca): Marca {
  const d = m.diagnostico as DiagnosticoV1;
  if (d.ejes && d.contenido && d.rubro_secundario !== undefined && d.rubro_libre !== undefined) return m;
  return {
    ...m,
    diagnostico: {
      ...d,
      ejes: d.ejes ?? ejesDesdePersonalidad(m.rubro, d.personalidad.tono, d.personalidad.valor),
      rubro_secundario: d.rubro_secundario ?? null,
      rubro_libre: d.rubro_libre ?? null,
      contenido: d.contenido ?? contenidoVacio(),
    },
  };
}

function migrarIdentidad(guardada: Marca | MarcaV1): Marca {
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
