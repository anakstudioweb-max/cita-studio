import { z } from "zod";

export const bookSchema = z.object({
  professionalId: z.string().uuid(),
  professionalServiceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(80),
  clientPhone: z.string().min(7).max(20),
  notes: z.string().max(500).optional().default(""),
});

export const loginSchema = z.object({
  // Accept full email or short aliases: admin / user
  email: z.string().min(1).max(120),
  password: z.string().min(1).max(120),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80),
  city: z.string().min(2).max(80).default("Houston"),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(800).optional(),
  city: z.string().max(80).optional(),
  address: z.string().max(200).optional(),
  whatsapp: z.string().max(30).optional(),
  instagram: z.string().max(80).optional(),
  photoUrl: z.string().max(500).optional(),
  hoursJson: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
  closedDaysJson: z.array(z.number().int().min(0).max(6)).optional(),
  categories: z.enum(["lashes", "brows", "both"]).optional(),
});

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional().default(""),
  durationMin: z.number().int().min(15).max(480),
  priceCents: z.number().int().min(0),
  visible: z.boolean().optional().default(true),
});

export const bookingUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["requested", "confirmed", "done", "cancelled"]).optional(),
  priceCents: z.number().int().min(0).optional(),
});
