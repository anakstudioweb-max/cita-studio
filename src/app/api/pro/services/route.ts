import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { serviceSchema } from "@/lib/validation";

async function ownProId(userId: string) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, userId))
    .limit(1);
  return pro?.id || null;
}

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

  const body = serviceSchema.parse(await req.json());
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
      })
      .where(eq(schema.professionalServices.id, body.id))
      .returning();
    return NextResponse.json({ service: updated });
  }

  const [created] = await db
    .insert(schema.professionalServices)
    .values({
      professionalId: proId,
      name: body.name,
      description: body.description || "",
      durationMin: body.durationMin,
      priceCents: body.priceCents,
      visible: body.visible ?? true,
    })
    .returning();
  return NextResponse.json({ service: created });
}
