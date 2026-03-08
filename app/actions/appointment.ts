"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Action para crear una nueva reserva.
 * Conecta la cuenta del cliente autenticado e inserta los datos de forma segura.
 */
export async function createAppointment(data: any) {
  const supabase = await createClient();

  // 1. Verificación de Autenticación Segura (Conexión Cuenta Cliente)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { 
      success: false, 
      error: "Debes iniciar sesión como cliente para poder reservar tu hora." 
    };
  }

  // 2. Inserción en la base de datos (Supabase)
  // Usamos la tabla plural 'Appointments' y snake_case para coincidir con tu BD
  const { error: insertError } = await supabase.from("Appointments").insert([{
    client_id: user.id, // ¡CRÍTICO! Conecta la cita al ID del cliente
    barber_id: data.barber_id,
    barber_name: data.barber_name,
    service_id: data.service_id,
    service_name: data.service_name,
    date: data.date,
    time: data.time,
    client_name: data.client_name,
    client_phone: data.client_phone,
    status: "PENDING",
    notes: data.notes
  }]);

  if (insertError) {
    console.error("Supabase Error [createAppointment]:", insertError.message);
    return { 
      success: false, 
      error: `Error interno de base de datos: ${insertError.message}` 
    };
  }

  // 3. Revalidación de caché para actualizar paneles en tiempo real
  revalidatePath("/dashboards/client/book");
  revalidatePath("/dashboards/barber");
  revalidatePath("/dashboards/admin/todaslascitas");

  return { success: true };
}