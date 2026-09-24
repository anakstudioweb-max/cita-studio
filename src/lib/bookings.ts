import { promises as fs } from "fs";
import path from "path";
import type { Booking } from "@/lib/types";

/**
 * Almacenamiento local en JSON.
 * Más adelante se puede reemplazar por Supabase manteniendo
 * la misma forma de Booking y las mismas funciones exportadas.
 */

const DATA_PATH = path.join(process.cwd(), "data", "bookings.json");

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf-8");
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  try {
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const all = await getAllBookings();
  return all.filter((b) => b.date === date && b.status === "confirmed");
}

export async function getUpcomingBookings(): Promise<Booking[]> {
  const all = await getAllBookings();
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return all
    .filter((b) => b.status === "confirmed" && b.date >= key)
    .sort((a, b) => {
      const da = `${a.date}T${a.startTime}`;
      const db = `${b.date}T${b.startTime}`;
      return da.localeCompare(db);
    });
}

export async function saveBooking(booking: Booking): Promise<Booking> {
  await ensureFile();
  const all = await getAllBookings();
  all.push(booking);
  await fs.writeFile(DATA_PATH, JSON.stringify(all, null, 2), "utf-8");
  return booking;
}

export function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}
