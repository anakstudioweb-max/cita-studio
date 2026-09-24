import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD || "demo123";
  if (parsed.data.password !== expected) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
