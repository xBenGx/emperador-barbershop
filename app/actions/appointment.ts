"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAppointment(data: any) {
  const supabase = await createClient();

  // 1. Verificamos quién es el cliente que está reservando
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Opcional: Si quieres que clientes NO registrados puedan reservar, 
  // quita este IF y deja client_id como null en la inserción de abajo.
  if (authError || !user) {
    return { 
      success: false, 
      error: "Debes iniciar sesión para poder reservar tu hora." 
    };
  }

  // 2. Inserción FORZADA a la tabla correcta "Appointments" (Plural y Mayúscula)
  const { error: insertError } = await supabase.from("Appointments").insert([{
    client_id: user.id, // ID del cliente logueado
    barber_id: data.barber_id, // ID exacto del barbero seleccionado
    barber_name: data.barber_name,
    service_id: data.service_id,
    service_name: data.service_name,
    date: data.date, // Ej: "2024-05-20"
    time: data.time, // Ej: "15:00"
    client_name: data.client_name,
    client_phone: data.client_phone,
    status: "PENDING",
    notes: data.notes
  }]);

  if (insertError) {
    console.error("Error BD [createAppointment]:", insertError.message);
    return { 
      success: false, 
      error: `Error interno al agendar: ${insertError.message}` 
    };
  }

  // 3. Recargamos TODAS las vistas para que aparezca instantáneamente
  revalidatePath("/dashboards/client/book");
  revalidatePath("/dashboards/barber");
  revalidatePath("/dashboards/admin/todaslascitas");

  return { success: true };
}