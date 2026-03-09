"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";

// Cliente Admin (Bypass RLS y Modo Dios para operaciones críticas)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createAppointment(data: any) {
  // 1. Verificamos la sesión real del usuario en el navegador
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { 
      success: false, 
      error: "Debes iniciar sesión para poder reservar tu hora." 
    };
  }

  try {
    // 2. 🛡️ FIX SQL (Llave Foránea): Garantizar que el cliente existe
    // Si el usuario no está en la tabla 'clients', el INSERT de abajo fallará.
    // Con esto lo insertamos o actualizamos automáticamente.
    await supabaseAdmin.from('clients').upsert({
      id: user.id,
      name: data.client_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      email: user.email,
      phone: data.client_phone || user.user_metadata?.phone || ''
    }, { onConflict: 'id' });

    // 3. Inserción FORZADA a la tabla "Appointments" (Ignora bloqueos de RLS)
    const { error: insertError } = await supabaseAdmin.from("Appointments").insert([{
      client_id: user.id, 
      barber_id: data.barber_id, 
      barber_name: data.barber_name,
      service_id: data.service_id,
      service_name: data.service_name,
      date: data.date, 
      time: data.time, 
      client_name: data.client_name,
      client_phone: data.client_phone,
      status: "PENDING",
      notes: data.notes || ""
    }]);

    if (insertError) {
      console.error("Error BD [createAppointment]:", insertError.message);
      return { 
        success: false, 
        error: `Rechazo de Base de Datos: ${insertError.message}` 
      };
    }

    // 4. Recargamos TODAS las vistas para sincronización en tiempo real
    revalidatePath("/dashboards/client/book");
    revalidatePath("/dashboards/barber");
    revalidatePath("/dashboards/admin/todaslascitas");

    return { success: true };

  } catch (err: any) {
    console.error("Error Crítico de Servidor:", err.message);
    return { 
      success: false, 
      error: `Error interno de servidor: ${err.message}` 
    };
  }
}