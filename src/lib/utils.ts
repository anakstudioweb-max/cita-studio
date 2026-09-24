import { formatInTimeZone } from "date-fns-tz";
import { format, isBefore, parse, startOfDay } from "date-fns";

export const TZ = "America/Chicago";

export function money(cents: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function genRefCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ANA-${code}`;
}

export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function whatsappLink(phone: string, text: string) {
  const d = digitsOnly(phone);
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatHouston(dt: Date, pattern = "MMM d, yyyy · h:mm a") {
  try {
    return formatInTimeZone(dt, TZ, pattern);
  } catch {
    return format(dt, pattern);
  }
}

export function todayHoustonDateStr() {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

export function isPastHoustonDay(dateStr: string) {
  return isBefore(
    startOfDay(parse(dateStr, "yyyy-MM-dd", new Date())),
    startOfDay(parse(todayHoustonDateStr(), "yyyy-MM-dd", new Date()))
  );
}

export function isProPubliclyVisible(pro: {
  status: string;
  paidUntil: string | Date | null;
}) {
  if (pro.status !== "active") return false;
  if (!pro.paidUntil) return false;
  const paid =
    typeof pro.paidUntil === "string"
      ? pro.paidUntil.slice(0, 10)
      : pro.paidUntil.toISOString().slice(0, 10);
  return paid >= todayHoustonDateStr();
}
