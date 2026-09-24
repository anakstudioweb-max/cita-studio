import "dotenv/config";
import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim();
      }
    }
  } catch {
    /* ignore */
  }

  let url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  // Prefer session pooler for writes
  if (url.includes("pooler.supabase.com") && url.includes(":6543/")) {
    url = url.replace(":6543/", ":5432/");
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const dir = resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log("Applying", file);
    const migration = readFileSync(resolve(dir, file), "utf8");
    await sql.unsafe(migration);
  }

  await sql.end();
  console.log("Migrations complete:", files.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
