"use server"

import { createClient } from "@/utils/supabase/server";
import { AppointmentSchema } from "@/schemas/appointment"; 
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAppointment(data: any) {
  const supabase = await createClient();

  // Validamos con tu Zod Schema
  const validatedFields = AppointmentSchema.safeParse(data);
  if (!validatedFields.success) return { error: "Datos inválidos" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("Appointment")
    .insert([{
        clientId: user.id,
        barberId: validatedFields.data.barberId,
        serviceId: validatedFields.data.serviceId,
        startTime: `${validatedFields.data.date.toISOString().split('T')[0]}T${validatedFields.data.time}:00`,
        status: "PENDING",
    }]);

  if (error) return { error: error.message };

  revalidatePath("/dashboards/client/book");
  return { success: true };
}