/** Houston local date (YYYY-MM-DD) + time (HH:mm) from an ISO timestamp. */
export function houstonDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

export function houstonDateStr(iso: string): string {
  return houstonDateTime(iso).date;
}

export function formatHoustonTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatHoustonDayLabel(dateStr: string, locale = "en-US"): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 18, 0, 0));
  return new Intl.DateTimeFormat(locale, {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(utc);
}

export type ProBooking = {
  id: string;
  refCode: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  startAt: string;
  endAt?: string;
  priceCents: number;
  status: "requested" | "confirmed" | "done" | "cancelled";
  serviceName?: string | null;
  notes?: string | null;
  deletedAt?: string | null;
};
