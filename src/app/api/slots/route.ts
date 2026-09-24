import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { getFreeSlots } from "@/lib/slots";
import { isProPubliclyVisible } from "@/lib/utils";

export async function GET(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured", slots: [] },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  const date = searchParams.get("date");
  // Prefer serviceIds=id1,id2 — also accept legacy serviceId=
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceId = searchParams.get("serviceId");
  const serviceIds = (
    serviceIdsParam
      ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : serviceId
        ? [serviceId]
        : []
  );

  if (!professionalId || !serviceIds.length || !date) {
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

  const result = await getFreeSlots({
    professionalId,
    serviceIds,
    dateStr: date,
  });
  return NextResponse.json(result);
}
