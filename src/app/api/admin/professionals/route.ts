import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, hashPassword } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { profileSchema, signupSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
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

/** Create professional + user account (owner-controlled). */
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  try {
    const body = signupSchema.parse(await req.json());
    const db = getDb();
    const email = body.email.toLowerCase();
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(schema.users)
      .values({ email, passwordHash, role: "professional" })
      .returning();

    let slug = slugify(body.name);
    const clash = await db
      .select()
      .from(schema.professionals)
      .where(eq(schema.professionals.slug, slug))
      .limit(1);
    if (clash.length) slug = `${slug}-${Date.now().toString(36)}`;

    const [pro] = await db
      .insert(schema.professionals)
      .values({
        userId: user.id,
        name: body.name,
        slug,
        city: body.city || "Houston",
        status: "active",
        paidUntil: "2099-12-31",
        categories: "both",
        hoursJson: { start: "10:00", end: "19:00" },
        closedDaysJson: [0, 1],
      })
      .returning();

    return NextResponse.json({
      professional: { ...pro, email: user.email },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Create professional failed" }, { status: 400 });
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
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, id))
    .limit(1);
  if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // cascade bookings/services via FK; also remove user
  await db.delete(schema.professionals).where(eq(schema.professionals.id, id));
  await db.delete(schema.users).where(eq(schema.users.id, pro.userId));
  return NextResponse.json({ ok: true });
}
