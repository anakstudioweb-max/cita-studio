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
});

export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
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
      name: body.name,
      description: body.description || "",
      durationMin: body.durationMin,
      priceCents: body.priceCents,
      visible: body.visible ?? true,
    })
    .returning();
  return NextResponse.json({ service: created });
}
