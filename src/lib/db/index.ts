import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function normalizeDatabaseUrl(raw: string) {
  let url = raw.trim().replace(/^["']|["']$/g, "");
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
