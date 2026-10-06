import type { ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import type { Pieza } from "@/engine/pieza";

// Exportación de piezas a PNG: el servidor renderiza con el navegador sin ventana y vuelve a correr el checklist.

export type Render = { png: Blob } | { resultado: ResultadoChecklist } | { error: string };

export async function renderizar(marca: Marca, pieza: Pieza): Promise<Render> {
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marca, pieza }),
  });
  if (res.status === 422) return { resultado: ((await res.json()) as { resultado: ResultadoChecklist }).resultado };
  if (!res.ok) return { error: ((await res.json()) as { error: string }).error };
  return { png: await res.blob() };
}

export function slug(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

export function descargar(blob: Blob, nombre: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

