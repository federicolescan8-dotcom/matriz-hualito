import { useSyncExternalStore } from "react";
import type { Marca } from "@/engine/diagnostico";
import { supabase } from "./supabase";

// Almacenamiento de marcas. Con Supabase configurado, las marcas viven en la base (compartidas por el equipo y
// filtradas por organización con RLS). Sin Supabase, en el navegador (modo local).

const CLAVE = "hualito.marcas.v1";
const EVENTO = "hualito:marcas";
const VACIO: Marca[] = [];

// ── Modo local (navegador) ──

let cacheRaw: string | null = null;
let cacheLocal: Marca[] = VACIO;

function leerRaw(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

/** Marcas guardadas en este navegador (también se usa para importarlas a Supabase). */
export function marcasDelNavegador(): Marca[] {
  const raw = leerRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cacheLocal = raw ? (JSON.parse(raw) as Marca[]) : VACIO;
    } catch {
      cacheLocal = VACIO;
    }
  }
  return cacheLocal;
}

function escribirLocal(marcas: Marca[]): boolean {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(marcas));
    window.dispatchEvent(new Event(EVENTO));
    return true;
  } catch {
    return false;
  }
}

// ── Modo Supabase ──

let cacheRemota: Marca[] = VACIO;
let organizacion: string | null = null;
export let errorRemoto: string | null = null;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());

async function cargarRemotas(): Promise<void> {
  if (!supabase) return;
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) {
    cacheRemota = VACIO;
    organizacion = null;
    emitir();
    return;
  }
  const [miembro, marcas] = await Promise.all([
    supabase.from("miembros").select("organizacion_id").maybeSingle(),
    supabase.from("marcas").select("datos").order("actualizada", { ascending: false }),
  ]);
  organizacion = (miembro.data?.organizacion_id as string | undefined) ?? null;
  errorRemoto =
    marcas.error?.message ??
    (organizacion ? null : "Tu email no está asociado a ninguna organización (tabla miembros).");
  cacheRemota = (marcas.data ?? []).map((f) => f.datos as Marca);
  emitir();
}

if (supabase && typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    void cargarRemotas();
  });
}

// ── Interfaz común ──

export function listarMarcas(): Marca[] {
  return supabase ? cacheRemota : marcasDelNavegador();
}

export async function guardarMarca(m: Marca): Promise<boolean> {
  if (!supabase) return escribirLocal([m, ...marcasDelNavegador().filter((x) => x.id !== m.id)]);
  if (!organizacion) {
    errorRemoto = "No se puede guardar: tu email no está asociado a una organización.";
    emitir();
    return false;
  }
  const marca = { ...m, organizacion_id: organizacion };
  const { error } = await supabase
    .from("marcas")
    .upsert({ id: marca.id, organizacion_id: organizacion, nombre: marca.nombre, rubro: marca.rubro, datos: marca });
  if (error) {
    errorRemoto = error.message;
    emitir();
    return false;
  }
  errorRemoto = null;
  cacheRemota = [marca, ...cacheRemota.filter((x) => x.id !== marca.id)];
  emitir();
  return true;
}

export async function borrarMarca(id: string): Promise<void> {
  if (!supabase) {
    escribirLocal(marcasDelNavegador().filter((x) => x.id !== id));
    return;
  }
  const { error } = await supabase.from("marcas").delete().eq("id", id);
  errorRemoto = error?.message ?? null;
  if (!error) cacheRemota = cacheRemota.filter((x) => x.id !== id);
  emitir();
}

/** Sube a Supabase las marcas guardadas en este navegador que todavía no están en la base. */
export async function importarDelNavegador(): Promise<{ subidas: number; fallidas: number }> {
  const existentes = new Set(cacheRemota.map((m) => m.id));
  let subidas = 0;
  let fallidas = 0;
  for (const m of marcasDelNavegador().filter((x) => !existentes.has(x.id))) {
    if (await guardarMarca(m)) subidas++;
    else fallidas++;
  }
  return { subidas, fallidas };
}

function suscribir(cb: () => void) {
  oyentes.add(cb);
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    oyentes.delete(cb);
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useMarcas(): Marca[] {
  return useSyncExternalStore(suscribir, listarMarcas, () => VACIO);
}

export function useErrorMarcas(): string | null {
  return useSyncExternalStore(suscribir, () => errorRemoto, () => null);
}

export function descargarJson(m: Marca): void {
  const blob = new Blob([JSON.stringify(m, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `marca-${m.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Marca activa: la última abierta en Marcas o elegida en Publicar, compartida entre secciones ──

const CLAVE_ACTIVA = "hualito.marcaActiva";
const EVENTO_ACTIVA = "hualito:marcaActiva";

function leerActiva(): string | null {
  try {
    return localStorage.getItem(CLAVE_ACTIVA);
  } catch {
    return null;
  }
}

export function elegirMarcaActiva(id: string): void {
  try {
    localStorage.setItem(CLAVE_ACTIVA, id);
  } catch {
    // Sin almacenamiento, la marca activa vale solo para esta vista.
  }
  window.dispatchEvent(new Event(EVENTO_ACTIVA));
}

export function useMarcaActiva(): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO_ACTIVA, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENTO_ACTIVA, cb);
        window.removeEventListener("storage", cb);
      };
    },
    leerActiva,
    () => null,
  );
}
