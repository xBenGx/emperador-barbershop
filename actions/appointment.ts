// actions/appointment.ts
"use server"

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth"; // Asumiendo que configuras NextAuth aquí

export async function createAppointment(data: { barberId: string; serviceId: string; startTime: Date; endTime: Date }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) return { error: "No autorizado" };

  // Anti-Doble Reserva
  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId: data.barberId,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        { startTime: { lt: data.endTime, gte: data.startTime } },
        { endTime: { gt: data.startTime, lte: data.endTime } }
      ]
    }
  });

  if (conflict) return { error: "Horario ya no está disponible." };

  try {
    const apt = await prisma.appointment.create({
      data: {
        clientId: session.user.id,
        barberId: data.barberId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        endTime: data.endTime,
      }
    });
    
    revalidatePath('/client/historial');
    return { success: true, appointment: apt };
  } catch (error) {
    return { error: "Error al crear la reserva" };
  }
}