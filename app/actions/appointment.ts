"use server"

// 🛠️ Importamos el cliente de servidor de Supabase y tu esquema de Zod
import { createClient } from "@/utils/supabase/server";
import { AppointmentSchema } from "@/schemas/appointment"; 
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAppointment(data: any) {
  const supabase = await createClient();

  // 1. Validamos los datos con tu esquema de Zod (barberId, serviceId, date, time)
  const validatedFields = AppointmentSchema.safeParse(data);

  if (!validatedFields.success) {
    return { error: "Los datos de la cita no son válidos. Revisa el formulario." };
  }

  // 2. Verificamos la sesión actual directamente en Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/login");
  }

  // 3. Formateamos la fecha y hora para PostgreSQL
  // Combinamos la fecha y la cadena de hora (ej: "15:30") en un solo timestamp
  const dateStr = validatedFields.data.date.toISOString().split('T')[0];
  const startTimestamp = `${dateStr}T${validatedFields.data.time}:00`;

  // 4. Insertamos en la tabla "Appointment" de Supabase (sin Prisma)
  const { error: insertError } = await supabase
    .from("Appointment")
    .insert([
      {
        clientId: user.id,
        barberId: validatedFields.data.barberId,
        serviceId: validatedFields.data.serviceId,
        startTime: startTimestamp,
        status: "PENDING",
      },
    ]);

  if (insertError) {
    console.error("Error de Supabase:", insertError.message);
    return { error: "Hubo un error al guardar la cita en la base de datos." };
  }

  // 5. Refrescamos la ruta para que el cliente vea su nueva cita
  revalidatePath("/dashboards/client/book");
  return { success: true };
}