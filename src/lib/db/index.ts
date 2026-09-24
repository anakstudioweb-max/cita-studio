import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Supabase transaction pooler (:6543) often rejects UPDATEs as read-only.
 * Prefer session pooler (:5432) on the same pooler host for writable admin CRUD.
 */
function normalizeDatabaseUrl(raw: string) {
  let url = raw.trim().replace(/^["']|["']$/g, "");
  if (url.includes("pooler.supabase.com") && url.includes(":6543/")) {
    url = url.replace(":6543/", ":5432/");
  }
  if (!/[?&]sslmode=/.test(url)) {
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  if (url.includes("pooler.supabase.com") && !/[?&]pgbouncer=/.test(url)) {
    url += url.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
  return url;
}

export function getDb() {
  const raw = process.env.DATABASE_URL;
  if (!raw?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres/Supabase connection string to use Anak.Studio bookings."
    );
  }
  if (!_db) {
    const url = normalizeDatabaseUrl(raw);
    _client = postgres(url, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export { schema };
