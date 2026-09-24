import { NextResponse } from "next/server";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = hasDatabaseUrl();
  const sessionOk = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);
  if (!hasUrl) {
    return NextResponse.json({ ok: false, hasUrl, sessionOk, error: "no DATABASE_URL" }, { status: 503 });
  }
  try {
    const db = getDb();
    const services = await db.select({ id: schema.catalogServices.id }).from(schema.catalogServices);
    const users = await db.select({ id: schema.users.id }).from(schema.users);
    return NextResponse.json({
      ok: true,
      hasUrl,
      sessionOk,
      services: services.length,
      users: users.length,
    });
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return NextResponse.json(
      {
        ok: false,
        hasUrl,
        sessionOk,
        error: err.message?.slice(0, 200),
        cause: err.cause?.message?.slice(0, 200) || null,
      },
      { status: 500 }
    );
  }
}
