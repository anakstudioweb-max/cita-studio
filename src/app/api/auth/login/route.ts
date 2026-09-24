import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { getDb, hasDatabaseUrl, safeErrorDetail, schema } from "@/lib/db";
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
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
      return NextResponse.json(
        { error: "SESSION_SECRET is not configured" },
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
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid email or password format" },
        { status: 400 }
      );
    }
    const detail = safeErrorDetail(e);
    if (/SESSION_SECRET|DATABASE_URL|connect|ECONN|ssl|timeout|auth/i.test(detail)) {
      return NextResponse.json(
        { error: "Server configuration error", detail },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Login failed", detail },
      { status: 500 }
    );
  }
}
