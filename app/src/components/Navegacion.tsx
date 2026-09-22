"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion, useSesion } from "@/lib/sesion";

const LINKS = [
  { href: "/", texto: "Diagnóstico" },
  { href: "/marcas", texto: "Marcas" },
  { href: "/publicar", texto: "Publicar" },
];

export function Navegacion() {
  const ruta = usePathname();
  const sesion = useSesion();
  // La página de render es la que captura el PNG: sin navegación.
  if (ruta.startsWith("/render")) return null;
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 text-sm">
        <span className="font-semibold">Matriz Hualito</span>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={ruta === l.href ? "font-medium text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}>
            {l.texto}
          </Link>
        ))}
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
