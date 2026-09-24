import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { serviceSchema } from "@/lib/validation";
import { z } from "zod";

async function ownProId(userId: string) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, userId))
    .limit(1);
  return pro?.id || null;
}

const proServiceBody = serviceSchema.extend({
  catalogServiceId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ services: [] });
  const db = getDb();
  const services = await db
    .select()
    .from(schema.professionalServices)
    .where(eq(schema.professionalServices.professionalId, proId));
  return NextResponse.json({ services });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  try {
    const body = proServiceBody.parse(await req.json());
    const db = getDb();

    if (body.id) {
      const [existing] = await db
        .select()
        .from(schema.professionalServices)
        .where(
          and(
            eq(schema.professionalServices.id, body.id),
            eq(schema.professionalServices.professionalId, proId)
          )
        )
        .limit(1);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
        .where(eq(schema.professionalServices.id, body.id))
        .returning();
      return NextResponse.json({ service: updated });
    }

    const [created] = await db
      .insert(schema.professionalServices)
      .values({
        professionalId: proId,
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
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const proId = await ownProId(session.userId);
  if (!proId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();

  const [svc] = await db
    .select()
    .from(schema.professionalServices)
    .where(
      and(
        eq(schema.professionalServices.id, id),
        eq(schema.professionalServices.professionalId, proId)
      )
    )
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
      .where(
        and(
          eq(schema.professionalServices.id, id),
          eq(schema.professionalServices.professionalId, proId)
        )
      )
      .returning();
    return NextResponse.json({
      service: updated,
      softDeleted: true,
      message: "Service has bookings; hidden instead of deleted",
    });
  }

  await db
    .delete(schema.professionalServices)
    .where(
      and(
        eq(schema.professionalServices.id, id),
        eq(schema.professionalServices.professionalId, proId)
      )
    );
  return NextResponse.json({ ok: true, softDeleted: false });
}
