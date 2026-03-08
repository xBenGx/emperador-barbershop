"use server"

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createBarberAccount(data: any) {
  try {
    const authPayload: any = {
      email: data.email,
      password: data.password,
      email_confirm: true, 
      user_metadata: { 
        full_name: data.name, 
        name: data.name,      
        phone: data.phone,
        specialty: data.role, 
        tag: data.tag,        
        app_role: 'BARBER'
      }
    };

    if (data.id) authPayload.id = data.id; 

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(authPayload);

    if (authError) {
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
      phone: data.phone || '',
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
    return { error: error.message };
  }
}

// NUEVA FUNCIÓN: Para actualizar datos existentes de forma segura
export async function updateBarberAccount(data: any) {
  try {
    // 1. Actualizar tabla pública Barbers
    const { error: barberError } = await supabaseAdmin.from('Barbers').update({
      name: data.name,
      phone: data.phone,
      role: data.role,
      tag: data.tag,
      status: data.status,
      img: data.img
    }).eq('id', data.id);

    if (barberError) throw new Error(`Error actualizando DB: ${barberError.message}`);

    // 2. Sincronizar metadata en Auth por precaución
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      user_metadata: { 
        full_name: data.name, 
        name: data.name,      
        phone: data.phone,
        specialty: data.role, 
        tag: data.tag 
      }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}