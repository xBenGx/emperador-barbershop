"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ==========================================
// 1. CREAR CITA (RESERVA NUEVA)
// ==========================================
export async function createAppointment(data: any) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    let finalClientId = null;

    if (user) {
      finalClientId = user.id;
      
      await supabaseAdmin.from('clients').upsert({
        id: finalClientId,
        name: data.client_name || user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email,
        phone: data.client_phone || user.user_metadata?.phone || ''
      }, { onConflict: 'id' });
    }

    const cleanDate = typeof data.date === 'string' && data.date.includes('T') 
      ? data.date.split('T')[0] 
      : data.date;
      
    const cleanTime = typeof data.time === 'string' && data.time.length === 5 
      ? `${data.time}:00` 
      : data.time;

    const displayTime = cleanTime.substring(0, 5); // Formato 19:00

    console.log(`🚀 Procesando reserva -> Cliente: ${data.client_name}, Barbero ID: ${data.barber_id}`);

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
      return { success: false, error: `Rechazo de BD: ${insertError.message}` };
    }

    // --- INTEGRACIÓN BOT WHATSAPP ---
    try {
      let barberPhone = null;
      if (data.barber_id) {
         // Buscamos en la tabla Barbers
         const { data: barberData, error: barberError } = await supabaseAdmin
           .from('Barbers') 
           .select('phone')
           .eq('id', data.barber_id)
           .single();
           
         if (barberData?.phone) barberPhone = barberData.phone;
      }

      // Buscar el precio (si no viene en el data, lo buscamos en la BD)
      let precioBruto = data.service_price || data.price;
      if (!precioBruto && data.service_id) {
         const { data: serviceData } = await supabaseAdmin
           .from('Services') 
           .select('price') 
           .eq('id', data.service_id)
           .single();
         if (serviceData?.price) precioBruto = serviceData.price;
      }
      const precioFinal = precioBruto ? `$${Number(precioBruto).toLocaleString('es-CL')}` : 'Valor a confirmar';

      await fetch('http://45.236.90.25:4000/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'Emperador_Secreto_2026', 
          action: 'RESERVA_NUEVA',
          data: {
            clienteNombre: data.client_name,
            clientePhone: data.client_phone,
            barberoNombre: data.barber_name,
            barberoPhone: barberPhone, 
            fecha: cleanDate,
            hora: displayTime,
            servicio: data.service_name,
            precio: precioFinal 
          }
        })
      });
    } catch (botError) {
      console.error("⚠️ Error contactando al Bot:", botError);
    }

    revalidatePath("/reservar"); 
    revalidatePath("/dashboards/client/book");
    revalidatePath("/dashboards/barber");
    revalidatePath("/dashboards/admin/todaslascitas");

    return { success: true, data: insertedData };

  } catch (err: any) {
    return { success: false, error: `Error interno: ${err.message}` };
  }
}

// ==========================================
// 2. ACTUALIZAR CITA (RESERVA MODIFICADA)
// ==========================================
export async function updateAppointment(appointmentId: string, updateData: any) {
  try {
    const { data: originalAppt, error: fetchError } = await supabaseAdmin
      .from('Appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !originalAppt) throw new Error('Cita original no encontrada');

    const cleanDate = typeof updateData.date === 'string' && updateData.date.includes('T') 
      ? updateData.date.split('T')[0] 
      : updateData.date;
      
    const cleanTime = typeof updateData.time === 'string' && updateData.time.length === 5 
      ? `${updateData.time}:00` 
      : updateData.time;

    // Actualizar en Supabase
    const { data: updatedAppt, error: updateError } = await supabaseAdmin
      .from('Appointments')
      .update({
        date: cleanDate || originalAppt.date,
        time: cleanTime || originalAppt.time,
        status: updateData.status || originalAppt.status,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) throw new Error(`Error al actualizar en BD: ${updateError.message}`);

    // --- INTEGRACIÓN BOT WHATSAPP ---
    try {
      let barberPhone = null;
      if (updatedAppt.barber_id) {
         // Buscamos en la tabla Barbers
         const { data: barberData } = await supabaseAdmin
           .from('Barbers') 
           .select('phone')
           .eq('id', updatedAppt.barber_id)
           .single();
         if (barberData?.phone) barberPhone = barberData.phone;
      }

      const displayTime = updatedAppt.time.substring(0, 5); // Formato 19:00

      await fetch('http://45.236.90.25:4000/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'Emperador_Secreto_2026',
          action: 'RESERVA_MODIFICADA',
          data: {
            clienteNombre: updatedAppt.client_name,
            clientePhone: updatedAppt.client_phone,
            barberoNombre: updatedAppt.barber_name,
            barberoPhone: barberPhone,
            fecha: updatedAppt.date,
            hora: displayTime,
            servicio: updatedAppt.service_name
          }
        })
      });
    } catch (botError) {
      console.error("⚠️ Error contactando al Bot (Update):", botError);
    }

    revalidatePath("/dashboards/barber");
    revalidatePath("/dashboards/admin/todaslascitas");
    revalidatePath("/reservar");

    return { success: true, data: updatedAppt };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. ELIMINAR CITA (RESERVA CANCELADA)
// ==========================================
export async function deleteAppointment(appointmentId: string) {
  try {
    const { data: apptToDelete, error: fetchError } = await supabaseAdmin
      .from('Appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !apptToDelete) throw new Error('Cita no encontrada para eliminar');

    const { error: deleteError } = await supabaseAdmin
      .from('Appointments')
      .delete()
      .eq('id', appointmentId);

    if (deleteError) throw new Error(`Error eliminando de BD: ${deleteError.message}`);

    // --- INTEGRACIÓN BOT WHATSAPP ---
    try {
      let barberPhone = null;
      if (apptToDelete.barber_id) {
         // Buscamos en la tabla Barbers
         const { data: barberData } = await supabaseAdmin
           .from('Barbers') 
           .select('phone')
           .eq('id', apptToDelete.barber_id)
           .single();
         if (barberData?.phone) barberPhone = barberData.phone;
      }

      const displayTime = apptToDelete.time.substring(0, 5); // Formato 19:00

      await fetch('http://45.236.90.25:4000/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'Emperador_Secreto_2026',
          action: 'RESERVA_CANCELADA',
          data: {
            clienteNombre: apptToDelete.client_name,
            clientePhone: apptToDelete.client_phone,
            barberoNombre: apptToDelete.barber_name,
            barberoPhone: barberPhone,
            fecha: apptToDelete.date,
            hora: displayTime,
            servicio: apptToDelete.service_name
          }
        })
      });
    } catch (botError) {
      console.error("⚠️ Error contactando al Bot (Delete):", botError);
    }

    revalidatePath("/dashboards/barber");
    revalidatePath("/dashboards/admin/todaslascitas");
    revalidatePath("/reservar");

    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}