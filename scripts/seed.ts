import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  // Load .env.local manually if dotenv didn't
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

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const sql = postgres(url, { max: 1 });

  // Apply migration
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_init.sql"),
    "utf8"
  );
  await sql.unsafe(migration);

  const hash = async (p: string) => bcrypt.hash(p, 10);

  // Clear for idempotent re-seed
  await sql`TRUNCATE bookings, professional_services, catalog_services, professionals, users CASCADE`;

  const ownerPass = await hash("AnakOwner123!");
  const [owner] = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES ('owner@anak.studio', ${ownerPass}, 'owner')
    RETURNING id
  `;

  const catalog = [
    {
      category: "lashes",
      name: "Classic",
      description: "Natural classic lash extensions",
      duration_min: 90,
      base_price_cents: 12000,
    },
    {
      category: "lashes",
      name: "Hybrid",
      description: "Soft hybrid volume",
      duration_min: 120,
      base_price_cents: 15500,
    },
    {
      category: "lashes",
      name: "Volume",
      description: "Full volume sets",
      duration_min: 150,
      base_price_cents: 18500,
    },
    {
      category: "lashes",
      name: "Lash lift",
      description: "Lift and tint-ready curl",
      duration_min: 60,
      base_price_cents: 9500,
    },
    {
      category: "brows",
      name: "Brow shaping",
      description: "Precision brow map and shape",
      duration_min: 45,
      base_price_cents: 4500,
    },
    {
      category: "brows",
      name: "Brow lamination",
      description: "Sculpted laminated brows",
      duration_min: 60,
      base_price_cents: 7000,
    },
    {
      category: "brows",
      name: "Brow tint",
      description: "Soft tint for definition",
      duration_min: 50,
      base_price_cents: 5500,
    },
  ];

  const catalogRows: { id: string; category: string; name: string; description: string; duration_min: number; base_price_cents: number }[] = [];
  for (const c of catalog) {
    const [row] = await sql`
      INSERT INTO catalog_services (category, name, description, duration_min, base_price_cents)
      VALUES (${c.category}, ${c.name}, ${c.description}, ${c.duration_min}, ${c.base_price_cents})
      RETURNING *
    `;
    catalogRows.push(row as typeof catalogRows[0]);
  }

  const pros = [
    {
      email: "luna@anak.studio",
      password: "LunaAnak123!",
      name: "Luna Vega",
      slug: "luna-vega",
      bio: "Montrose lash artist. Quiet sets, soft lines, lasting comfort.",
      photo_url: "/avatars/luna.svg",
      city: "Houston",
      address: "Montrose, Houston",
      whatsapp: "17135550101",
      instagram: "@lunavega.lashes",
      categories: "lashes",
      offer: ["Classic", "Hybrid", "Volume", "Lash lift"],
    },
    {
      email: "marisol@anak.studio",
      password: "MarisolAnak123!",
      name: "Marisol Chen",
      slug: "marisol-chen",
      bio: "Brow sculpting in The Heights. Clean architecture, natural finish.",
      photo_url: "/avatars/marisol.svg",
      city: "Houston",
      address: "The Heights, Houston",
      whatsapp: "17135550102",
      instagram: "@marisol.brows",
      categories: "brows",
      offer: ["Brow shaping", "Brow lamination", "Brow tint"],
    },
    {
      email: "noa@anak.studio",
      password: "NoaAnak123!",
      name: "Noa Ruiz",
      slug: "noa-ruiz",
      bio: "River Oaks full-face lashes & brows. Editorial calm, spa ritual.",
      photo_url: "/avatars/noa.svg",
      city: "Houston",
      address: "River Oaks, Houston",
      whatsapp: "17135550103",
      instagram: "@noaruiz.studio",
      categories: "both",
      offer: [
        "Classic",
        "Hybrid",
        "Volume",
        "Lash lift",
        "Brow shaping",
        "Brow lamination",
        "Brow tint",
      ],
    },
  ];

  const paidUntil = "2099-12-31";

  for (const p of pros) {
    const pass = await hash(p.password);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${p.email}, ${pass}, 'professional')
      RETURNING id
    `;
    const [pro] = await sql`
      INSERT INTO professionals (
        user_id, name, slug, bio, photo_url, city, address, whatsapp, instagram,
        hours_json, closed_days_json, status, paid_until, categories
      ) VALUES (
        ${user.id}, ${p.name}, ${p.slug}, ${p.bio}, ${p.photo_url}, ${p.city},
        ${p.address}, ${p.whatsapp}, ${p.instagram},
        ${sql.json({ start: "10:00", end: "19:00" })},
        ${sql.json([0, 1])},
        'active', ${paidUntil}, ${p.categories}
      )
      RETURNING id
    `;

    for (const svcName of p.offer) {
      const cat = catalogRows.find((c) => c.name === svcName)!;
      await sql`
        INSERT INTO professional_services (
          professional_id, catalog_service_id, name, description, duration_min, price_cents, visible
        ) VALUES (
          ${pro.id}, ${cat.id}, ${cat.name}, ${cat.description}, ${cat.duration_min}, ${cat.base_price_cents}, true
        )
      `;
    }
  }

  console.log("Seeded Anak.Studio marketplace");
  console.log("Owner:", "owner@anak.studio / AnakOwner123!");
  console.log("Pros:");
  for (const p of pros) {
    console.log(`  ${p.name}: ${p.email} / ${p.password}`);
  }
  console.log("Owner user id:", owner.id);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
