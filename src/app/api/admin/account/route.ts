import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession, hashPassword } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accountSchema = z.object({
  password: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});

async function requireOwner() {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  return session;
}

/** Owner updates their own password and/or email. */
export async function POST(req: Request) {
  const session = await requireOwner();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  try {
    const body = accountSchema.parse(await req.json());
    if (!body.password && !body.email) {
      return NextResponse.json(
        { error: "password or email required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const patch: { passwordHash?: string; email?: string } = {};

    if (body.password !== undefined) {
      patch.passwordHash = await hashPassword(body.password);
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (email !== session.email) {
        const clash = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        if (clash.length) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
        patch.email = email;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, email: session.email });
    }

    const [updated] = await db
      .update(schema.users)
      .set(patch)
      .where(eq(schema.users.id, session.userId))
      .returning({ id: schema.users.id, email: schema.users.email });

    return NextResponse.json({
      ok: true,
      email: updated?.email || session.email,
      passwordUpdated: body.password !== undefined,
      emailUpdated: body.email !== undefined && !!patch.email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Account update failed" }, { status: 400 });
  }
}

export async function GET() {
  const session = await requireOwner();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ email: session.email, role: session.role });
}
