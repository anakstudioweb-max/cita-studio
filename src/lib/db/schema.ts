import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["owner", "professional"]);
export const proStatusEnum = pgEnum("pro_status", [
  "pending",
  "active",
  "paused",
  "expired",
]);
export const categoryEnum = pgEnum("service_category", [
  "lashes",
  "brows",
  "both",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "done",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("professional"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    bio: text("bio").notNull().default(""),
    photoUrl: text("photo_url").notNull().default(""),
    city: text("city").notNull().default("Houston"),
    address: text("address").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    instagram: text("instagram").notNull().default(""),
    hoursJson: jsonb("hours_json")
      .$type<{ start: string; end: string }>()
      .notNull()
      .default({ start: "10:00", end: "19:00" }),
    closedDaysJson: jsonb("closed_days_json")
      .$type<number[]>()
      .notNull()
      .default([0, 1]), // Sun=0, Mon=1
    status: proStatusEnum("status").notNull().default("pending"),
    paidUntil: date("paid_until"),
    categories: categoryEnum("categories").notNull().default("both"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("professionals_status_paid_idx").on(t.status, t.paidUntil)]
);

export const catalogServices = pgTable("catalog_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: categoryEnum("category").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  photoUrl: text("photo_url"),
});

export const professionalServices = pgTable(
  "professional_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    catalogServiceId: uuid("catalog_service_id").references(
      () => catalogServices.id,
      { onDelete: "set null" }
    ),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    durationMin: integer("duration_min").notNull(),
    priceCents: integer("price_cents").notNull(),
    visible: boolean("visible").notNull().default(true),
    photoUrl: text("photo_url"),
  },
  (t) => [index("pro_services_pro_idx").on(t.professionalId)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    refCode: text("ref_code").notNull().unique(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    professionalServiceId: uuid("professional_service_id")
      .notNull()
      .references(() => professionalServices.id, { onDelete: "restrict" }),
    /** All selected professional_service ids (primary is also in professionalServiceId). */
    serviceIds: uuid("service_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Denormalized joined service names for display/emails. */
    serviceNames: text("service_names").notNull().default(""),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email").notNull().default(""),
    notes: text("notes").notNull().default(""),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    priceCents: integer("price_cents").notNull(),
    status: bookingStatusEnum("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Soft-delete (trash). Null = active on calendar. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Partial unique is enforced in SQL migration (WHERE deleted_at IS NULL).
    // Drizzle uniqueIndex here is a fallback for typed queries.
    uniqueIndex("bookings_pro_start_unique").on(t.professionalId, t.startAt),
    index("bookings_pro_start_idx").on(t.professionalId, t.startAt),
    index("bookings_deleted_at_idx").on(t.deletedAt),
  ]
);

export type User = typeof users.$inferSelect;
export type Professional = typeof professionals.$inferSelect;
export type CatalogService = typeof catalogServices.$inferSelect;
export type ProfessionalService = typeof professionalServices.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

export const notificationTemplates = pgTable("notification_templates", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
