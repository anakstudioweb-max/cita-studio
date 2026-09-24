import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";

async function requireOwner() {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  return session;
}

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const db = getDb();
  const pros = await db.select().from(schema.professionals);
  const users = await db.select().from(schema.users);
  const byId = new Map(users.map((u) => [u.id, u]));
  return NextResponse.json({
    professionals: pros.map((p) => ({
      ...p,
      email: byId.get(p.userId)?.email || "",
    })),
  });
}

const adminPatch = profileSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["pending", "active", "paused", "expired"]).optional(),
  paidUntil: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const body = adminPatch.parse(await req.json());
  const db = getDb();
  const [updated] = await db
    .update(schema.professionals)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
      ...(body.instagram !== undefined ? { instagram: body.instagram } : {}),
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
      ...(body.hoursJson !== undefined ? { hoursJson: body.hoursJson } : {}),
      ...(body.closedDaysJson !== undefined
        ? { closedDaysJson: body.closedDaysJson }
        : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.paidUntil !== undefined ? { paidUntil: body.paidUntil } : {}),
    })
    .where(eq(schema.professionals.id, body.id))
    .returning();
  return NextResponse.json({ professional: updated });
}

export async function DELETE(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, id))
    .limit(1);
  if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // cascade bookings via FK; also remove user
  await db.delete(schema.professionals).where(eq(schema.professionals.id, id));
  await db.delete(schema.users).where(eq(schema.users.id, pro.userId));
  return NextResponse.json({ ok: true });
}
