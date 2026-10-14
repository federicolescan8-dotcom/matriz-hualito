// Colores medidos de las referencias. Es el mismo muestreo que hace la app en el navegador (`lib/imagen.ts`: lado
// mayor de 72 px y RGBA), pero con sharp porque acá no hay canvas. El agrupamiento es el del motor (E11a), así lo que
// mide el perfilador y lo que audita la app coinciden.

import sharp from "sharp";
import { hslToHex, type RGB } from "../../app/src/engine/color";
import { extraerColores } from "../../app/src/engine/laboratorio";
import { gruposDeReferencias, type ReferenciaRescate } from "../../app/src/engine/rescate";

/** Lado mayor del muestreo: el mismo que `pixelesDeImagen` en la app. */
const LADO_MUESTREO = 72;

export async function pixelesDeArchivo(ruta: string): Promise<{ rgb: RGB; alfa: number }[]> {
  const { data, info } = await sharp(ruta)
    .resize(LADO_MUESTREO, LADO_MUESTREO, { fit: "inside" })
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
