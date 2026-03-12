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
  try {
    // 1. Verificamos si hay una sesión real del usuario en el navegador
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Variable para almacenar el ID del cliente (si está logueado)
    let finalClientId = null;

    // 2. Si el usuario ESTÁ logueado, garantizamos que exista en la tabla 'clients'
    // y vinculamos su ID a la cita. Si NO está logueado, finalClientId se queda como null.
    if (user) {
      finalClientId = user.id;
      
      await supabaseAdmin.from('clients').upsert({
        id: finalClientId,
        name: data.client_name || user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email,
        phone: data.client_phone || user.user_metadata?.phone || ''
      }, { onConflict: 'id' });
    }

    // ====================================================================
    // SANITIZACIÓN ESTRICTA (LA CLAVE PARA QUE EL BARBERO VEA LA CITA)
    // Aseguramos que la fecha sea YYYY-MM-DD y la hora sea HH:mm:ss
    // ====================================================================
    const cleanDate = typeof data.date === 'string' && data.date.includes('T') 
      ? data.date.split('T')[0] 
      : data.date;
      
    const cleanTime = typeof data.time === 'string' && data.time.length === 5 
      ? `${data.time}:00` 
      : data.time;

    console.log(`🚀 Procesando reserva -> Cliente: ${data.client_name}, Barbero ID: ${data.barber_id}, Fecha: ${cleanDate}, Hora: ${cleanTime}`);

    // 3. Inserción FORZADA a la tabla "Appointments" (Ignora bloqueos de RLS)
    // Al usar supabaseAdmin, no importa si es invitado o cliente, la cita se guardará.
    const appointmentPayload = {
      client_id: finalClientId, // Será NULL si es invitado, lo cual es correcto.
      barber_id: data.barber_id, 
      barber_name: data.barber_name,
      service_id: data.service_id,
      service_name: data.service_name,
      date: cleanDate, // Insertamos fecha limpia
      time: cleanTime, // Insertamos hora limpia
      client_name: data.client_name,
      client_phone: data.client_phone,
      status: "PENDING",
      notes: data.notes || ""
    };

    // El .select() final fuerza a la BD a devolver el registro, lo que empuja el evento Realtime instantáneamente.
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("Appointments")
      .insert([appointmentPayload])
      .select();

    if (insertError) {
      console.error("❌ Error BD [createAppointment]:", insertError.message);
      return { 
        success: false, 
        error: `Rechazo de Base de Datos: ${insertError.message}` 
      };
    }

    // 4. Recargamos TODAS las vistas para sincronización en caché de Next.js
    revalidatePath("/reservar"); // Ajustado a la ruta correcta de tu app
    revalidatePath("/dashboards/client/book");
    revalidatePath("/dashboards/barber");
    revalidatePath("/dashboards/admin/todaslascitas");

    return { success: true, data: insertedData };

  } catch (err: any) {
    console.error("🔥 Error Crítico de Servidor:", err.message);
    return { 
      success: false, 
      error: `Error interno de servidor: ${err.message}` 
    };
  }
}