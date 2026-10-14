// Colores medidos de las referencias. Es el mismo muestreo que hace la app en el navegador (`lib/imagen.ts`: lado
// mayor de 72 px y RGBA), pero con sharp porque acá no hay canvas. El agrupamiento es el del motor (E11a), así lo que
// mide el perfilador y lo que audita la app coinciden.

import sharp from "sharp";
import { hslToHex, type RGB } from "../../app/src/engine/color";
import { extraerColores } from "../../app/src/engine/laboratorio";
import { esenciaDeColores, type Esencia } from "../../app/src/engine/esencia";
import { gruposDeReferencias, type ReferenciaRescate } from "../../app/src/engine/rescate";

/** Lado mayor del muestreo: el mismo que `pixelesDeImagen` en la app. */
const LADO_MUESTREO = 72;

/** Lado mayor para las piezas de identidad: el logo de una foto de perfil es chico y a 72 px se borronea. */
const LADO_IDENTIDAD = 160;

export async function pixelesDeArchivo(ruta: string, lado = LADO_MUESTREO): Promise<{ rgb: RGB; alfa: number }[]> {
  const { data, info } = await sharp(ruta)
    .resize(lado, lado, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px: { rgb: RGB; alfa: number }[] = [];
  for (let i = 0; i < data.length; i += info.channels) px.push({ rgb: [data[i], data[i + 1], data[i + 2]], alfa: data[i + 3] });
  return px;
}

export async function referenciaDeArchivo(ruta: string, nombre: string): Promise<ReferenciaRescate> {
  // k = 5, como la auditoría de rescate de la app.
  return { nombre, colores: extraerColores(await pixelesDeArchivo(ruta), 5) };
}

/**
 * Esencia de las piezas de identidad (foto de perfil, destacados, logo), con los extremos incluidos: el negro o el
 * blanco de una foto de perfil son la marca, no fondo. Los pesos se suman entre archivos: un color que es tinta en una
 * sola pieza (el crema del logo en la foto de perfil) no se diluye entre los destacados.
 */
export async function esenciaDeArchivos(rutas: { ruta: string; nombre: string }[]): Promise<Esencia | null> {
  if (!rutas.length) return null;
  const colores: { color: Esencia["superficie"]; peso: number }[] = [];
  for (const { ruta } of rutas) colores.push(...extraerColores(await pixelesDeArchivo(ruta, LADO_IDENTIDAD), 6, { extremos: true }));
  // Se juntan los tonos casi iguales de distintos archivos (el negro de cada destacado es el mismo negro).
  const grupos = gruposDeReferencias([{ nombre: "identidad", colores }]);
  return esenciaDeColores(
    grupos.map((g) => ({ color: g.tonos[0].color, peso: g.peso })),
    rutas.map((r) => r.nombre),
  );
}

/** Candidatos a color previo: el tono más usado de cada grupo, con su peso y dónde aparece. */
export function candidatosDeColor(referencias: ReferenciaRescate[]): { hex: string; peso: number; fuentes: string[] }[] {
  const total = referencias.length || 1;
  return gruposDeReferencias(referencias).map((g) => ({
    hex: hslToHex(g.tonos[0].color).toUpperCase(),
    // Peso promedio por referencia, para que no dependa de cuántas capturas se suban.
    peso: Math.round((g.peso / total) * 100) / 100,
    fuentes: g.fuentes,
  }));
}
