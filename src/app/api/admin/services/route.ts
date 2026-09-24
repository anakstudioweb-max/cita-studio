import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { serviceSchema } from "@/lib/validation";
import { z } from "zod";

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
  const professionalId = new URL(req.url).searchParams.get("professionalId");
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId required" }, { status: 400 });
  }
  const db = getDb();
  const services = await db
    .select()
    .from(schema.professionalServices)
    .where(eq(schema.professionalServices.professionalId, professionalId));
  return NextResponse.json({ services });
}

const adminService = serviceSchema.extend({
  professionalId: z.string().uuid(),
  catalogServiceId: z.string().uuid().nullable().optional(),
});

export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  try {
    const body = adminService.parse(await req.json());
    const db = getDb();
    if (body.id) {
      const [updated] = await db
        .update(schema.professionalServices)
        .set({
          name: body.name,
          description: body.description || "",
          durationMin: body.durationMin,
          priceCents: body.priceCents,
          visible: body.visible ?? true,
          ...(body.catalogServiceId !== undefined
            ? { catalogServiceId: body.catalogServiceId }
            : {}),
        })
        .where(
          and(
            eq(schema.professionalServices.id, body.id),
            eq(schema.professionalServices.professionalId, body.professionalId)
          )
        )
        .returning();
      return NextResponse.json({ service: updated });
    }
    const [created] = await db
      .insert(schema.professionalServices)
      .values({
        professionalId: body.professionalId,
        catalogServiceId: body.catalogServiceId ?? null,
        name: body.name,
        description: body.description || "",
        durationMin: body.durationMin,
        priceCents: body.priceCents,
        visible: body.visible ?? true,
      })
      .returning();
    return NextResponse.json({ service: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid service payload" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();

  const [svc] = await db
    .select()
    .from(schema.professionalServices)
    .where(eq(schema.professionalServices.id, id))
    .limit(1);
  if (!svc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const linked = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.professionalServiceId, id))
    .limit(1);

  if (linked.length) {
    // Soft-delete only when bookings reference this service
    const [updated] = await db
      .update(schema.professionalServices)
      .set({ visible: false })
      .where(eq(schema.professionalServices.id, id))
      .returning();
    return NextResponse.json({
      service: updated,
      softDeleted: true,
      message: "Service has bookings; hidden instead of deleted",
    });
  }

  await db
    .delete(schema.professionalServices)
    .where(eq(schema.professionalServices.id, id));
  return NextResponse.json({ ok: true, softDeleted: false });
}
