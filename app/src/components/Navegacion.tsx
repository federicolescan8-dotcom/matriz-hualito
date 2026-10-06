"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion, useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marcas";

// La navegación cuenta el proceso (replanteo, E1): Marca → Identidad → Publicaciones.
// Marca agrupa el diagnóstico (/) y los datos de las marcas guardadas (/marcas).
const PASOS = [
  { paso: 1, texto: "Marca", href: () => "/marcas", activo: (r: string) => r === "/" || r.startsWith("/marcas") },
  { paso: 2, texto: "Identidad", href: (id: string | null) => (id ? `/identidad/${id}` : "/identidad"), activo: (r: string) => r.startsWith("/identidad") },
  { paso: 3, texto: "Publicaciones", href: () => "/publicar", activo: (r: string) => r.startsWith("/publicar") },
];

export function Navegacion() {
  const ruta = usePathname();
  const sesion = useSesion();
  const activa = useMarcaActiva();
  // La página de render es la que captura el PNG: sin navegación.
  if (ruta.startsWith("/render")) return null;
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 text-sm">
        <span className="font-semibold">Matriz Hualito</span>
        <ol className="flex items-center gap-2">
          {PASOS.map((p, i) => (
            <li key={p.paso} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-neutral-300">→</span>}
              <Link
                href={p.href(activa)}
                aria-current={p.activo(ruta) ? "page" : undefined}
                className={`flex items-center gap-1.5 ${p.activo(ruta) ? "font-medium text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${p.activo(ruta) ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-600"}`}>
                  {p.paso}
                </span>
                {p.texto}
              </Link>
            </li>
          ))}
        </ol>
        <span className="ml-auto text-xs text-neutral-500">
          {sesion.estado === "local" && "Modo local · las marcas se guardan en este navegador"}
          {sesion.estado === "conectado" && (
            <>
              {sesion.email} ·{" "}
              <button type="button" onClick={() => void cerrarSesion()} className="underline">
                Salir
              </button>
            </>
          )}
        </span>
      </div>
    </nav>
  );
}
