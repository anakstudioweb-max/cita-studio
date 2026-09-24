import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  if (!hasDatabaseUrl()) return NextResponse.json({ user: session });

  const db = getDb();
  let professional = null;
  if (session.role === "professional") {
    const [pro] = await db
      .select()
      .from(schema.professionals)
      .where(eq(schema.professionals.userId, session.userId))
      .limit(1);
    professional = pro || null;
  }
  return NextResponse.json({ user: session, professional });
}
