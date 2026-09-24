import { z } from "zod";
import { services } from "@/data/site";

const serviceIds = services.map((s) => s.id) as [string, ...string[]];

export const createBookingSchema = z.object({
  serviceId: z.enum(serviceIds, { message: "Servicio no válido" }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  customerName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre")
    .max(80, "Nombre demasiado largo"),
  customerPhone: z
    .string()
    .trim()
    .min(7, "Ingresa un teléfono válido")
    .max(20, "Teléfono demasiado largo"),
  customerEmail: z
    .string()
    .trim()
    .email("Correo electrónico inválido")
    .max(120),
  notes: z.string().trim().max(500, "Notas demasiado largas").optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Contraseña requerida"),
});
