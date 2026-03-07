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
    console.log("Iniciando creación/actualización de cuenta para:", data.email);

    // 1. Preparar la creación del usuario en Autenticación
    const authPayload: any = {
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirmar el correo para que puedan loguearse de inmediato
      user_metadata: { 
        full_name: data.name, // Para compatibilidad con triggers o integraciones de terceros
        name: data.name,      
        phone: data.phone,
        specialty: data.role, // Su especialidad (Ej: "Master Barber")
        tag: data.tag,        // Su etiqueta visual (Ej: "Alto Nivel")
        
        // LA CLAVE MAGICA: Le avisa a tu nuevo Trigger SQL que este usuario NO es un cliente
        app_role: 'BARBER'    
      }
    };

    // ¡EL TRUCO DE LA SINCRONIZACIÓN Y ASCENSO!
    // Si estamos editando un barbero que ya existía (para darle acceso al panel), 
    // forzamos a Supabase Auth a inyectar las credenciales en su MISMO ID existente.
    if (data.id) {
      authPayload.id = data.id; 
    }

    // 2. Crear el usuario en Auth
    // Al ejecutarse esto, tu nuevo Trigger capturará el "app_role" y pre-creará las filas
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(authPayload);

    if (authError) {
      console.error("Error en auth.admin.createUser:", authError);
      throw new Error(`Error de Autenticación: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log("Usuario verificado en Auth con ID:", userId);

    // 3. Confirmar Rol de BARBER en la tabla global de seguridad ("User")
    // Usamos UPSERT por si el Trigger ya lo hizo, así evitamos errores de duplicado
    const { error: roleError } = await supabaseAdmin.from('User').upsert({
      id: userId,
      email: data.email,
      role: 'BARBER'
    });

    if (roleError) {
      console.error("Aviso no fatal al upsertar en tabla User (el trigger ya actuó):", roleError.message);
    }

    // 4. Actualizar/Rellenar su Perfil Público de Barbero ("Barbers")
    // El Trigger crea la base, pero aquí inyectamos la imagen, el estado y datos finales
    const { error: barberError } = await supabaseAdmin.from('Barbers').upsert({
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      tag: data.tag,
      status: data.status || 'ACTIVE',
      img: data.img || ''
    });

    if (barberError) {
      console.error("Error al insertar/actualizar en Barbers:", barberError);
      throw new Error(`Error guardando perfil del barbero: ${barberError.message}`);
    }

    console.log("Proceso completado con éxito para:", data.email);
    return { success: true };

  } catch (error: any) {
    console.error("Error Crítico en action createBarberAccount:", error.message);
    return { error: error.message };
  }
}