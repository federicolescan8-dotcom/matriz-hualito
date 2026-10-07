import { zipSync } from "fflate";
import type { Marca } from "@/engine/diagnostico";
import { archivosKit } from "@/engine/entregables";
import { marcaParaPublicar } from "@/engine/versiones";
import { descargar, slug } from "./exportar";
import { svgAPng } from "./imagen";

// Kit de identidad en ZIP y manual de marca en PDF (E8). Los dos usan la identidad aprobada si hay una.

/** Arma el kit: los archivos del motor más un PNG de 1000 px por cada logo SVG (hay que dibujarlo en canvas). */
export async function descargarKit(marca: Marca): Promise<void> {
  const archivos = archivosKit(marcaParaPublicar(marca));
  const entradas: Record<string, Uint8Array> = {};
  const codificar = new TextEncoder();
  for (const a of archivos) {
    entradas[a.ruta] = typeof a.contenido === "string" ? codificar.encode(a.contenido) : a.contenido;
    if (a.ruta.startsWith("logos/") && a.ruta.endsWith(".svg")) {
      const png = await svgAPng(typeof a.contenido === "string" ? a.contenido : new TextDecoder().decode(a.contenido));
      if (png) entradas[a.ruta.replace(/\.svg$/, ".png")] = png;
    }
  }
  descargar(new Blob([zipSync(entradas) as BlobPart], { type: "application/zip" }), `kit-${slug(marca.nombre)}.zip`);
}

/** Pide al servidor el manual de marca en PDF, generado con el mismo motor de render que las piezas. */
export async function descargarManual(marca: Marca): Promise<string | null> {
  const res = await fetch("/api/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marca }),
  });
  if (!res.ok) return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "No se pudo generar el PDF.";
  descargar(await res.blob(), `manual-${slug(marca.nombre)}.pdf`);
  return null;
}
