import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    if (!hasDatabaseUrl()) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 503 }
      );
    }
    const body = loginSchema.parse(await req.json());
    const db = getDb();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, body.email.toLowerCase()))
      .limit(1);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirect: user.role === "owner" ? "/admin" : "/pro",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
