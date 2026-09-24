import { weeklyAvailability, getServiceById } from "@/data/site";
import { getBookingsByDate, overlaps } from "@/lib/bookings";
import {
  parseTimeToMinutes,
  minutesToTime,
  parseDateKey,
  isSameDay,
  toDateKey,
} from "@/lib/time";

export type TimeSlot = {
  startTime: string;
  endTime: string;
};

/**
 * Genera slots libres para un servicio en una fecha.
 * Paso = duración del servicio. Bloquea horarios pasados y solapados.
 */
export async function getAvailableSlots(
  serviceId: string,
  date: string
): Promise<TimeSlot[]> {
  const service = getServiceById(serviceId);
  if (!service) return [];

  const day = parseDateKey(date);
  const today = new Date();
  // No permitir fechas pasadas (día completo)
  const todayKey = toDateKey(today);
  if (date < todayKey) return [];

  const avail = weeklyAvailability.find((a) => a.day === day.getDay());
  if (!avail) return [];

  const openMin = parseTimeToMinutes(avail.open);
  const closeMin = parseTimeToMinutes(avail.close);
  const duration = service.durationMinutes;

  const bookings = await getBookingsByDate(date);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const isToday = isSameDay(day, today);

  const slots: TimeSlot[] = [];

  for (let start = openMin; start + duration <= closeMin; start += duration) {
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(start + duration);

    if (isToday && start <= nowMin) continue;

    const conflict = bookings.some((b) =>
      overlaps(startTime, endTime, b.startTime, b.endTime)
    );
    if (conflict) continue;

    slots.push({ startTime, endTime });
  }

  return slots;
}
