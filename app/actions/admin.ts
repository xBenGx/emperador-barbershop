"use server"

import { createClient } from '@supabase/supabase-js';

// Usamos la clave secreta para tener poderes de Administrador Supremo en Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createBarberAccount(data: any) {
  try {
    // 1. Crear el usuario en Autenticación (Email y Contraseña)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirmar el correo
      user_metadata: { full_name: data.name, phone: data.phone }
    });

    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;

    // 2. Asignar Rol de BARBER en la tabla de seguridad
    await supabaseAdmin.from('User').upsert({
      id: userId,
      email: data.email,
      role: 'BARBER'
    });

    // 3. Crear su Perfil Público de Barbero
    const { error: barberError } = await supabaseAdmin.from('Barbers').insert({
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      tag: data.tag,
      status: data.status,
      img: data.img
    });

    if (barberError) throw new Error(barberError.message);

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}