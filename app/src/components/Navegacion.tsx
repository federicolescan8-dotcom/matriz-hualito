"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", texto: "Diagnóstico" },
  { href: "/marcas", texto: "Marcas" },
  { href: "/publicar", texto: "Publicar" },
];

export function Navegacion() {
  const ruta = usePathname();
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
      </div>
    </nav>
  );
}
