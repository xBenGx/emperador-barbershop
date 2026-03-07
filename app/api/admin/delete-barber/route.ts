// app/api/admin/delete-barber/route.ts
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

    // Elimina al usuario de Auth. Esto desencadenará un "cascade delete" si tienes las llaves foráneas bien configuradas,
    // o al menos le quitará el acceso.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}