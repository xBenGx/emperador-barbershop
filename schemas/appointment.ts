// schemas/appointment.ts
import { z } from "zod";

export const AppointmentSchema = z.object({
  barberId: z.string().min(1, "Selecciona un barbero"),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  date: z.coerce.date({
    message: "Selecciona una fecha válida"
  }),
  time: z.string().min(1, "Selecciona una hora"),
});