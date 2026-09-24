import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { z } from "zod";

async function requireOwner() {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  return session;
}

const catalogSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["lashes", "brows"]),
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional().default(""),
  durationMin: z.number().int().min(15).max(480),
  basePriceCents: z.number().int().min(0),
});

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }
  const db = getDb();
  const services = await db.select().from(schema.catalogServices);
  return NextResponse.json({ services });
}

export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }
  try {
    const body = catalogSchema.parse(await req.json());
    const db = getDb();

    if (body.id) {
      const [existing] = await db
        .select()
        .from(schema.catalogServices)
        .where(eq(schema.catalogServices.id, body.id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const oldName = existing.name;
      const [updated] = await db
        .update(schema.catalogServices)
        .set({
          category: body.category,
          name: body.name,
          description: body.description || "",
          durationMin: body.durationMin,
          basePriceCents: body.basePriceCents,
        })
        .where(eq(schema.catalogServices.id, body.id))
        .returning();

      // Sync professional_services that match by previous name:
      // rename if name changed; always sync duration + price.
      await db
        .update(schema.professionalServices)
        .set({
          name: body.name,
          durationMin: body.durationMin,
          priceCents: body.basePriceCents,
          ...(body.id
            ? { catalogServiceId: body.id }
            : {}),
        })
        .where(eq(schema.professionalServices.name, oldName));

      return NextResponse.json({ service: updated });
    }

    const [created] = await db
      .insert(schema.catalogServices)
      .values({
        category: body.category,
        name: body.name,
        description: body.description || "",
        durationMin: body.durationMin,
        basePriceCents: body.basePriceCents,
      })
      .returning();

    // Do NOT auto-add to professionals — owner assigns per pro.
    return NextResponse.json({ service: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid catalog payload" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.catalogServices)
    .where(eq(schema.catalogServices.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // professional_services.catalog_service_id is ON DELETE SET NULL
  await db
    .delete(schema.catalogServices)
    .where(eq(schema.catalogServices.id, id));
  return NextResponse.json({ ok: true });
}
