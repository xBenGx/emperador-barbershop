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
    const appointmentPayload = {
      client_id: finalClientId, 
      barber_id: data.barber_id, 
      barber_name: data.barber_name,
      service_id: data.service_id,
      service_name: data.service_name,
      date: cleanDate, 
      time: cleanTime, 
      client_name: data.client_name,
      client_phone: data.client_phone,
      status: "PENDING",
      notes: data.notes || ""
    };

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

    // ====================================================================
    // 4. INTEGRACIÓN CON EL BOT DE WHATSAPP (VPS)
    // ====================================================================
    try {
      // Intentamos obtener el teléfono del barbero de la BD para notificarle
      let barberPhone = null;
      if (data.barber_id) {
         // Ajusta "User" al nombre exacto de tu tabla donde guardas a los barberos si es distinto
         const { data: barberData } = await supabaseAdmin
           .from('User') 
           .select('phone')
           .eq('id', data.barber_id)
           .single();
         if (barberData?.phone) barberPhone = barberData.phone;
      }

      // Enviamos la orden directa al VPS
      await fetch('http://45.236.90.25:4000/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'Emperador_Secreto_2026', // Debe coincidir con el de tu VPS
          action: 'RESERVA_NUEVA',
          data: {
            clienteNombre: data.client_name,
            clientePhone: data.client_phone,
            barberoNombre: data.barber_name,
            barberoPhone: barberPhone, 
            fecha: cleanDate,
            hora: cleanTime,
            servicio: data.service_name
          }
        })
      });
      console.log("✅ Orden de WhatsApp despachada al VPS correctamente.");
    } catch (botError) {
      // Si el bot falla, no bloqueamos la reserva. Solo lo registramos.
      console.error("⚠️ La cita se guardó, pero hubo un error contactando al Bot:", botError);
    }

    // ====================================================================
    // 5. REVALIDACIÓN DE CACHÉ
    // ====================================================================
    revalidatePath("/reservar"); 
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