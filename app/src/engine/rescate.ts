// Rescate de marca existente (replanteo, E11): se audita, se normaliza y se evoluciona lo que el cliente ya tiene.
// Acá vive lo puro: agrupar los colores de todas las referencias, elegir el canónico de cada grupo según el grado de
// cambio, redactar el informe y armar el brief para el diseñador. El muestreo de imágenes está en `lib/imagen.ts`.

import { contraste, distanciaColor, hslToHex, hslToRgb, type HSL } from "./color";
import { ajustarColorMarca, type Marca } from "./diagnostico";
import { briefLogo } from "./entregables";
import { MIN_TEXTO, colorValidoCercano, type RolPaleta } from "./palette";
import { paletaExtendida } from "./laboratorio";
import type { Identidad } from "./identidad";
import { diferencias } from "./versiones";

/** Cuánto puede moverse la fórmula respecto de lo que el cliente ya usa (E11). */
export type GradoCambio = "rescate" | "refresco" | "evolucion";

export const GRADOS_CAMBIO: { id: GradoCambio; nombre: string; ayuda: string }[] = [
  { id: "rescate", nombre: "Rescate", ayuda: "Nada visible cambia: se limpia y se fija lo que existe. Lo que no cumple queda como aviso." },
  { id: "refresco", nombre: "Refresco", ayuda: "Ajustes finos: el color válido más próximo dentro del grupo de tonos del cliente." },
  { id: "evolucion", nombre: "Evolución", ayuda: "Cambios notorios pero reconocibles: sugerencias libres, siempre comparadas contra lo actual." },
];

/** Los colores de una referencia (un logo, una captura, una foto de cartel) tal como salen del muestreo. */
export interface ReferenciaRescate {
  nombre: string;
  colores: { color: HSL; peso: number }[];
}

/** Un color que circula en varios tonos: los que están a menos de `umbral` de ΔE se toman como el mismo. */
export interface GrupoColor {
  /** Tonos distintos del grupo, del más usado al menos usado. */
  tonos: { color: HSL; peso: number }[];
  /** Suma de los pesos de todas las muestras del grupo. */
  peso: number;
  /** Referencias en las que aparece, sin repetir. */
  fuentes: string[];
}

export type RolRescate = RolPaleta | "secundario_1" | "secundario_2";

export const ROLES_RESCATE: { id: RolRescate; nombre: string }[] = [
  { id: "color_marca", nombre: "Marca" },
  { id: "tono_apoyo", nombre: "Apoyo" },
  { id: "acento", nombre: "Acento" },
  { id: "secundario_1", nombre: "Secundario 1" },
  { id: "secundario_2", nombre: "Secundario 2" },
];

/** Estado del rescate guardado en la identidad. Todo opcional salvo el grado: no hace falta migrar. */
export interface Rescate {
  grado: GradoCambio;
  referencias: ReferenciaRescate[];
  /** Grupos de la última auditoría. */
  grupos?: GrupoColor[];
  /** La identidad al iniciar el rescate, para el antes y después (E11c). */
  antes?: Identidad;
}

export const UMBRAL_TONOS = 10;

export function rescateInicial(): Rescate {
  return { grado: "rescate", referencias: [] };
}

/** Agrupa muestras por ΔE: cada una entra al primer grupo cuyo tono más usado queda a menos de `umbral`. */
export function agruparColores(muestras: { color: HSL; peso: number; fuente: string }[], umbral = UMBRAL_TONOS): GrupoColor[] {
  const grupos: GrupoColor[] = [];
  for (const m of [...muestras].sort((a, b) => b.peso - a.peso)) {
    let g = grupos.find((x) => distanciaColor(x.tonos[0].color, m.color) < umbral);
    if (!g) grupos.push((g = { tonos: [], peso: 0, fuentes: [] }));
    // Mismo tono (ΔE < 1): se suma en lugar de listarlo dos veces.
    const igual = g.tonos.find((t) => distanciaColor(t.color, m.color) < 1);
    if (igual) igual.peso += m.peso;
    else g.tonos.push({ color: m.color, peso: m.peso });
    g.peso += m.peso;
    if (!g.fuentes.includes(m.fuente)) g.fuentes.push(m.fuente);
  }
  for (const g of grupos) g.tonos.sort((a, b) => b.peso - a.peso);
  return grupos.sort((a, b) => b.peso - a.peso);
}

/** Agrupa las referencias cargadas (cada color con la fuente de donde salió). */
export function gruposDeReferencias(refs: ReferenciaRescate[], umbral = UMBRAL_TONOS): GrupoColor[] {
  return agruparColores(
    refs.flatMap((r) => r.colores.map((c) => ({ color: c.color, peso: c.peso, fuente: r.nombre }))),
    umbral,
  );
}

/** El tono más usado del grupo: el canónico en rescate. */
export function masUsado(g: GrupoColor): HSL {
  return g.tonos[0].color;
}

/**
 * Color canónico de un grupo. Rescate: el más usado, tal cual. Refresco: el válido más cercano a ese (con la paleta
 * actual y el rol, si es un rol de paleta; si no hay ninguno válido, se queda el más usado). Evolución propone lo mismo
 * que el refresco: la libertad está en que el cliente puede elegir otro, comparándolo contra lo actual.
 */
export function colorCanonico(g: GrupoColor, grado: GradoCambio, paleta?: Marca["identidad"]["paleta"], rol?: RolRescate): HSL {
  const base = masUsado(g);
  if (grado === "rescate" || !paleta || !rol || rol.startsWith("secundario")) return base;
  return colorValidoCercano(paleta, rol as RolPaleta, base) ?? base;
}

/** Nombre aproximado de un color, por matiz y por saturación/luminosidad. */
export function nombreColor({ H, S, L }: HSL): string {
  if (L >= 92) return "blanco";
  if (L <= 12) return "negro";
  if (S < 12) return "gris";
  if (H < 15 || H >= 345) return "rojo";
  if (H < 40) return "naranja";
  if (H < 70) return "amarillo";
  if (H < 165) return "verde";
  if (H < 210) return "celeste";
  if (H < 255) return "azul";
  if (H < 295) return "violeta";
  return "rosa";
}

/** Frases del informe: una por grupo, con el nombre del color y en cuántos tonos aparece. */
export function informeAuditoria(grupos: GrupoColor[]): string[] {
  const vistos: Record<string, number> = {};
  return grupos.map((g) => {
    const nombre = nombreColor(masUsado(g));
    vistos[nombre] = (vistos[nombre] ?? 0) + 1;
    const sujeto = vistos[nombre] === 1 ? `Tu ${nombre}` : `Otro ${nombre} tuyo`;
    const n = g.tonos.length;
    const donde = g.fuentes.length > 1 ? ` en ${g.fuentes.length} referencias` : "";
    return n === 1
      ? `${sujeto} aparece en un solo tono${donde}: ${hslToHex(masUsado(g)).toUpperCase()}.`
      : `${sujeto} aparece en ${n} tonos${donde}: ${g.tonos.map((t) => hslToHex(t.color).toUpperCase()).join(", ")}.`;
  });
}

export interface AsignacionCanonico {
  grupo: GrupoColor;
  rol: RolRescate;
}

/**
 * Aplica el canónico de cada grupo al rol elegido, respetando el grado de la marca (rescate si no hay). Los roles de
 * paleta pasan por `ajustarColorMarca`: en rescate se aplica tal cual aunque no cumpla, y queda como ajuste manual con
 * su aviso. Los secundarios van a la paleta extendida (se crea si falta).
 */
export function aplicarCanonicos(marca: Marca, asignaciones: AsignacionCanonico[]): Marca {
  const grado = marca.identidad.rescate?.grado ?? "rescate";
  let m = marca;
  for (const { grupo, rol } of asignaciones) {
    const color = colorCanonico(grupo, grado, m.identidad.paleta, rol);
    if (rol === "secundario_1" || rol === "secundario_2") {
      const i = rol === "secundario_1" ? 0 : 1;
      const ext = m.identidad.paleta_extendida ?? paletaExtendida(m.identidad.paleta, "analoga");
      const secundarios = [...ext.secundarios];
      secundarios[i] = { color, texto: contraste(color, m.identidad.paleta.fondo_neutro) >= MIN_TEXTO };
      m = { ...m, identidad: { ...m.identidad, paleta_extendida: { ...ext, secundarios } } };
    } else m = ajustarColorMarca(m, rol, color);
  }
  return m;
}

/** Cambia el rescate de la marca (crea el estado si no existía). */
export function conRescate(m: Marca, cambios: Partial<Rescate>): Marca {
  const actual = m.identidad.rescate ?? rescateInicial();
  return { ...m, identidad: { ...m.identidad, rescate: { ...actual, ...cambios } } };
}

/** Brief del logo más la sección de rescate: grado, canónicos, tonos que circulan y la regla del refresco (E11b). */
export function briefRescate(marca: Marca): string {
  const r = marca.identidad.rescate;
  const grado = GRADOS_CAMBIO.find((g) => g.id === (r?.grado ?? "rescate"))!;
  const grupos = r?.grupos ?? [];
  const lineas = grupos.flatMap((g) => {
    const [R, G, B] = hslToRgb(masUsado(g));
    return [
      `- **${nombreColor(masUsado(g))}**: canónico ${hslToHex(masUsado(g)).toUpperCase()} (RGB ${R}, ${G}, ${B}).`,
      `  Tonos que circulan: ${g.tonos.map((t) => `${hslToHex(t.color).toUpperCase()} (${Math.round(t.peso * 100)}%)`).join(", ")}. Fuentes: ${g.fuentes.join(", ")}.`,
    ];
  });
  return [
    briefLogo(marca),
    "",
    "## Rescate de la marca existente",
    `- **Grado de cambio acordado:** ${grado.nombre}. ${grado.ayuda}`,
    `- **Referencias auditadas:** ${r?.referencias.map((x) => x.nombre).join(", ") || "ninguna cargada"}.`,
    "",
    "### Colores canónicos y tonos que circulan",
    ...(lineas.length ? lineas : ["- Sin auditoría de color todavía."]),
    "",
    "### Qué se pide",
    "- Vectorizar el logo de la referencia más nítida, limpiar curvas irregulares, letras deformadas y degradados que no escalan.",
    "- Rearmar el texto con la tipografía más parecida y entregar las versiones indicadas arriba.",
    "- **Regla del refresco:** puestos lado a lado, el logo nuevo y el viejo tienen que leerse como el mismo, pero más prolijo.",
  ].join("\n");
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Página HTML autocontenida con la paleta de antes y la de ahora y las diferencias (E11c): se abre o se imprime. */
export function htmlAntesDespues(marca: Marca): string {
  const antes = marca.identidad.rescate?.antes;
  const roles: [string, (i: Identidad) => HSL | undefined][] = [
    ["Marca", (i) => i.paleta.color_marca],
    ["Apoyo", (i) => i.paleta.tono_apoyo],
    ["Fondo", (i) => i.paleta.fondo_neutro],
    ["Acento", (i) => i.paleta.acento],
    ["Secundario 1", (i) => i.paleta_extendida?.secundarios[0]?.color],
    ["Secundario 2", (i) => i.paleta_extendida?.secundarios[1]?.color],
  ];
  const columna = (titulo: string, id: Identidad | undefined) => {
    const fichas = roles
      .map(([n, f]) => ({ n, c: id && f(id) }))
      .filter((x) => x.c)
      .map((x) => `<li><span class="chip" style="background:${hslToHex(x.c!)}"></span>${esc(x.n)} <code>${hslToHex(x.c!).toUpperCase()}</code></li>`)
      .join("");
    const tipo = id ? `<p>Títulos: ${esc(id.tipografia.familia_variable)}</p>` : "";
    return `<section><h2>${titulo}</h2>${id ? `<ul>${fichas}</ul>${tipo}` : "<p>Sin el antes guardado.</p>"}</section>`;
  };
  const dif = antes ? diferencias(antes, marca.identidad) : [];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Antes y después · ${esc(marca.nombre)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}.par{display:grid;grid-template-columns:1fr 1fr;gap:2rem}ul{list-style:none;padding:0}li{display:flex;align-items:center;gap:.6rem;margin:.4rem 0}.chip{width:2rem;height:2rem;border-radius:.4rem;border:1px solid #ccc}code{color:#555}</style></head>
<body><h1>${esc(marca.nombre)}: antes y después</h1><div class="par">${columna("Antes", antes)}${columna("Ahora", marca.identidad)}</div>
<h2>Qué cambió</h2>${dif.length ? `<ul>${dif.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p>Sin diferencias todavía.</p>"}</body></html>`;
}
