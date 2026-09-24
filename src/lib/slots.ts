import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { addMinutes, format } from "date-fns";
import { getDb, schema } from "./db";
import { todayHoustonDateStr } from "./utils";

const { bookings, professionals, professionalServices } = schema;

function houstonOffsetMinutes(dateStr: string): number {
  const probe = new Date(`${dateStr}T18:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-6";
  const m = tzName.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!m) return -360;
  const h = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  return h * 60 + (h < 0 ? -mm : mm);
}

export function localToUtc(dateStr: string, timeStr: string): Date {
  const offsetMin = houstonOffsetMinutes(dateStr);
  const [Y, M, D] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(Y, M - 1, D, hh, mi) - offsetMin * 60_000);
}

export function utcToLocalTime(dt: Date, dateStr: string): string {
  const offsetMin = houstonOffsetMinutes(dateStr);
  const local = new Date(dt.getTime() + offsetMin * 60_000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function formatHm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function getFreeSlots(opts: {
  professionalId: string;
  serviceId: string;
  dateStr: string;
}) {
  const db = getDb();
  const [pro] = await db
    .select()
    .from(professionals)
    .where(eq(professionals.id, opts.professionalId))
    .limit(1);
  if (!pro) return { slots: [] as string[], reason: "not_found" as const };

  const closed = (pro.closedDaysJson as number[]) || [0, 1];
  const [Y, M, D] = opts.dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(Y, M - 1, D, 12)).getUTCDay();
  if (closed.includes(dow)) return { slots: [], reason: "closed" as const };
  if (opts.dateStr < todayHoustonDateStr())
    return { slots: [], reason: "past" as const };

  const [svc] = await db
    .select()
    .from(professionalServices)
    .where(eq(professionalServices.id, opts.serviceId))
    .limit(1);
  if (!svc || svc.professionalId !== opts.professionalId)
    return { slots: [], reason: "not_found" as const };

  const hours = (pro.hoursJson as { start: string; end: string }) || {
    start: "10:00",
    end: "19:00",
  };
  const startM = parseHm(hours.start);
  const endM = parseHm(hours.end);
  const duration = svc.durationMin;
  const step = 30;

  const dayStart = localToUtc(opts.dateStr, "00:00");
  const dayEnd = localToUtc(opts.dateStr, "23:59");

  const existing = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.professionalId, opts.professionalId),
        gte(bookings.startAt, dayStart),
        lt(bookings.startAt, addMinutes(dayEnd, 1)),
        ne(bookings.status, "cancelled")
      )
    );

  const slots: string[] = [];
  for (let m = startM; m + duration <= endM; m += step) {
    const timeStr = formatHm(m);
    const startAt = localToUtc(opts.dateStr, timeStr);
    const endAt = addMinutes(startAt, duration);
    // skip past times today
    if (startAt.getTime() < Date.now()) continue;
    const conflict = existing.some((b) => {
      const bs = b.startAt.getTime();
      const be = b.endAt.getTime();
      return startAt.getTime() < be && endAt.getTime() > bs;
    });
    if (!conflict) slots.push(timeStr);
  }
  return { slots, reason: "ok" as const, duration };
}
