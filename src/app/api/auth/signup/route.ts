import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth/session";
import { signupSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    if (!hasDatabaseUrl()) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 503 }
      );
    }
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

    const owners = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "owner"))
      .limit(1);
    const role = owners.length === 0 ? "owner" : "professional";

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(schema.users)
      .values({ email, passwordHash, role })
      .returning();

    if (role === "professional") {
      let slug = slugify(body.name);
      const clash = await db
        .select()
        .from(schema.professionals)
        .where(eq(schema.professionals.slug, slug))
        .limit(1);
      if (clash.length) slug = `${slug}-${Date.now().toString(36)}`;

      await db.insert(schema.professionals).values({
        userId: user.id,
        name: body.name,
        slug,
        city: body.city || "Houston",
        status: "pending",
        paidUntil: null,
        categories: "both",
        hoursJson: { start: "10:00", end: "19:00" },
        closedDaysJson: [0, 1],
      });
    }

    await createSession({ userId: user.id, email: user.email, role: user.role });
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirect: user.role === "owner" ? "/admin" : "/pro",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 400 });
  }
}
