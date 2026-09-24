import { NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { todayHoustonDateStr } from "@/lib/utils";

/** List public professionals that offer a given catalog service name */
export async function GET(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured", professionals: [] },
      { status: 503 }
    );
  }
  const serviceName = new URL(req.url).searchParams.get("service");
  if (!serviceName) {
    return NextResponse.json({ error: "service query required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const today = todayHoustonDateStr();
    const publicPros = await db
      .select()
      .from(schema.professionals)
      .where(
        and(
          eq(schema.professionals.status, "active"),
          gte(schema.professionals.paidUntil, today)
        )
      );

    if (!publicPros.length) {
      return NextResponse.json({ professionals: [] });
    }

    const proIds = publicPros.map((p) => p.id);
    const services = await db
      .select()
      .from(schema.professionalServices)
      .where(
        and(
          inArray(schema.professionalServices.professionalId, proIds),
          eq(schema.professionalServices.visible, true),
          eq(schema.professionalServices.name, serviceName)
        )
      );

    const byPro = new Map(services.map((s) => [s.professionalId, s]));
    const list = publicPros
      .filter((p) => byPro.has(p.id))
      .map((p) => {
        const svc = byPro.get(p.id)!;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          bio: p.bio,
          photoUrl: p.photoUrl,
          city: p.city,
          address: p.address,
          instagram: p.instagram,
          categories: p.categories,
          service: {
            id: svc.id,
            name: svc.name,
            description: svc.description,
            durationMin: svc.durationMin,
            priceCents: svc.priceCents,
          },
        };
      });

    return NextResponse.json({ professionals: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed", professionals: [] }, { status: 500 });
  }
}
