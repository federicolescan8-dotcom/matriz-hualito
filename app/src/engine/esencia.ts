// Esencia de identidad de un perfil (perfilador, rescate E11). Lo que la marca muestra siempre igual —la foto de
// perfil, los destacados, el logo— es lo único que el cliente ya tiene fijado, y tiene que sobrevivir al rescate en
// todos los perfiles: una heladería con foto de perfil negra y logo crema sigue siendo negra y crema. Acá vive lo
// puro: leer la superficie, la figura y el detalle de esos colores (medidos con los extremos incluidos) y llevarlos a
// la paleta sin saltear la fórmula del capítulo 3.

import { contraste, distanciaColor, type HSL } from "./color";
import { ajustarColorMarca, type Marca } from "./diagnostico";
import { ajustarRol, colorValidoCercano, fallasPaleta, MIN_GRAFICO, type RolPaleta } from "./palette";

export interface Esencia {
  /** El color de más peso en las piezas de identidad: el fondo de la foto de perfil y de los destacados. */
  superficie: HSL;
  /** Lo que se dibuja encima (el logo, los íconos de los destacados): el siguiente color que se lee sobre la superficie. */
  figura: HSL;
  /** Un tercer color propio (un dorado, un filete), si lo hay. */
  detalle: HSL | null;
  /** Archivos de los que se midió. */
  fuentes: string[];
}

/** Distancia mínima (ΔE) para que el detalle cuente como un color aparte y no como un tono de la figura. */
export const DELTA_DETALLE = 12;
/** Peso mínimo de un color para contar como tinta: por debajo son bordes suavizados entre la figura y la superficie. */
export const PESO_TINTA = 0.03;
/** Saturación mínima del detalle: un gris no es un dorado. */
export const S_DETALLE = 20;

/**
 * Esencia desde los colores de las piezas de identidad. La superficie es el de más peso; la figura, entre los que pesan
 * al menos `PESO_TINTA`, el que más contrasta con la superficie (los intermedios son el suavizado de los bordes del
 * logo) y tiene que leerse sobre ella (3:1, como un gráfico); el detalle, el más saturado de los que quedan, aparte de
 * los dos y legible sobre la superficie. Sin figura que se lea no hay esencia.
 */
export function esenciaDeColores(colores: { color: HSL; peso: number }[], fuentes: string[] = []): Esencia | null {
  const orden = [...colores].sort((a, b) => b.peso - a.peso);
  const superficie = orden[0]?.color;
  if (!superficie) return null;
  const tintas = orden.slice(1).filter((c) => c.peso >= PESO_TINTA).map((c) => c.color);
  const figura = [...tintas].sort((a, b) => contraste(b, superficie) - contraste(a, superficie))[0];
  if (!figura || contraste(figura, superficie) < MIN_GRAFICO) return null;
  const detalle =
    tintas
      .filter(
        (c) =>
          c !== figura &&
          c.S >= S_DETALLE &&
          contraste(c, superficie) >= MIN_GRAFICO &&
          distanciaColor(c, figura) >= DELTA_DETALLE &&
          distanciaColor(c, superficie) >= DELTA_DETALLE,
      )
      .sort((a, b) => b.S - a.S)[0] ?? null;
  return { superficie, figura, detalle, fuentes };
}

/** Por debajo de esta saturación el color de marca no tiene un matiz que heredar (negro, gris, blanco). */
export const S_ACROMATICO = 10;

/** Un color sirve de fondo neutro si es casi gris, muy claro o un claro apagado: un crema sí, un fucsia no. */
const esNeutro = (c: HSL) => c.S <= 20 || c.L >= 85 || (c.L >= 75 && c.S <= 55);

export interface RolesEsencia {
  color_marca: HSL;
  fondo_neutro: HSL | null;
  acento: HSL | null;
  /** La superficie de la identidad es el color de marca: la secuencia arranca por el Modo B (fondo de marca). */
  invertir_modo: boolean;
}

/**
 * Qué rol de la paleta toma cada color de la esencia. El color de marca es el más oscuro de la superficie y la figura
 * (el que hace de texto en Modo A); el otro es el fondo neutro si es neutro. El acento es el detalle o, si no hay, el
 * otro color.
 */
export function rolesDeEsencia(e: Esencia): RolesEsencia {
  const [marca, otro] = e.superficie.L <= e.figura.L ? [e.superficie, e.figura] : [e.figura, e.superficie];
  const otroNeutro = esNeutro(otro);
  return {
    color_marca: marca,
    fondo_neutro: otroNeutro ? otro : null,
    // Sin detalle, el acento sale del otro color de la identidad: `aplicarEsencia` lo lleva al válido más cercano
    // (un crema sobre crema se oscurece a un dorado), en lugar del complementario del rubro, que es ajeno a la marca.
    acento: e.detalle ?? otro,
    invertir_modo: marca === e.superficie,
  };
}

/**
 * Aplica a la marca los roles de la esencia que el motor no fija solo (fondo neutro y acento). Cada uno pasa por el
 * ajuste manual; si tal cual no cumple los controles de la paleta, se usa el válido más cercano (`colorValidoCercano`)
 * y, si tampoco hay, queda el del motor con un aviso. Así la esencia nunca rompe una regla del manual.
 */
export function aplicarEsencia(m: Marca, roles: RolesEsencia): { marca: Marca; avisos: string[] } {
  const avisos: string[] = [];
  let marca = m;
  for (const rol of ["fondo_neutro", "acento"] as const satisfies readonly RolPaleta[]) {
    const deseado = roles[rol];
    if (!deseado) continue;
    const p = marca.identidad.paleta;
    // Un acento que no se separa de la marca (3:1, como en la fórmula, cap. 3 paso 4b) no sirve de acento aunque el
    // CTA lo salve con contorno: se queda el del motor.
    if (rol === "acento" && contraste(deseado, p.color_marca) < MIN_GRAFICO) {
      avisos.push("El acento de la identidad no se separa del color de marca: queda el que calcula el motor.");
      continue;
    }
    const tal = fallasPaleta(ajustarRol(p, rol, deseado), rol).length === 0;
    const color = tal ? deseado : colorValidoCercano(p, rol, deseado);
    if (!color) {
      avisos.push(`El ${rol === "acento" ? "acento" : "fondo neutro"} de la identidad no cumple los contrastes: queda el que calcula el motor.`);
      continue;
    }
    if (!tal) avisos.push(`El ${rol === "acento" ? "acento" : "fondo neutro"} de la identidad se ajustó al válido más cercano.`);
    marca = ajustarColorMarca(marca, rol, color);
  }
  // Un color de marca sin matiz (negro, gris) le deja a la fórmula un H arbitrario (H0: un rosado) para el tono de
  // apoyo. Se toma el matiz de la identidad (el acento o el fondo) y se busca el válido más cercano.
  const p = marca.identidad.paleta;
  const matiz = roles.acento ?? roles.fondo_neutro;
  if (roles.color_marca.S < S_ACROMATICO && matiz) {
    const apoyo = colorValidoCercano(p, "tono_apoyo", { H: matiz.H, S: Math.min(Math.max(matiz.S, 25), 45), L: p.tono_apoyo.L });
    if (apoyo) marca = ajustarColorMarca(marca, "tono_apoyo", apoyo);
  }
  const paleta = { ...marca.identidad.paleta, invertir_modo: roles.invertir_modo };
  return { marca: { ...marca, identidad: { ...marca.identidad, paleta } }, avisos };
}
