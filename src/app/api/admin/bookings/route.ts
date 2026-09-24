import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { bookingUpdateSchema } from "@/lib/validation";

async function requireOwner() {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = new URL(req.url).searchParams.get("professionalId");
  const db = getDb();
  let rows = await db
    .select({
      booking: schema.bookings,
      serviceName: schema.professionalServices.name,
      professionalName: schema.professionals.name,
    })
    .from(schema.bookings)
    .leftJoin(
      schema.professionalServices,
      eq(schema.bookings.professionalServiceId, schema.professionalServices.id)
    )
    .leftJoin(
      schema.professionals,
      eq(schema.bookings.professionalId, schema.professionals.id)
    );

  if (proId) {
    rows = rows.filter((r) => r.booking.professionalId === proId);
  }

  return NextResponse.json({
    bookings: rows.map((r) => ({
      ...r.booking,
      serviceName: r.booking.serviceNames || r.serviceName,
      professionalName: r.professionalName,
    })),
  });
}

export async function PATCH(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const body = bookingUpdateSchema.parse(await req.json());
  const db = getDb();
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
