"use server"

import { createClient } from "@/utils/supabase/server";
import { AppointmentSchema } from "@/schemas/appointment"; // Tu schema de la imagen
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAppointment(data: any) {
  const supabase = await createClient();

  // 1. Validamos los datos con tu esquema de Zod
  const validatedFields = AppointmentSchema.safeParse(data);

  if (!validatedFields.success) {
    return { error: "Datos de cita inválidos" };
  }

  // 2. Verificamos sesión con Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 3. Insertamos en Supabase (Sin usar Prisma)
  const { error } = await supabase
    .from("Appointment") // Asegúrate que la tabla se llame así en Supabase
    .insert([
      {
        clientId: user.id,
        barberId: validatedFields.data.barberId,
        serviceId: validatedFields.data.serviceId,
        startTime: `${validatedFields.data.date.toISOString().split('T')[0]}T${validatedFields.data.time}:00`,
        status: "PENDING",
      },
    ]);

  if (error) {
    console.error("Error en Supabase:", error);
    return { error: "No se pudo agendar la cita" };
  }

  revalidatePath("/dashboards/client/book");
  return { success: true };
}