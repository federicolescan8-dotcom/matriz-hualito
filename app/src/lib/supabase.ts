import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Conexión a Supabase. Si las variables no están cargadas (app/.env.local), la app funciona en modo local y guarda las
// marcas en el navegador, como en la fase 1.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && clave ? createClient(url, clave) : null;
export const usaSupabase = supabase != null;
