import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/db";
import {
  DEFAULT_TEMPLATES,
  PLACEHOLDERS,
  TEMPLATE_KEYS,
  loadTemplates,
  saveTemplates,
  type TemplateKey,
  type TemplateMap,
} from "@/lib/notification-templates";
import { z } from "zod";

async function requireOwner() {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  return session;
}

const putSchema = z.object(
  Object.fromEntries(
    TEMPLATE_KEYS.map((k) => [k, z.string().max(8000).optional()])
  ) as Record<TemplateKey, z.ZodOptional<z.ZodString>>
);

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }
  const templates = await loadTemplates();
  return NextResponse.json({
    templates,
    defaults: DEFAULT_TEMPLATES,
    placeholders: PLACEHOLDERS.map((p) => `{{${p}}}`),
    keys: TEMPLATE_KEYS,
  });
}

export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }
  try {
    const body = putSchema.parse(await req.json());
    const partial: Partial<TemplateMap> = {};
    for (const key of TEMPLATE_KEYS) {
      if (body[key] !== undefined) {
        partial[key] = body[key] as string;
      }
    }
    if (!Object.keys(partial).length) {
      return NextResponse.json({ error: "No fields" }, { status: 400 });
    }
    const templates = await saveTemplates(partial);
    return NextResponse.json({ templates });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Invalid notifications payload" },
      { status: 400 }
    );
  }
}
