// Diagnóstico con el cliente (manual cap. 2 / A.2, v1.1) y armado del objeto de marca (cap. 9).

import { distanciaColor, hexToHsl, normalizarH, type HSL } from "./color";
import { revalidarExtendida, type Alternativa } from "./laboratorio";
import type { ArchivoLogo, VersionLogo } from "./logo";
import { ajustarRol, derivarPaleta, type CtaModoB, enBandaProhibida, type Paleta, type ResultadoPaleta, type RolPaleta } from "./palette";
import { type Rubro, type Tono, type ValorMarca } from "./presets";
import { resolverTipografia } from "./typography";
import { BIBLIOTECA_RUBRO } from "./biblioteca";
import type { Identidad } from "./identidad";
import type { EstadoMarca, VersionIdentidad } from "./versiones";
import { ejesSemilla, familiaDeEjes, rangoMatiz, valorDeEjes, type Ejes } from "./ejes";

export interface Diagnostico {
  nombre: string;
  rubro: Rubro;
  /** Segundo rubro para mezclar (E12): los ejes semilla y el rango de matiz salen del promedio de los dos. */
  rubro_secundario: Rubro | null;
  /** Rubro escrito por el cliente cuando ninguno encaja ("otro"): la base es `rubro`, el nombre es este. */
  rubro_libre: string | null;
  /** Personalidad en ejes continuos (E12). Deciden la familia, el rango de matiz y el acento. */
  ejes: Ejes;
  /** Tono y valor derivados de los ejes (se guardan por compatibilidad con la fórmula de paleta y las marcas viejas). */
  personalidad: { tono: Tono | null; valor: ValorMarca | null };
  /** Contenido real del cliente (E12): las vistas previas lo usan en lugar de los textos de ejemplo. */
  contenido: ContenidoCliente;
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
    /** Proporción (ancho / alto) del logo color, medida al cargarlo (E4). */
    aspecto?: number;
    /** Versiones que entrega el diseñador (E4). Cada pieza elige la que mejor entra en su lugar. */
    versiones?: Partial<Record<VersionLogo, ArchivoLogo>>;
    /** Color dominante del logo color, para controlar su contraste con el fondo (E4). */
    color_dominante?: HSL | null;
    /** Cómo va el logo sobre una foto: monocromo (por defecto), sobre una placa o con sombra (E4). */
    sobre_foto?: "mono" | "placa" | "sombra";
  };
  tiene_fotos_propias: boolean;
  tipografia_previa: string | null;
  /** Moodboard del cliente (E5): solo los colores que salen de sus imágenes, nunca las imágenes (no inflan lo guardado). */
  moodboard?: { color: HSL; peso: number }[];
  /** Colores de marcas competidoras a evitar (E5): extienden la banda prohibida (±25°) del color de marca. */
  competencia?: HSL[];
  /**
   * Público del cliente (E15, paso 9): tres respuestas opcionales. No entra al checklist (no es medible); solo alimenta
   * las propuestas de copy. Si las tres están vacías, no se guarda.
   */
  publico?: PublicoCliente;
}

export interface PublicoCliente {
  /** A quién le vende. */
  aquien: string;
  /** Qué lo mueve a comprar. */
  motiva: string;
  /** Qué lo frena antes de contactar. */
  frena: string;
}

/** Largo máximo de cada respuesta del público: una frase, no un perfil completo. */
export const MAX_PUBLICO = 120;

/** Público recortado y sin espacios de más; undefined si las tres respuestas están vacías. */
export function publicoLimpio(p: Partial<PublicoCliente> | undefined): PublicoCliente | undefined {
  const limpio = (s?: string) => (s ?? "").trim().slice(0, MAX_PUBLICO);
  const r = { aquien: limpio(p?.aquien), motiva: limpio(p?.motiva), frena: limpio(p?.frena) };
  return r.aquien || r.motiva || r.frena ? r : undefined;
}

export interface ContenidoCliente {
  /** Productos o servicios, hasta 4 (sirven para el catálogo). */
  oferta: string[];
  /** Mensaje principal para las vistas previas. */
  mensaje: string;
  /** Texto de apoyo. */
  apoyo: string;
  cta: string;
}

export function contenidoVacio(): ContenidoCliente {
  return { oferta: [], mensaje: "", apoyo: "", cta: "" };
}

export interface Chip {
  id: string;
  etiqueta: string;
  H: number;
  modo: "optimizado" | "heredado";
  /** Modo heredado: false si el cliente eligió respetar solo su color, sin versión funcional. */
  funcional?: boolean;
  resultado: ResultadoPaleta;
}

export interface Marca {
  id: string;
  organizacion_id: string;
  nombre: string;
  rubro: Rubro;
  /** Respuestas del diagnóstico. El logo se guarda una sola vez, en `identidad.logo`. */
  diagnostico: Omit<Diagnostico, "logo">;
  /** Sistema visual de la marca (E1): color, tipografía, logo, recursos gráficos y fotografía. */
  identidad: Identidad;
  /** Decisiones registradas sobre la marca, de la más vieja a la más nueva (E9: avisos aceptados con justificación). */
  historial?: EntradaHistorial[];
  /** Versiones guardadas de la identidad (E13). */
  versiones?: VersionIdentidad[];
  /** Id de la versión aprobada: es la que usa Publicaciones (E13). */
  version_aprobada?: string;
  /** Estado de trabajo de la marca (E13). Si falta, se deduce (`estadoMarca`). */
  estado?: EstadoMarca;
  version_manual: "1.1";
  creada: string;
}

/** Una decisión que queda registrada: un aviso del checklist aceptado a propósito en una pieza. */
export interface EntradaHistorial {
  tipo: "aceptacion";
  control: string;
  motivo: string;
  autor: string;
  fecha: string;
  /** Qué pieza: canal, formato y variante, para ubicarla. */
  pieza: string;
}

/** Suma una entrada al historial de la marca. */
export function registrarEnHistorial(m: Marca, entrada: EntradaHistorial): Marca {
  return { ...m, historial: [...(m.historial ?? []), entrada] };
}

export function diagnosticoVacio(): Diagnostico {
  return {
    nombre: "",
    rubro: "servicios",
    rubro_secundario: null,
    rubro_libre: null,
    ejes: ejesSemilla("servicios"),
    personalidad: { tono: null, valor: null },
    contenido: contenidoVacio(),
    color_previo_hex: null,
    excluido_H: null,
    matiz_elegido: null,
    decision_color: "chip_optimizado",
    logo: { color: null, mono_claro: null, mono_oscuro: null, formato: null, deuda_vectorizar: false, png_lado_mayor: null },
    tiene_fotos_propias: false,
    tipografia_previa: null,
    moodboard: [],
    competencia: [],
  };
}

/**
 * Matices prohibidos como color de marca: el que el cliente no quiere y los de la competencia (E5). Cada uno prohíbe
 * ±25° a su alrededor.
 */
export function bandasProhibidas(d: Pick<Diagnostico, "excluido_H" | "competencia">): number[] {
  const todas = [d.excluido_H, ...(d.competencia ?? []).map((c) => c.H)];
  return todas.filter((h): h is number => h != null);
}

export function enAlgunaBanda(h: number, bandas: number[]): boolean {
  return bandas.some((b) => enBandaProhibida(h, b));
}

/** Matiz permitido más cercano a h, fuera de todas las bandas prohibidas. */
export function fueraDeBandas(h: number, bandas: number[]): number {
  if (!enAlgunaBanda(h, bandas)) return h;
  for (let d = 1; d <= 180; d++) {
    for (const c of [h + d, h - d]) if (!enAlgunaBanda(c, bandas)) return normalizarH(c);
  }
  return h;
}

/** Chip optimizado para un matiz cualquiera (lo usan los caminos, E5). */
export function chipDeMatiz(d: Diagnostico, H: number, id: string, etiqueta: string): Chip {
  const base = { rubro: d.rubro, valor: valorDiagnostico(d), excluido_H: d.excluido_H };
  return { id, etiqueta, H, modo: "optimizado", resultado: derivarPaleta({ ...base, modo: "optimizado", H }) };
}

/** Valor de marca para la fórmula: el elegido, o el que sale de los ejes (E12). */
export function valorDiagnostico(d: Pick<Diagnostico, "personalidad" | "ejes">): ValorMarca {
  return d.personalidad.valor ?? valorDeEjes(d.ejes);
}

/**
 * Paso 3: cuatro chips repartidos en el rango de matiz que sale de los ejes (E12; antes, el rango fijo del rubro), más
 * las opciones del color previo si existe.
 */
export function generarChips(d: Diagnostico): Chip[] {
  const [a, b] = rangoMatiz(d.ejes, d.rubro, d.rubro_secundario);
  const base = { rubro: d.rubro, valor: valorDiagnostico(d), excluido_H: d.excluido_H };
  const bandas = bandasProhibidas(d);
  const hues = [0, 1, 2, 3].map((i) => fueraDeBandas(normalizarH(Math.round(a + ((b - a) * i) / 3)), bandas));
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
    const heredado = derivarPaleta({ ...base, modo: "heredado", heredado: previo });
    // Si el color del cliente no alcanza como texto, la versión funcional es una opción, no un paso automático.
    chips.push({
      id: "previo-heredado",
      etiqueta: heredado.requiere_funcional ? "Tu color con versión funcional" : "Tu color tal cual",
      H: previo.H,
      modo: "heredado",
      resultado: heredado,
    });
    if (heredado.requiere_funcional) {
      chips.push({
        id: "previo-heredado-solo",
        etiqueta: "Tu color tal cual, sin versión funcional",
        H: previo.H,
        modo: "heredado",
        funcional: false,
        resultado: derivarPaleta({ ...base, modo: "heredado", heredado: previo, funcional: false }),
      });
    }
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
    identidad: {
      color: {
        modo: chip.modo,
        base: paleta.color_marca,
        version_funcional: paleta.version_funcional,
        banda_prohibida: paleta.banda_prohibida,
        ...(chip.funcional === false ? { solo_heredado: true } : {}),
      },
      paleta,
      tipografia: resolverTipografia(d.rubro, d.personalidad.tono, d.tipografia_previa, familiaDeEjes(d.ejes)),
      logo: d.logo,
      graficos: { estilo_iconos: BIBLIOTECA_RUBRO[d.rubro].estiloIconos },
      fotos_habilitadas: d.tiene_fotos_propias,
    },
    version_manual: "1.1",
    creada: new Date().toISOString(),
  };
}

/**
 * Diagnóstico editado después (E12): se vuelve a armar la marca con el chip elegido y se respeta lo fijado a mano. Se
 * conservan el id, la organización, la fecha, el historial y los gráficos, y los colores ajustados a mano se vuelven a
 * aplicar sobre la paleta nueva.
 */
export function reconstruirMarca(anterior: Marca, d: Diagnostico, chip: Chip): Marca {
  let m = construirMarca(d, chip, anterior.organizacion_id);
  m = {
    ...m,
    id: anterior.id,
    creada: anterior.creada,
    historial: anterior.historial,
    versiones: anterior.versiones,
    version_aprobada: anterior.version_aprobada,
    estado: anterior.estado,
    identidad: { ...m.identidad, graficos: anterior.identidad.graficos },
  };
  for (const rol of anterior.identidad.ajustes_manuales ?? []) {
    const color = anterior.identidad.paleta[rol];
    if (color) m = ajustarColorMarca(m, rol, color);
  }
  return m;
}

/** Diagnóstico completo de una marca guardada, para volver a editarlo (el logo vive en la identidad). */
export function diagnosticoDeMarca(m: Marca): Diagnostico {
  return { ...m.diagnostico, logo: m.identidad.logo };
}

function sinLogo(d: Diagnostico): Omit<Diagnostico, "logo"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logo, publico, ...resto } = d;
  // El público vacío no se guarda: la marca queda igual que una anterior al paso 9 de E15.
  const p = publicoLimpio(publico);
  return p ? { ...resto, publico: p } : resto;
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

/** Devuelve la marca con la identidad modificada. */
function conIdentidad(m: Marca, cambios: Partial<Identidad>): Marca {
  return { ...m, identidad: { ...m.identidad, ...cambios } };
}

function conPaleta(m: Marca, paleta: Paleta, ajustes: RolPaleta[]): Marca {
  const id = m.identidad;
  return conIdentidad(m, {
    paleta,
    paleta_calculada: id.paleta_calculada ?? id.paleta,
    ajustes_manuales: ajustes,
    color: { ...id.color, base: paleta.color_marca, version_funcional: paleta.version_funcional },
    paleta_extendida: id.paleta_extendida && revalidarExtendida(id.paleta_extendida, paleta),
  });
}

/** Ajuste manual de un color de la paleta desde la identidad. Se conserva la paleta calculada para poder volver. */
export function ajustarColorMarca(m: Marca, rol: RolPaleta, color: HSL): Marca {
  const ajustes = [...new Set([...(m.identidad.ajustes_manuales ?? []), rol])];
  return conPaleta(m, ajustarRol(m.identidad.paleta, rol, color), ajustes);
}

/** Vuelve un rol (o toda la paleta, si no se indica) al valor calculado por la fórmula. */
export function restaurarColorMarca(m: Marca, rol?: RolPaleta): Marca {
  const calc = m.identidad.paleta_calculada;
  if (!calc) return m;
  if (!rol) {
    const r = conPaleta(m, calc, []);
    return conIdentidad(r, { paleta_calculada: undefined });
  }
  const valor = calc[rol];
  if (valor == null) return m;
  const ajustes = (m.identidad.ajustes_manuales ?? []).filter((r) => r !== rol);
  return conPaleta(m, ajustarRol(m.identidad.paleta, rol, valor), ajustes);
}

/**
 * Aplica una alternativa del laboratorio de color (E3): la paleta nueva, la calculada por la fórmula y los roles
 * bloqueados que quedaron como ajuste manual. Si cambió el color de marca, la marca pasa a modo optimizado. La paleta
 * extendida se vuelve a validar contra el fondo nuevo.
 */
export function aplicarAlternativa(m: Marca, alt: Alternativa): Marca {
  const id = m.identidad;
  const cambioMarca = distanciaColor(alt.paleta.color_marca, id.paleta.color_marca) > 0.5;
  return conIdentidad(m, {
    paleta: alt.paleta,
    paleta_calculada: alt.calculada,
    ajustes_manuales: alt.ajustes,
    color: {
      ...id.color,
      modo: cambioMarca ? "optimizado" : id.color.modo,
      base: alt.paleta.color_marca,
      version_funcional: alt.paleta.version_funcional,
      solo_heredado: cambioMarca ? undefined : id.color.solo_heredado,
    },
    paleta_extendida: id.paleta_extendida && revalidarExtendida(id.paleta_extendida, alt.paleta),
  });
}

/** Fija a mano cómo va el CTA en Modo B, o lo vuelve a automático con null. */
export function elegirCtaModoB(m: Marca, modo: CtaModoB | null): Marca {
  const paleta = { ...m.identidad.paleta };
  if (modo) paleta.cta_modo_b = modo;
  else delete paleta.cta_modo_b;
  return conIdentidad(m, { paleta });
}

/** Color heredado del cliente tal como se eligió (antes de ajustes manuales). */
function colorHeredado(m: Marca): HSL {
  return (m.identidad.paleta_calculada ?? m.identidad.paleta).color_marca;
}

/** Recalcula la paleta de una marca heredada con o sin versión funcional. */
export function paletaHeredada(m: Marca, funcional: boolean): ResultadoPaleta {
  return derivarPaleta({
    rubro: m.rubro,
    modo: "heredado",
    heredado: colorHeredado(m),
    valor: valorDiagnostico(m.diagnostico),
    excluido_H: m.diagnostico.excluido_H,
    funcional,
  });
}

/** La marca es heredada y su color no alcanza como texto: se puede elegir con o sin versión funcional. */
export function puedeElegirFuncional(m: Marca): boolean {
  return m.identidad.color.modo === "heredado" && paletaHeredada(m, true).requiere_funcional === true;
}

/**
 * Cambia la elección de versión funcional (v1.1). La paleta se recalcula desde el color heredado y se descartan los
 * ajustes manuales. Si la opción pedida no tiene paleta posible, la marca queda como estaba.
 */
export function elegirVersionFuncional(m: Marca, funcional: boolean): Marca {
  const r = paletaHeredada(m, funcional);
  if (!r.paleta) return m;
  return conIdentidad(m, {
    paleta: r.paleta,
    paleta_calculada: undefined,
    ajustes_manuales: [],
    color: {
      ...m.identidad.color,
      base: r.paleta.color_marca,
      version_funcional: r.paleta.version_funcional,
      solo_heredado: funcional ? undefined : true,
    },
  });
}
