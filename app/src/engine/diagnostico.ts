// Diagnóstico con el cliente (manual cap. 2 / A.2, v1.1) y armado del objeto de marca (cap. 9).

import { hexToHsl, normalizarH, type HSL } from "./color";
import { ajustarRol, derivarPaleta, type CtaModoB, enBandaProhibida, type Paleta, type ResultadoPaleta, type RolPaleta } from "./palette";
import { PRESETS, type Rubro, type Tono, type ValorMarca } from "./presets";
import { resolverTipografia, type Tipografia } from "./typography";
import { BIBLIOTECA_RUBRO, type EstiloIconos } from "./biblioteca";

export interface Diagnostico {
  nombre: string;
  rubro: Rubro;
  personalidad: { tono: Tono | null; valor: ValorMarca | null };
  /** Pregunta 3: color que el cliente asocia con su marca (HEX) y color que no quiere (matiz). */
  color_previo_hex: string | null;
  excluido_H: number | null;
  matiz_elegido: number | null;
  decision_color: "chip_optimizado" | "heredado";
  logo: {
    color: string | null;
    mono_claro: string | null;
    mono_oscuro: string | null;
    formato: "svg" | "pdf" | "png" | null;
    deuda_vectorizar: boolean;
    /** Solo PNG: lado mayor del archivo original (el manual pide 1000 px mínimo). */
    png_lado_mayor: number | null;
  };
  tiene_fotos_propias: boolean;
  tipografia_previa: string | null;
}

export interface Chip {
  id: string;
  etiqueta: string;
  H: number;
  modo: "optimizado" | "heredado";
  resultado: ResultadoPaleta;
}

export interface Marca {
  id: string;
  organizacion_id: string;
  nombre: string;
  rubro: Rubro;
  /** Respuestas del diagnóstico. El logo se guarda una sola vez, en `logo`. */
  diagnostico: Omit<Diagnostico, "logo">;
  color: {
    modo: "optimizado" | "heredado";
    base: HSL;
    version_funcional: HSL | null;
    banda_prohibida: [number, number] | null;
  };
  paleta: Paleta;
  /** Paleta tal como la calculó la fórmula, antes de ajustes manuales en la ficha. */
  paleta_calculada?: Paleta;
  /** Roles que se modificaron a mano después del cálculo. */
  ajustes_manuales?: RolPaleta[];
  logo: Diagnostico["logo"];
  tipografia: Tipografia;
  /** Biblioteca gráfica: un solo estilo de íconos por marca (cap. 5). Si falta, el del rubro. */
  graficos?: { estilo_iconos: EstiloIconos };
  fotos_habilitadas: boolean;
  version_manual: "1.1";
  creada: string;
}

export function diagnosticoVacio(): Diagnostico {
  return {
    nombre: "",
    rubro: "servicios",
    personalidad: { tono: null, valor: null },
    color_previo_hex: null,
    excluido_H: null,
    matiz_elegido: null,
    decision_color: "chip_optimizado",
    logo: { color: null, mono_claro: null, mono_oscuro: null, formato: null, deuda_vectorizar: false, png_lado_mayor: null },
    tiene_fotos_propias: false,
    tipografia_previa: null,
  };
}

/** Matiz permitido más cercano a h, fuera de la banda prohibida. */
function fueraDeBanda(h: number, excluido: number | null): number {
  if (!enBandaProhibida(h, excluido)) return h;
  for (let d = 1; d <= 180; d++) {
    for (const c of [h + d, h - d]) if (!enBandaProhibida(c, excluido)) return normalizarH(c);
  }
  return h;
}

/** Paso 3: cuatro chips repartidos en el rango de matiz del rubro, más las opciones del color previo si existe. */
export function generarChips(d: Diagnostico): Chip[] {
  const [a, b] = PRESETS[d.rubro].H_rango;
  const base = { rubro: d.rubro, valor: d.personalidad.valor, excluido_H: d.excluido_H };
  const hues = [0, 1, 2, 3].map((i) => fueraDeBanda(Math.round(a + ((b - a) * i) / 3), d.excluido_H));
  const chips: Chip[] = [...new Set(hues)].map((H, i) => ({
    id: `rango-${i}`,
    etiqueta: `Opción ${i + 1}`,
    H,
    modo: "optimizado",
    resultado: derivarPaleta({ ...base, modo: "optimizado", H }),
  }));

  const previo = d.color_previo_hex ? hexToHsl(d.color_previo_hex, true) : null;
  if (previo) {
    chips.unshift({
      id: "previo-optimizado",
      etiqueta: "Tu matiz, optimizado",
      H: previo.H,
      modo: "optimizado",
      resultado: derivarPaleta({ ...base, modo: "optimizado", H: previo.H }),
    });
    chips.push({
      id: "previo-heredado",
      etiqueta: "Tu color tal cual",
      H: previo.H,
      modo: "heredado",
      resultado: derivarPaleta({ ...base, modo: "heredado", heredado: previo }),
    });
  }
  return chips;
}

export function construirMarca(d: Diagnostico, chip: Chip, organizacion_id = "hualito"): Marca {
  const paleta = chip.resultado.paleta;
  if (!paleta) throw new Error("La paleta del chip elegido requiere revisión manual");
  return {
    id: crypto.randomUUID(),
    organizacion_id,
    nombre: d.nombre.trim() || "Sin nombre",
    rubro: d.rubro,
    diagnostico: {
      ...sinLogo(d),
      matiz_elegido: chip.H,
      decision_color: chip.modo === "heredado" ? "heredado" : "chip_optimizado",
    },
    color: {
      modo: chip.modo,
      base: paleta.color_marca,
      version_funcional: paleta.version_funcional,
      banda_prohibida: paleta.banda_prohibida,
    },
    paleta,
    logo: d.logo,
    tipografia: resolverTipografia(d.rubro, d.personalidad.tono, d.tipografia_previa),
    graficos: { estilo_iconos: BIBLIOTECA_RUBRO[d.rubro].estiloIconos },
    fotos_habilitadas: d.tiene_fotos_propias,
    version_manual: "1.1",
    creada: new Date().toISOString(),
  };
}

function sinLogo(d: Diagnostico): Omit<Diagnostico, "logo"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logo, ...resto } = d;
  return resto;
}

export const PNG_LADO_MINIMO = 1000;

/** Estado de habilitación: sin el par monocromo la marca no puede operar en Modo B (cap. 2 paso 4). */
export function pendientesMarca(logo: Diagnostico["logo"]): string[] {
  const p: string[] = [];
  if (!logo.color) p.push("Falta el logo en versión color.");
  if (!logo.mono_claro || !logo.mono_oscuro) p.push("Falta el par monocromo del logo (necesario para Modo B).");
  if (logo.png_lado_mayor != null && logo.png_lado_mayor < PNG_LADO_MINIMO)
    p.push(`Logo PNG de ${logo.png_lado_mayor} px: el mínimo es ${PNG_LADO_MINIMO} px de lado mayor. Pedir un archivo más grande.`);
  if (logo.deuda_vectorizar) p.push("Logo en PNG: queda como deuda técnica vectorizarlo.");
  return p;
}

function conPaleta(m: Marca, paleta: Paleta, ajustes: RolPaleta[]): Marca {
  return {
    ...m,
    paleta,
    paleta_calculada: m.paleta_calculada ?? m.paleta,
    ajustes_manuales: ajustes,
    color: { ...m.color, base: paleta.color_marca, version_funcional: paleta.version_funcional },
  };
}

/** Ajuste manual de un color de la paleta desde la ficha. Se conserva la paleta calculada para poder volver. */
export function ajustarColorMarca(m: Marca, rol: RolPaleta, color: HSL): Marca {
  const ajustes = [...new Set([...(m.ajustes_manuales ?? []), rol])];
  return conPaleta(m, ajustarRol(m.paleta, rol, color), ajustes);
}

/** Vuelve un rol (o toda la paleta, si no se indica) al valor calculado por la fórmula. */
export function restaurarColorMarca(m: Marca, rol?: RolPaleta): Marca {
  const calc = m.paleta_calculada;
  if (!calc) return m;
  if (!rol) return { ...conPaleta(m, calc, []), paleta_calculada: undefined, ajustes_manuales: [] };
  const valor = calc[rol];
  if (valor == null) return m;
  const ajustes = (m.ajustes_manuales ?? []).filter((r) => r !== rol);
  return conPaleta(m, ajustarRol(m.paleta, rol, valor), ajustes);
}

/** Fija a mano cómo va el CTA en Modo B, o lo vuelve a automático con null. */
export function elegirCtaModoB(m: Marca, modo: CtaModoB | null): Marca {
  const paleta = { ...m.paleta };
  if (modo) paleta.cta_modo_b = modo;
  else delete paleta.cta_modo_b;
  return { ...m, paleta };
}
