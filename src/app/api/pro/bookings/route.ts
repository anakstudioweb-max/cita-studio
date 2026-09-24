import { NextResponse } from "next/server";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { bookingUpdateSchema } from "@/lib/validation";

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
      serviceName: r.serviceName,
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

  const [updated] = await db
    .update(schema.bookings)
    .set({
      ...(body.status ? { status: body.status } : {}),
      ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
    })
    .where(eq(schema.bookings.id, body.id))
    .returning();

  return NextResponse.json({ booking: updated });
}
