import { createBrowserClient } from '@supabase/ssr'

/**
 * Crea un cliente de Supabase para ser usado exclusivamente en el Client Side (Navegador).
 * Utiliza las variables de entorno públicas definidas en tu .env.local
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validación de seguridad para el desarrollador
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: Faltan las variables de entorno de Supabase en el cliente.");
    // No lanzamos un throw aquí para evitar que la página principal explote si falta una variable,
    // pero devolvemos el cliente para que Supabase gestione el error internamente.
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  )
}