import { digitsOnly } from "@/lib/utils";

export type NotifyStatus = "sent" | "skipped" | "failed";

export type BookingNotifyPayload = {
  refCode: string;
  serviceName: string;
  whenLabel: string;
  place: string;
  priceCents: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  professionalName: string;
  professionalEmail?: string | null;
  professionalPhone?: string | null;
  ownerEmail?: string | null;
  notes?: string;
};

function moneyUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function bookingBody(p: BookingNotifyPayload) {
  const lines = [
    `Ref: ${p.refCode}`,
    `Service: ${p.serviceName}`,
    `When: ${p.whenLabel} (Houston)`,
    `Place: ${p.place}`,
    `Price: ${moneyUsd(p.priceCents)}`,
    `Client: ${p.clientName} · ${p.clientPhone}`,
  ];
  if (p.notes?.trim()) lines.push(`Notes: ${p.notes.trim()}`);
  return lines.join("\n");
}

/** Normalize to E.164 when possible (assume US +1 if 10 digits). */
export function toE164(phone: string): string | null {
  const d = digitsOnly(phone || "");
  if (!d) return null;
  if (phone.trim().startsWith("+") && d.length >= 10 && d.length <= 15) {
    return `+${d}`;
  }
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length >= 10 && d.length <= 15) return `+${d}`;
  return null;
}

async function sendResendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<NotifyStatus> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return "skipped";
  if (!opts.to?.includes("@")) return "skipped";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "Resend email failed",
        res.status,
        detail.slice(0, 200)
      );
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("Resend email error", err instanceof Error ? err.message : "unknown");
    return "failed";
  }
}

async function sendTelnyxSms(opts: {
  to: string;
  text: string;
}): Promise<NotifyStatus> {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const from = process.env.TELNYX_FROM_NUMBER?.trim();
  if (!apiKey || !from) return "skipped";

  const to = toE164(opts.to);
  if (!to) return "skipped";

  try {
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Telnyx SMS failed", res.status, detail.slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("Telnyx SMS error", err instanceof Error ? err.message : "unknown");
    return "failed";
  }
}

function aggregate(statuses: NotifyStatus[]): NotifyStatus {
  if (statuses.some((s) => s === "sent")) return "sent";
  if (statuses.some((s) => s === "failed")) return "failed";
  return "skipped";
}

function resolveOwnerEmail(p: BookingNotifyPayload): string | null {
  const env = process.env.OWNER_NOTIFY_EMAIL?.trim();
  if (env?.includes("@")) return env;
  if (p.ownerEmail?.includes("@")) return p.ownerEmail;
  return "admin@anak.studio";
}

/**
 * Email professional, owner, and client (if email provided).
 * No-ops cleanly when Resend env is unset.
 */
export async function sendBookingEmails(
  p: BookingNotifyPayload
): Promise<{ status: NotifyStatus; clientSent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { status: "skipped", clientSent: false };
  }

  const body = bookingBody(p);
  const results: NotifyStatus[] = [];
  let clientSent = false;

  if (p.professionalEmail?.includes("@")) {
    results.push(
      await sendResendEmail({
        to: p.professionalEmail,
        subject: `New booking ${p.refCode} · ${p.serviceName}`,
        text: `New Anak.Studio booking for ${p.professionalName}.\n\n${body}`,
      })
    );
  }

  const ownerEmail = resolveOwnerEmail(p);
  if (ownerEmail) {
    results.push(
      await sendResendEmail({
        to: ownerEmail,
        subject: `Booking ${p.refCode} · ${p.professionalName}`,
        text: `Anak.Studio booking (owner copy).\nPro: ${p.professionalName}\n\n${body}`,
      })
    );
  }

  const clientEmail = p.clientEmail?.trim();
  if (clientEmail?.includes("@")) {
    const st = await sendResendEmail({
      to: clientEmail,
      subject: `Your Anak.Studio booking ${p.refCode}`,
      text: `Thanks ${p.clientName} — your booking was requested.\n\n${body}\n\nYour professional will confirm shortly.`,
    });
    results.push(st);
    clientSent = st === "sent";
  }

  if (!results.length) return { status: "skipped", clientSent: false };
  return { status: aggregate(results), clientSent };
}

/**
 * SMS professional (whatsapp/phone) and client.
 * No-ops cleanly when Telnyx env is unset.
 */
export async function sendBookingSms(
  p: BookingNotifyPayload
): Promise<{ status: NotifyStatus; clientSent: boolean }> {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const from = process.env.TELNYX_FROM_NUMBER?.trim();
  if (!apiKey || !from) {
    return { status: "skipped", clientSent: false };
  }

  const short =
    `Anak.Studio ${p.refCode}: ${p.serviceName} · ${p.whenLabel} Houston · ${p.place} · ${moneyUsd(p.priceCents)} · ${p.clientName}`;
  const results: NotifyStatus[] = [];
  let clientSent = false;

  const proPhone = p.professionalPhone?.trim();
  if (proPhone && toE164(proPhone)) {
    results.push(
      await sendTelnyxSms({
        to: proPhone,
        text: `New booking — ${short}`,
      })
    );
  }

  if (p.clientPhone && toE164(p.clientPhone)) {
    const st = await sendTelnyxSms({
      to: p.clientPhone,
      text: `Booking requested — ${short}. Your pro will confirm soon.`,
    });
    results.push(st);
    clientSent = st === "sent";
  }

  if (!results.length) return { status: "skipped", clientSent: false };
  return { status: aggregate(results), clientSent };
}
