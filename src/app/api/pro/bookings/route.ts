import { NextResponse } from "next/server";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { bookingUpdateSchema } from "@/lib/validation";
import { localToUtc } from "@/lib/slots";
import { formatHouston } from "@/lib/utils";
import { sendBookingConfirmedEmail } from "@/lib/notify";

async function ownProId(userId: string) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, userId))
    .limit(1);
  return pro?.id || null;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ bookings: [], totals: {} });

  const month = new URL(req.url).searchParams.get("month"); // YYYY-MM
  const db = getDb();
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
    .where(eq(schema.bookings.professionalId, proId));

  if (month) {
    rows = rows.filter((r) => {
      const d = r.booking.startAt.toISOString().slice(0, 7);
      return d === month;
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
    bookings: rows.map((r) => ({
      ...r.booking,
      serviceName: r.booking.serviceNames || r.serviceName,
      endAt: r.booking.endAt,
      clientEmail: r.booking.clientEmail,
    })),
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

    let startAt = existing.startAt;
    let endAt = existing.endAt;

    if (body.date && body.time) {
      const durationMin = Math.max(
        15,
        Math.round((existing.endAt.getTime() - existing.startAt.getTime()) / 60_000)
      );
      startAt = localToUtc(body.date, body.time);
      endAt = addMinutes(startAt, durationMin);

      const overlaps = await db
        .select()
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.professionalId, proId),
            ne(schema.bookings.id, existing.id),
            ne(schema.bookings.status, "cancelled"),
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

    const [updated] = await db
      .update(schema.bookings)
      .set({
        ...(body.status ? { status: body.status } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.date && body.time ? { startAt, endAt } : {}),
      })
      .where(eq(schema.bookings.id, body.id))
      .returning();

    let clientEmailStatus: "sent" | "skipped" | "failed" = "skipped";
    if (becomingConfirmed && updated) {
      const when = formatHouston(updated.startAt, "EEEE, MMM d, yyyy · h:mm a");
      const durationMin = Math.max(
        15,
        Math.round((updated.endAt.getTime() - updated.startAt.getTime()) / 60_000)
      );
      try {
        clientEmailStatus = await sendBookingConfirmedEmail({
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
        });
      } catch (err) {
        console.error(
          "sendBookingConfirmedEmail threw",
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
