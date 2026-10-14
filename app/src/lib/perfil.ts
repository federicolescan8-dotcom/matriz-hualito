import type { Diagnostico, Marca } from "@/engine/diagnostico";
import { migrarMarca, type MarcaV1 } from "@/engine/identidad";
import { extraerColores } from "@/engine/laboratorio";
import { svgADataUrl } from "@/engine/logo";
import { marcaDePerfil, validarPerfil } from "@/engine/perfil";
import { aspectoDeImagen, pixelesDeImagen, recortarTransparencia } from "./imagen";

// Importar desde un archivo: un perfil del perfilador (`herramientas/perfilador`) o una marca exportada con
// "Exportar JSON". El perfil se convierte en una marca en rescate con el motor; la marca exportada solo se migra.

export type ResultadoImportacion = { ok: true; marca: Marca; avisos: string[] } | { ok: false; errores: string[] };

export async function importarArchivo(json: File, logo?: File | null): Promise<ResultadoImportacion> {
  let datos: unknown;
  try {
    datos = JSON.parse(await json.text());
  } catch {
    return { ok: false, errores: [`${json.name} no es un JSON válido.`] };
  }
  if (esMarcaExportada(datos)) return { ok: true, marca: migrarMarca(datos), avisos: [] };

  const r = validarPerfil(datos);
  if (!r.ok) return r;
  const avisos = [...r.avisos];
  const esperado = r.perfil.logo?.archivo;
  if (esperado && !logo) avisos.push(`El perfil trae el logo «${esperado}»: cargalo después en el diagnóstico.`);
  try {
    const armada = marcaDePerfil(r.perfil, logo ? await logoDeArchivo(logo) : undefined);
    return { ok: true, marca: armada.marca, avisos: [...avisos, ...armada.avisos] };
  } catch (e) {
    return { ok: false, errores: [e instanceof Error ? e.message : "No se pudo armar la marca desde el perfil."] };
  }
}

function esMarcaExportada(v: unknown): v is Marca | MarcaV1 {
  if (typeof v !== "object" || v === null) return false;
  // Toda marca guardada (también las anteriores a E1) tiene id y versión del manual; un perfil no tiene ninguno.
  const m = v as Record<string, unknown>;
  return typeof m.id === "string" && m.version_manual === "1.1";
}

/** Logo color como lo carga el diagnóstico: PNG recortado a su contenido (o SVG tal cual), con aspecto y color dominante. */
async function logoDeArchivo(file: File): Promise<Partial<Diagnostico["logo"]>> {
  const esSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  let src: string;
  let ladoMayor: number | null = null;
  if (esSvg) src = svgADataUrl(await file.text());
  else {
    const original = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const recortada = await recortarTransparencia(original);
    src = recortada.dataUrl;
    ladoMayor = recortada.ladoMayorOriginal;
  }
  const dominante = extraerColores(await pixelesDeImagen(src))[0]?.color ?? null;
  return {
    color: src,
    formato: esSvg ? "svg" : "png",
    deuda_vectorizar: !esSvg,
    png_lado_mayor: ladoMayor,
    aspecto: await aspectoDeImagen(src),
    color_dominante: dominante,
  };
}
