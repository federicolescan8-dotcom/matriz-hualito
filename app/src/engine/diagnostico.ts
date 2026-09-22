// Diagnóstico con el cliente (manual cap. 2 / A.2, v1.1) y armado del objeto de marca (cap. 9).

import { hexToHsl, normalizarH, type HSL } from "./color";
import { derivarPaleta, enBandaProhibida, type Paleta, type ResultadoPaleta } from "./palette";
import { PRESETS, type Rubro, type Tono, type ValorMarca } from "./presets";
import { resolverTipografia, type Tipografia } from "./typography";

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
  diagnostico: Diagnostico;
  color: {
    modo: "optimizado" | "heredado";
    base: HSL;
    version_funcional: HSL | null;
    banda_prohibida: [number, number] | null;
  };
  paleta: Paleta;
  logo: Diagnostico["logo"];
  tipografia: Tipografia;
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
    logo: { color: null, mono_claro: null, mono_oscuro: null, formato: null, deuda_vectorizar: false },
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

  const previo = d.color_previo_hex ? hexToHsl(d.color_previo_hex) : null;
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
      ...d,
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
    fotos_habilitadas: d.tiene_fotos_propias,
    version_manual: "1.1",
    creada: new Date().toISOString(),
  };
}

/** Estado de habilitación: sin el par monocromo la marca no puede operar en Modo B (cap. 2 paso 4). */
export function pendientesMarca(d: Diagnostico): string[] {
  const p: string[] = [];
  if (!d.logo.color) p.push("Falta el logo en versión color.");
  if (!d.logo.mono_claro || !d.logo.mono_oscuro) p.push("Falta el par monocromo del logo (necesario para Modo B).");
  if (d.logo.deuda_vectorizar) p.push("Logo en PNG: queda como deuda técnica vectorizarlo.");
  return p;
}
