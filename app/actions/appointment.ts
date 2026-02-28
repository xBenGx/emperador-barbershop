"use server";

import { createClient } from "@/utils/supabase/server";
import { AppointmentSchema } from "@/schemas/appointment";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Server Action para crear una nueva cita médica/barbería.
 * Valida los datos con Zod y los inserta directamente en Supabase.
 */
export async function createAppointment(data: unknown) {
  const supabase = await createClient();

  // 1. Validación de datos con Zod
  const validatedFields = AppointmentSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Datos de cita inválidos. Por favor, revisa el formulario.",
    };
  }

  // 2. Verificación de Autenticación Segura
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirigimos al login si la sesión expiró o no existe
    redirect("/login");
  }

  // 3. Formateo de Timestamp para PostgreSQL
  // Convierte la fecha y hora a un formato ISO compatible
  const dateStr = validatedFields.data.date.toISOString().split("T")[0];
  const startTimestamp = `${dateStr}T${validatedFields.data.time}:00`;

  // 4. Inserción en la base de datos (Supabase)
  const { error: insertError } = await supabase.from("Appointment").insert([
    {
      clientId: user.id,
      barberId: validatedFields.data.barberId,
      serviceId: validatedFields.data.serviceId,
      startTime: startTimestamp,
      status: "PENDING",
    },
  ]);

  if (insertError) {
    console.error("Supabase Error [createAppointment]:", insertError.message);
    return {
      success: false,
      error: "Error interno al agendar la cita. Inténtalo más tarde.",
    };
  }

  // 5. Revalidación de caché para actualizar la UI inmediatamente
  revalidatePath("/dashboards/client/book");
  return { success: true };
}