/** Build Google Calendar + ICS helpers for booking confirmation. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Format a Date as UTC YYYYMMDDTHHmmssZ for Google Calendar / ICS. */
export function toGoogleUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export type CalendarEvent = {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
};

export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toGoogleUtc(ev.start)}/${toGoogleUtc(ev.end)}`,
    details: ev.description,
    location: ev.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(ev: CalendarEvent, uid?: string): string {
  const stamp = toGoogleUtc(new Date());
  const id = uid || `${toGoogleUtc(ev.start)}-${Math.random().toString(36).slice(2, 8)}@bookanakstudio.com`;
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anak.Studio//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toGoogleUtc(ev.start)}`,
    `DTEND:${toGoogleUtc(ev.end)}`,
    `SUMMARY:${escape(ev.title)}`,
    `DESCRIPTION:${escape(ev.description)}`,
    `LOCATION:${escape(ev.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: CalendarEvent, filename = "anak-studio-booking.ics") {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
