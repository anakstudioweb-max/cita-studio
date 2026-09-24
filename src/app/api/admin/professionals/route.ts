import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, hashPassword } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { adminCreateSchema, profileSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { normalizeInstagram } from "@/lib/instagram";
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
  /** Optional password reset — bcrypt hashed, never returned to client. */
  password: z.string().min(1).max(120).optional(),
  /** Optional login email change for the pro's user account. */
  email: z.string().email().optional(),
});

export async function PATCH(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const body = adminPatch.parse(await req.json());
  const db = getDb();

  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, body.id))
    .limit(1);
  if (!pro) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let emailUpdated = false;
  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    const [current] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, pro.userId))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (email !== current.email) {
      const clash = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (clash.length) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      await db
        .update(schema.users)
        .set({ email })
        .where(eq(schema.users.id, pro.userId));
      emailUpdated = true;
    }
  }

  if (body.password !== undefined) {
    const passwordHash = await hashPassword(body.password);
    await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, pro.userId));
  }

  const profilePatch: Record<string, unknown> = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.bio !== undefined ? { bio: body.bio } : {}),
    ...(body.city !== undefined ? { city: body.city } : {}),
    ...(body.address !== undefined ? { address: body.address } : {}),
    ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
    ...(body.instagram !== undefined ? { instagram: normalizeInstagram(body.instagram) } : {}),
    ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
    ...(body.hoursJson !== undefined ? { hoursJson: body.hoursJson } : {}),
    ...(body.closedDaysJson !== undefined
      ? { closedDaysJson: body.closedDaysJson }
      : {}),
    ...(body.categories !== undefined ? { categories: body.categories } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.paidUntil !== undefined ? { paidUntil: body.paidUntil } : {}),
  };

  let updated = pro;
  if (Object.keys(profilePatch).length > 0) {
    const [row] = await db
      .update(schema.professionals)
      .set(profilePatch)
      .where(eq(schema.professionals.id, body.id))
      .returning();
    if (row) updated = row;
  }

  const [userRow] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, pro.userId))
    .limit(1);

  return NextResponse.json({
    professional: { ...updated, email: userRow?.email || "" },
    passwordUpdated: body.password !== undefined,
    emailUpdated,
  });
}

/** Create professional + user account (owner-controlled). */
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  try {
    const body = adminCreateSchema.parse(await req.json());
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

    // Seed ALL catalog services onto the new professional
    const catalog = await db.select().from(schema.catalogServices);
    if (catalog.length) {
      await db.insert(schema.professionalServices).values(
        catalog.map((c) => ({
          professionalId: pro.id,
          catalogServiceId: c.id,
          name: c.name,
          description: c.description,
          durationMin: c.durationMin,
          priceCents: c.basePriceCents,
          visible: true,
        }))
      );
    }

    return NextResponse.json({
      professional: { ...pro, email: user.email },
      seededServices: catalog.length,
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
