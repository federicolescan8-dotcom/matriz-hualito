"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";

// Con Supabase configurado, todas las páginas piden sesión salvo /login y /render (la que usa el exportador de PNG,
// que recibe los datos ya cargados y no toca la base).
const PUBLICAS = ["/login", "/render"];

export function Guardia({ children }: { children: React.ReactNode }) {
  const sesion = useSesion();
  const ruta = usePathname();
  const router = useRouter();
  const publica = PUBLICAS.some((p) => ruta.startsWith(p));
  const bloqueada = !publica && sesion.estado === "anonimo";

  useEffect(() => {
    if (bloqueada) router.replace("/login");
  }, [bloqueada, router]);

  if (publica || sesion.estado === "local" || sesion.estado === "conectado") return <>{children}</>;
  return <div className="mt-24 text-center text-sm text-neutral-500">{sesion.estado === "cargando" ? "Cargando…" : "Redirigiendo al ingreso…"}</div>;
}
