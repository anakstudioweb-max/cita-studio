import { getDb, hasDatabaseUrl, schema } from "@/lib/db";

/** All supported template keys (email subject/headline/intro/footer + SMS). */
export const TEMPLATE_KEYS = [
  "email_pro_subject",
  "email_pro_headline",
  "email_pro_intro",
  "email_pro_footer",
  "email_owner_subject",
  "email_owner_headline",
  "email_owner_intro",
  "email_owner_footer",
  "email_client_subject",
  "email_client_headline",
  "email_client_intro",
  "email_client_footer",
  "email_client_confirmed_subject",
  "email_client_confirmed_headline",
  "email_client_confirmed_intro",
  "email_client_confirmed_footer",
  "sms_pro",
  "sms_client",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateMap = Record<TemplateKey, string>;

export const PLACEHOLDERS = [
  "ref",
  "service",
  "when",
  "place",
  "price",
  "clientName",
  "clientPhone",
  "clientEmail",
  "professionalName",
  "notes",
] as const;

/** Hardcoded English defaults — used when DB empty or unavailable. */
export const DEFAULT_TEMPLATES: TemplateMap = {
  email_pro_subject: "New booking · {{ref}} · {{service}}",
  email_pro_headline: "New booking",
  email_pro_intro:
    "A client just requested an appointment with you.\n\n{{clientName}} · {{clientPhone}} · {{when}} (Houston)",
  email_pro_footer:
    "Questions? Reply to this email or WhatsApp your professional.",
  email_owner_subject: "Booking · {{ref}} · {{professionalName}}",
  email_owner_headline: "Marketplace booking",
  email_owner_intro:
    "New booking on Anak.Studio.\n\n{{professionalName}} with {{clientName}}",
  email_owner_footer:
    "Questions? Reply to this email or WhatsApp your professional.",
  email_client_subject: "You're booked · {{service}}",
  email_client_headline: "Request received",
  email_client_intro:
    "Thanks — your booking request is in.\n\nHi {{clientName}}, your professional will confirm soon.",
  email_client_footer:
    "Questions? Reply to this email or WhatsApp your professional.",
  email_client_confirmed_subject: "Confirmed · {{service}}",
  email_client_confirmed_headline: "You're confirmed",
  email_client_confirmed_intro:
    "Good news — {{professionalName}} confirmed your appointment.\n\nHi {{clientName}}, see you at the time below.",
  email_client_confirmed_footer:
    "Questions? Reply to this email or WhatsApp your professional.",
  sms_pro:
    "New booking — Anak.Studio {{ref}}: {{service}} · {{when}} Houston · {{place}} · {{price}} · {{clientName}} {{clientPhone}}",
  // Used as the copy-paste SMS/WhatsApp body in pro/owner booking emails
  // (automatic Telnyx SMS is disabled).
  sms_client:
    "Hi {{clientName}}, your Anak.Studio appointment is confirmed. {{service}} on {{when}} (Houston time). See you there!",
};

const CACHE_TTL_MS = 15_000;
let cache: { at: number; map: TemplateMap } | null = null;

export function clearTemplateCache() {
  cache = null;
}

function mergeWithDefaults(
  rows: { key: string; value: string }[]
): TemplateMap {
  const map = { ...DEFAULT_TEMPLATES };
  for (const row of rows) {
    if ((TEMPLATE_KEYS as readonly string[]).includes(row.key)) {
      map[row.key as TemplateKey] = row.value;
    }
  }
  return map;
}

/** Load all templates (DB + defaults). Brief in-memory cache. */
export async function loadTemplates(): Promise<TemplateMap> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.map;
  }
  if (!hasDatabaseUrl()) {
    return { ...DEFAULT_TEMPLATES };
  }
  try {
    const db = getDb();
    const rows = await db.select().from(schema.notificationTemplates);
    const map = mergeWithDefaults(rows);
    cache = { at: Date.now(), map };
    return map;
  } catch (err) {
    console.error(
      "loadTemplates failed, using defaults",
      err instanceof Error ? err.message : "unknown"
    );
    return { ...DEFAULT_TEMPLATES };
  }
}

/** Upsert a partial set of template fields. */
export async function saveTemplates(
  partial: Partial<TemplateMap>
): Promise<TemplateMap> {
  if (!hasDatabaseUrl()) {
    throw new Error("No DB");
  }
  const db = getDb();
  const now = new Date();
  for (const key of TEMPLATE_KEYS) {
    if (partial[key] === undefined) continue;
    const value = String(partial[key] ?? "");
    await db
      .insert(schema.notificationTemplates)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.notificationTemplates.key,
        set: { value, updatedAt: now },
      });
  }
  clearTemplateCache();
  return loadTemplates();
}

export type PlaceholderVars = Record<(typeof PLACEHOLDERS)[number], string>;

/** Replace {{placeholders}} in plain text (no HTML escaping). */
export function applyPlaceholders(
  template: string,
  vars: PlaceholderVars
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key in vars) return vars[key as keyof PlaceholderVars] ?? "";
    return "";
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape template, replace placeholders with escaped values,
 * then turn blank-line paragraphs into <p> (single newlines → <br>).
 */
export function applyPlaceholdersHtml(
  template: string,
  vars: PlaceholderVars
): string {
  const escapedTpl = escapeHtml(template);
  const withVars = escapedTpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key in vars) return escapeHtml(vars[key as keyof PlaceholderVars] ?? "");
    return "";
  });
  const blocks = withVars
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return "";
  return blocks
    .map(
      (b) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${b.replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

export type EmailRoleKey = "pro" | "owner" | "client";

export function roleToKeyPrefix(role: "professional" | "owner" | "client"): EmailRoleKey {
  if (role === "professional") return "pro";
  return role;
}

export function emailFieldsForRole(
  templates: TemplateMap,
  role: "professional" | "owner" | "client"
) {
  const p = roleToKeyPrefix(role);
  return {
    subject: templates[`email_${p}_subject`],
    headline: templates[`email_${p}_headline`],
    intro: templates[`email_${p}_intro`],
    footer: templates[`email_${p}_footer`],
  };
}
