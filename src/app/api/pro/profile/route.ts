import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

async function getOwnPro(userId: string) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, userId))
    .limit(1);
  return pro || null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  if (session.role === "owner") {
    return NextResponse.json({ professional: null, role: "owner" });
  }
  const pro = await getOwnPro(session.userId);
  return NextResponse.json({ professional: pro, role: session.role });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "professional") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const body = profileSchema.parse(await req.json());
  const pro = await getOwnPro(session.userId);
  if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const [updated] = await db
    .update(schema.professionals)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
      ...(body.instagram !== undefined ? { instagram: body.instagram } : {}),
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
      ...(body.hoursJson !== undefined ? { hoursJson: body.hoursJson } : {}),
      ...(body.closedDaysJson !== undefined
        ? { closedDaysJson: body.closedDaysJson }
        : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
    })
    .where(eq(schema.professionals.id, pro.id))
    .returning();

  return NextResponse.json({ professional: updated });
}
