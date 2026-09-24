import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Trim wrapping quotes/whitespace that break Vercel dashboard env values. */
export function normalizeDatabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url || null;
}

/** Safe error chain for API responses (no connection strings). */
export function safeErrorDetail(err: unknown, maxLen = 220): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur && depth < 5) {
    if (cur instanceof Error) {
      if (cur.message) parts.push(cur.message);
      const code = (cur as { code?: string }).code;
      if (code) parts.push(`code=${code}`);
      cur = cur.cause;
    } else if (typeof cur === "string") {
      parts.push(cur);
      break;
    } else {
      break;
    }
    depth++;
  }
  return parts
    .join(" | ")
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://[redacted]")
    .replace(/password[=:][^\s&'"]+/gi, "password=[redacted]")
    .slice(0, maxLen);
}

export function databaseHostMeta() {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) return { configured: false as const };
  try {
    const u = new URL(url);
    return {
      configured: true as const,
      host: u.hostname,
      port: u.port || null,
      db: u.pathname,
      userPrefix: (u.username || "").split(".")[0] || null,
      hasSslMode: u.searchParams.has("sslmode"),
    };
  } catch {
    return { configured: true as const, parseError: true as const };
  }
}

function buildClient(url: string) {
  // Vercel serverless: one connection per isolate, no prepared statements
  // (Supabase transaction pooler), force TLS.
  return postgres(url, {
    max: 1,
    prepare: false,
    ssl: "require",
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export function getDb() {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres/Supabase connection string to use Anak.Studio bookings."
    );
  }
  if (!_db) {
    _client = buildClient(url);
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export function hasDatabaseUrl() {
  return Boolean(normalizeDatabaseUrl(process.env.DATABASE_URL));
}

export { schema };
