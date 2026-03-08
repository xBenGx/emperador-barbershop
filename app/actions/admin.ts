"use server"

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createBarberAccount(data: any) {
  try {
    console.log("Iniciando creación/actualización de cuenta para:", data.email);

    const authPayload: any = {
      email: data.email,
      password: data.password, // Obligatorio para crear cuentas nuevas
      email_confirm: true, 
      user_metadata: { 
        full_name: data.name, 
        name: data.name,      
        phone: data.phone,
        specialty: data.role, 
        tag: data.tag,        
        app_role: 'BARBER' // Etiqueta clave para el Middleware y Triggers    
      }
    };

    if (data.id) authPayload.id = data.id; 

    // 1. Crear usuario en Auth (Esto dispara tu Trigger SQL)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(authPayload);

    if (authError) {
      console.error("Error en auth.admin.createUser:", authError);
      throw new Error(`Auth Error: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 2. Aseguramos su rol en la tabla User
    await supabaseAdmin.from('User').upsert({
      id: userId,
      email: data.email,
      role: 'BARBER'
    });

    // 3. Completamos su perfil de Barbero público
    const { error: barberError } = await supabaseAdmin.from('Barbers').upsert({
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone || '', // Respaldo por si viene vacío
      role: data.role,
      tag: data.tag,
      status: data.status || 'ACTIVE',
      img: data.img || ''
    });

    if (barberError) {
      throw new Error(`Error BD Barbers: ${barberError.message}`);
    }

    return { success: true };

  } catch (error: any) {
    console.error("Error Crítico en action createBarberAccount:", error.message);
    return { error: error.message };
  }
}