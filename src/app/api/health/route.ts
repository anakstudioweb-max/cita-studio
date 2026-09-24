import { NextResponse } from "next/server";
import {
  databaseHostMeta,
  getDb,
  hasDatabaseUrl,
  safeErrorDetail,
  schema,
} from "@/lib/db";

export async function GET() {
  const meta = databaseHostMeta();
  const sessionOk = Boolean(
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
  );
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        database: meta,
        sessionSecret: sessionOk,
        connect: "skipped",
      },
      { status: 503 }
    );
  }
  try {
    const db = getDb();
    const rows = await db.select().from(schema.catalogServices).limit(1);
    return NextResponse.json({
      ok: true,
      database: meta,
      sessionSecret: sessionOk,
      connect: "ok",
      catalogSample: rows.length,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        database: meta,
        sessionSecret: sessionOk,
        connect: "error",
        detail: safeErrorDetail(e),
      },
      { status: 500 }
    );
  }
}
