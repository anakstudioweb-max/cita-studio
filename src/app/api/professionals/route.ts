import { NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { todayHoustonDateStr } from "@/lib/utils";
import { instagramHref } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public professionals API.
 * - No query: list all active+paid professionals (pro-first booking step).
 * - ?professionalId=: list that pro's visible services.
 * - ?service=: (legacy) pros who offer a catalog service name.
 */
export async function GET(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured", professionals: [], services: [] },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const professionalId = url.searchParams.get("professionalId");
  const serviceName = url.searchParams.get("service");

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

    if (professionalId) {
      const pro = publicPros.find((p) => p.id === professionalId);
      if (!pro) {
        return NextResponse.json({ error: "Not found", services: [] }, { status: 404 });
      }
      const services = await db
        .select()
        .from(schema.professionalServices)
        .where(
          and(
            eq(schema.professionalServices.professionalId, pro.id),
            eq(schema.professionalServices.visible, true)
          )
        );
      return NextResponse.json({
        professional: {
          id: pro.id,
          name: pro.name,
          bio: pro.bio,
          photoUrl: pro.photoUrl,
          city: pro.city,
          address: pro.address,
          instagram: pro.instagram,
          instagramUrl: instagramHref(pro.instagram),
        },
        services: services
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
            photoUrl: s.photoUrl || null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    if (!publicPros.length) {
      return NextResponse.json({ professionals: [] });
    }

    if (serviceName) {
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
            instagramUrl: instagramHref(p.instagram),
            categories: p.categories,
            service: {
              id: svc.id,
              name: svc.name,
              description: svc.description,
              durationMin: svc.durationMin,
              priceCents: svc.priceCents,
              photoUrl: svc.photoUrl || null,
            },
          };
        });
      return NextResponse.json({ professionals: list });
    }

    // Default: all public professionals for pro-first booking
    const proIds = publicPros.map((p) => p.id);
    const offered = await db
      .select({
        professionalId: schema.professionalServices.professionalId,
      })
      .from(schema.professionalServices)
      .where(
        and(
          inArray(schema.professionalServices.professionalId, proIds),
          eq(schema.professionalServices.visible, true)
        )
      );
    const withServices = new Set(offered.map((o) => o.professionalId));

    const list = publicPros
      .filter((p) => withServices.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        bio: p.bio,
        photoUrl: p.photoUrl,
        city: p.city,
        address: p.address,
        instagram: p.instagram,
        instagramUrl: instagramHref(p.instagram),
        categories: p.categories,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ professionals: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed", professionals: [], services: [] },
      { status: 500 }
    );
  }
}
