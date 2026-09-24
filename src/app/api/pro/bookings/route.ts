import { NextResponse } from "next/server";
import { and, eq, gt, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { bookingUpdateSchema } from "@/lib/validation";
import { localToUtc } from "@/lib/slots";
import { formatHouston } from "@/lib/utils";
import {
  sendBookingConfirmedEmail,
  sendBookingUpdatedEmail,
} from "@/lib/notify";

async function ownProId(userId: string) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, userId))
    .limit(1);
  return pro?.id || null;
}

function mapBookingRow(r: {
  booking: typeof schema.bookings.$inferSelect;
  serviceName: string | null;
}) {
  return {
    ...r.booking,
    serviceName: r.booking.serviceNames || r.serviceName,
    endAt: r.booking.endAt,
    clientEmail: r.booking.clientEmail,
    notes: r.booking.notes,
    deletedAt: r.booking.deletedAt,
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ bookings: [], totals: {} });

  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  const id = url.searchParams.get("id");
  const trash = url.searchParams.get("trash") === "1";
  const db = getDb();

  if (id) {
    const rows = await db
      .select({
        booking: schema.bookings,
        serviceName: schema.professionalServices.name,
      })
      .from(schema.bookings)
      .leftJoin(
        schema.professionalServices,
        eq(schema.bookings.professionalServiceId, schema.professionalServices.id)
      )
      .where(
        and(eq(schema.bookings.id, id), eq(schema.bookings.professionalId, proId))
      )
      .limit(1);
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ booking: mapBookingRow(rows[0]) });
  }

  let rows = await db
    .select({
      booking: schema.bookings,
      serviceName: schema.professionalServices.name,
    })
    .from(schema.bookings)
    .leftJoin(
      schema.professionalServices,
      eq(schema.bookings.professionalServiceId, schema.professionalServices.id)
    )
    .where(
      and(
        eq(schema.bookings.professionalId, proId),
        trash
          ? isNotNull(schema.bookings.deletedAt)
          : isNull(schema.bookings.deletedAt)
      )
    );

  if (month) {
    rows = rows.filter((r) => {
      const houstonMonth = formatHouston(r.booking.startAt, "yyyy-MM");
      return houstonMonth === month;
    });
  }

  const totals = {
    requested: 0,
    confirmed: 0,
    done: 0,
    cancelled: 0,
  };
  for (const r of rows) {
    const s = r.booking.status as keyof typeof totals;
    if (s in totals) totals[s] += r.booking.priceCents;
  }

  return NextResponse.json({
    bookings: rows.map(mapBookingRow),
    totals,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  try {
    const body = bookingUpdateSchema.parse(await req.json());
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.bookings)
      .where(
        and(eq(schema.bookings.id, body.id), eq(schema.bookings.professionalId, proId))
      )
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [pro] = await db
      .select()
      .from(schema.professionals)
      .where(eq(schema.professionals.id, proId))
      .limit(1);
    if (!pro) return NextResponse.json({ error: "No profile" }, { status: 404 });

    // Soft-delete / restore — no schedule or email side effects.
    if (body.deleted === true) {
      const [updated] = await db
        .update(schema.bookings)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(schema.bookings.id, body.id), eq(schema.bookings.professionalId, proId))
        )
        .returning();
      return NextResponse.json({
        booking: updated,
        clientEmailStatus: "skipped" as const,
      });
    }
    if (body.deleted === false) {
      // Block restore if another active booking occupies the same start slot.
      const slotTaken = await db
        .select({ id: schema.bookings.id })
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.professionalId, proId),
            eq(schema.bookings.startAt, existing.startAt),
            ne(schema.bookings.id, existing.id),
            isNull(schema.bookings.deletedAt)
          )
        )
        .limit(1);
      if (slotTaken.length) {
        return NextResponse.json(
          { error: "That time is already booked — change the time before restoring" },
          { status: 409 }
        );
      }
      const [updated] = await db
        .update(schema.bookings)
        .set({ deletedAt: null })
        .where(
          and(eq(schema.bookings.id, body.id), eq(schema.bookings.professionalId, proId))
        )
        .returning();
      return NextResponse.json({
        booking: updated,
        clientEmailStatus: "skipped" as const,
      });
    }

    let startAt = existing.startAt;
    let endAt = existing.endAt;
    let scheduleChanged = false;

    if (body.date && body.time) {
      const durationMin = Math.max(
        15,
        Math.round((existing.endAt.getTime() - existing.startAt.getTime()) / 60_000)
      );
      startAt = localToUtc(body.date, body.time);
      endAt = addMinutes(startAt, durationMin);
      scheduleChanged =
        startAt.getTime() !== existing.startAt.getTime() ||
        endAt.getTime() !== existing.endAt.getTime();

      const overlaps = await db
        .select()
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.professionalId, proId),
            ne(schema.bookings.id, existing.id),
            ne(schema.bookings.status, "cancelled"),
            isNull(schema.bookings.deletedAt),
            lt(schema.bookings.startAt, endAt),
            gt(schema.bookings.endAt, startAt)
          )
        );
      if (overlaps.length) {
        return NextResponse.json(
          { error: "That time conflicts with another booking" },
          { status: 409 }
        );
      }
    }

    const nextStatus = body.status ?? existing.status;
    const becomingConfirmed =
      nextStatus === "confirmed" && existing.status !== "confirmed";
    const scheduleUpdateWhileConfirmed =
      scheduleChanged &&
      !becomingConfirmed &&
      nextStatus === "confirmed" &&
      existing.status === "confirmed";

    const [updated] = await db
      .update(schema.bookings)
      .set({
        ...(body.status ? { status: body.status } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.date && body.time ? { startAt, endAt } : {}),
      })
      .where(eq(schema.bookings.id, body.id))
      .returning();

    let clientEmailStatus: "sent" | "skipped" | "failed" = "skipped";
    if (updated && (becomingConfirmed || scheduleUpdateWhileConfirmed)) {
      const when = formatHouston(updated.startAt, "EEEE, MMM d, yyyy · h:mm a");
      const durationMin = Math.max(
        15,
        Math.round((updated.endAt.getTime() - updated.startAt.getTime()) / 60_000)
      );
      const payload = {
        refCode: updated.refCode,
        serviceName: updated.serviceNames || "Appointment",
        whenLabel: when,
        place: pro.address || pro.city || "Houston",
        priceCents: updated.priceCents,
        durationMin,
        clientName: updated.clientName,
        clientPhone: updated.clientPhone,
        clientEmail: updated.clientEmail || undefined,
        professionalName: pro.name,
        notes: updated.notes || undefined,
      };
      try {
        clientEmailStatus = becomingConfirmed
          ? await sendBookingConfirmedEmail(payload)
          : await sendBookingUpdatedEmail(payload);
      } catch (err) {
        console.error(
          becomingConfirmed
            ? "sendBookingConfirmedEmail threw"
            : "sendBookingUpdatedEmail threw",
          err instanceof Error ? err.message : "unknown"
        );
        clientEmailStatus = "failed";
      }
    }

    return NextResponse.json({
      booking: updated,
      clientEmailStatus,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    console.error("pro bookings PATCH", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
