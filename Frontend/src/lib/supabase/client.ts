import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// El cliente se crea en la primera llamada, no al importar el módulo.
// Creándolo al importar, el build de Next lo instanciaba mientras recolecta los
// datos de las rutas —cuando todavía no hay variables de entorno— y el
// despliegue fallaba entero por eso.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  client = createClient(url, key);
  return client;
}
