import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

// Sesión del equipo (login por enlace mágico al email). Sin Supabase configurado, el estado es "local".

export type Sesion =
  | { estado: "local" }
  | { estado: "cargando" }
  | { estado: "anonimo" }
  | { estado: "conectado"; email: string };

let actual: Sesion = supabase ? { estado: "cargando" } : { estado: "local" };
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());

if (supabase && typeof window !== "undefined") {
  const aplicar = (email: string | undefined) => {
    actual = email ? { estado: "conectado", email } : { estado: "anonimo" };
    emitir();
  };
  supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user.email));
  supabase.auth.onAuthStateChange((_evento, sesion) => aplicar(sesion?.user.email));
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

const SERVIDOR: Sesion = supabase ? { estado: "cargando" } : { estado: "local" };

export function useSesion(): Sesion {
  return useSyncExternalStore(suscribir, () => actual, () => SERVIDOR);
}

export async function enviarEnlace(email: string): Promise<string | null> {
  if (!supabase) return "Supabase no está configurado.";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Solo entran los usuarios dados de alta en Supabase: nadie puede registrarse solo.
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
  });
  if (!error) return null;
  if (/signups not allowed|not found|user/i.test(error.message)) {
    return "Ese email no está habilitado. Pedile a quien administra Supabase que te dé de alta.";
  }
  return error.message;
}

export async function cerrarSesion(): Promise<void> {
  await supabase?.auth.signOut();
}
