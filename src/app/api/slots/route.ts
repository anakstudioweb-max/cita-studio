import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { getFreeSlots } from "@/lib/slots";
import { isProPubliclyVisible, todayHoustonDateStr } from "@/lib/utils";

export async function GET(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured", slots: [] },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");
  if (!professionalId || !serviceId || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, professionalId))
    .limit(1);
  if (!pro || !isProPubliclyVisible(pro)) {
    return NextResponse.json({ error: "Professional not available", slots: [] }, { status: 404 });
  }

  const result = await getFreeSlots({ professionalId, serviceId, dateStr: date });
  return NextResponse.json(result);
}
