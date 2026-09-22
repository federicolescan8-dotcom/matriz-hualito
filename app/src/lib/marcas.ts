import { useSyncExternalStore } from "react";
import type { Marca } from "@/engine/diagnostico";

// Fase 1: las marcas se guardan en el navegador. En la fase 2 se reemplaza por Postgres manteniendo esta interfaz.
const CLAVE = "hualito.marcas.v1";
const EVENTO = "hualito:marcas";
const VACIO: Marca[] = [];

let cacheRaw: string | null = null;
let cache: Marca[] = VACIO;

function leerRaw(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function listarMarcas(): Marca[] {
  const raw = leerRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as Marca[]) : VACIO;
    } catch {
      cache = VACIO;
    }
  }
  return cache;
}

function escribir(marcas: Marca[]): boolean {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(marcas));
    window.dispatchEvent(new Event(EVENTO));
    return true;
  } catch {
    return false;
  }
}

export function guardarMarca(m: Marca): boolean {
  return escribir([m, ...listarMarcas().filter((x) => x.id !== m.id)]);
}

export function borrarMarca(id: string): void {
  escribir(listarMarcas().filter((x) => x.id !== id));
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useMarcas(): Marca[] {
  return useSyncExternalStore(suscribir, listarMarcas, () => VACIO);
}

export function descargarJson(m: Marca): void {
  const blob = new Blob([JSON.stringify(m, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `marca-${m.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
