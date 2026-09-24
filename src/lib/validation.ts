import { z } from "zod";
import { parseUsPhone } from "@/lib/phone";

/** Optional client email: empty → undefined; otherwise must look like an email. */
const optionalClientEmail = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? undefined : t;
  },
  z
    .string()
    .email("Enter a valid email address")
    .max(120)
    .optional()
);

export const bookSchema = z
  .object({
    professionalId: z.string().uuid(),
    /** Preferred: one or more professional_service ids. */
    professionalServiceIds: z.array(z.string().uuid()).min(1).max(20).optional(),
    /** Legacy single-service field (still accepted). */
    professionalServiceId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    clientName: z.string().min(2).max(80),
    clientPhone: z
      .string()
      .min(7)
      .max(30)
      .transform((raw, ctx) => {
        const parsed = parseUsPhone(raw);
        if (!parsed.ok) {
          ctx.addIssue({
            code: "custom",
            message: parsed.error,
          });
          return z.NEVER;
        }
        return parsed.e164;
      }),
    clientEmail: optionalClientEmail,
    notes: z.string().max(500).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const hasArray = (data.professionalServiceIds?.length ?? 0) > 0;
    const hasSingle = Boolean(data.professionalServiceId);
    if (!hasArray && !hasSingle) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one service",
        path: ["professionalServiceIds"],
      });
    }
  })
  .transform((data) => {
    const fromArray = data.professionalServiceIds ?? [];
    const ids = [
      ...new Set(
        fromArray.length
          ? fromArray
          : data.professionalServiceId
            ? [data.professionalServiceId]
            : []
      ),
    ];
    return {
      ...data,
      professionalServiceIds: ids,
      professionalServiceId: ids[0]!,
    };
  });

export const loginSchema = z.object({
  // Accept full email or short aliases: admin → admin@anak.studio; user → user@anak.studio if present
  email: z.string().min(1).max(120),
  password: z.string().min(1).max(120),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80),
  city: z.string().min(2).max(80).default("Houston"),
});

/** Owner creates a pro — allow short demo passwords. */
export const adminCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(120),
  name: z.string().min(2).max(80),
  city: z.string().min(2).max(80).default("Houston"),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(800).optional(),
  city: z.string().max(80).optional(),
  address: z.string().max(200).optional(),
  whatsapp: z.string().max(30).optional(),
  instagram: z.string().max(200).optional(),
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
  photoUrl: z.string().max(500).nullable().optional(),
});

export const bookingUpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["requested", "confirmed", "done", "cancelled"]).optional(),
    priceCents: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
    /** true = soft-delete (trash); false = restore from trash. */
    deleted: z.boolean().optional(),
    /** Houston local date YYYY-MM-DD — pair with time to reschedule. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /** Houston local time HH:mm — pair with date to reschedule. */
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
  .superRefine((data, ctx) => {
    const hasDate = Boolean(data.date);
    const hasTime = Boolean(data.time);
    if (hasDate !== hasTime) {
      ctx.addIssue({
        code: "custom",
        message: "date and time must be provided together",
        path: hasDate ? ["time"] : ["date"],
      });
    }
  });
