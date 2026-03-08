import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del usuario.' }, { status: 400 });
    }

    // 1. Por seguridad, borramos manualmente de las tablas públicas primero
    await supabaseAdmin.from('Barbers').delete().eq('id', id);
    await supabaseAdmin.from('User').delete().eq('id', id);

    // 2. Eliminamos la cuenta real del sistema de Autenticación
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}