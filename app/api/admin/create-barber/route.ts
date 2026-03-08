import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Usamos el Service Role para tener permisos de administrador y saltar RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, password, phone, role, tag, status, img } = body;

    if (!email) {
      return NextResponse.json({ error: 'El email es obligatorio.' }, { status: 400 });
    }

    let userId = id;

    // 1. SI NO HAY ID, ES UN BARBERO NUEVO (CREAR EN AUTH)
    if (!userId) {
      if (!password) {
        return NextResponse.json({ error: 'La contraseña es obligatoria para nuevos barberos.' }, { status: 400 });
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { 
          full_name: name, 
          name: name,
          app_role: 'BARBER' 
        }
      });

      if (authError) throw new Error(`Error en Auth: ${authError.message}`);
      userId = authData.user.id;
    } 
    // 2. SI HAY ID, ESTAMOS ACTUALIZANDO SUS DATOS (METADATA)
    else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: name, name: name, app_role: 'BARBER' }
      });
    }

    // 3. ASEGURAR ROL EN LA TABLA MAESTRA DE USUARIOS
    await supabaseAdmin.from('User').upsert({ 
      id: userId, 
      email: email, 
      role: 'BARBER' 
    });

    // 4. GUARDAR / ACTUALIZAR EL PERFIL PÚBLICO DEL BARBERO
    const { error: barberError } = await supabaseAdmin.from('Barbers').upsert({
      id: userId,
      name: name,
      email: email,
      phone: phone || '',
      role: role,
      tag: tag,
      status: status || 'ACTIVE',
      img: img || ''
    });

    if (barberError) throw new Error(`Error Base de Datos: ${barberError.message}`);

    return NextResponse.json({ success: true, userId });

  } catch (error: any) {
    console.error("Error crítico en /api/admin/create-barber:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}