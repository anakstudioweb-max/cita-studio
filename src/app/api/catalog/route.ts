import { NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { todayHoustonDateStr } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured", services: [] },
      { status: 503 }
    );
  }
  try {
    const db = getDb();
    const today = todayHoustonDateStr();
    const services = await db.select().from(schema.catalogServices);

    const publicPros = await db
      .select()
      .from(schema.professionals)
      .where(
        and(
          eq(schema.professionals.status, "active"),
          gte(schema.professionals.paidUntil, today)
        )
      );

    const proIds = publicPros.map((p) => p.id);
    let offered: {
      name: string;
      priceCents: number;
      durationMin: number;
      professionalId: string;
      id: string;
    }[] = [];
    if (proIds.length) {
      const rows = await db
        .select()
        .from(schema.professionalServices)
        .where(
          and(
            inArray(schema.professionalServices.professionalId, proIds),
            eq(schema.professionalServices.visible, true)
          )
        );
      offered = rows.map((r) => ({
        id: r.id,
        name: r.name,
        priceCents: r.priceCents,
        durationMin: r.durationMin,
        professionalId: r.professionalId,
      }));
    }

    const catalog = services
      .filter((s) => s.category === "lashes" || s.category === "brows")
      .map((s) => {
        const matches = offered.filter((o) => o.name === s.name);
        const minPrice = matches.length
          ? Math.min(...matches.map((m) => m.priceCents))
          : s.basePriceCents;
        return {
          id: s.id,
          category: s.category === "both" ? "lashes" : s.category,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          basePriceCents: s.basePriceCents,
          fromPriceCents: minPrice,
          available: matches.length > 0,
        };
      });

    return NextResponse.json({ services: catalog });
  } catch (e) {
    console.error(e);
    const err = e as Error & { cause?: Error };
    return NextResponse.json(
      {
        error: "Failed to load catalog",
        detail: (err.message || "unknown").slice(0, 160),
        cause: (err.cause?.message || "").slice(0, 200),
        services: [],
      },
      { status: 500 }
    );
  }
}
