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

export type EmailRole = "professional" | "owner" | "client";

function moneyUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type DetailRow = { label: string; value: string };

function detailRows(p: BookingNotifyPayload, role: EmailRole): DetailRow[] {
  const rows: DetailRow[] = [
    { label: "Ref", value: p.refCode },
    { label: "Service", value: p.serviceName },
    { label: "When", value: `${p.whenLabel} (Houston)` },
    { label: "Place", value: p.place },
    { label: "Price", value: moneyUsd(p.priceCents) },
  ];

  if (role === "owner" || role === "client") {
    rows.push({ label: "Professional", value: p.professionalName });
  }

  if (role === "professional" || role === "owner") {
    rows.push({ label: "Client", value: p.clientName });
    rows.push({ label: "Phone", value: p.clientPhone });
    if (p.clientEmail?.trim()) {
      rows.push({ label: "Email", value: p.clientEmail.trim() });
    }
  }

  if (p.notes?.trim()) {
    rows.push({ label: "Notes", value: p.notes.trim() });
  }

  return rows;
}

function plainTextBody(p: BookingNotifyPayload, role: EmailRole): string {
  return detailRows(p, role)
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");
}

/** Build Apple-clean HTML + plain text for a booking email role. */
export function buildBookingEmail(
  p: BookingNotifyPayload,
  role: EmailRole
): { subject: string; html: string; text: string } {
  const rows = detailRows(p, role);
  let subject: string;
  let h1: string;
  let subtitle: string;
  let intro = "";

  if (role === "professional") {
    subject = `New booking · ${p.refCode} · ${p.serviceName}`;
    h1 = "New booking";
    subtitle = "A client just requested an appointment with you.";
    intro = `<strong>${escapeHtml(p.clientName)}</strong> · ${escapeHtml(p.clientPhone)} · ${escapeHtml(p.whenLabel)} (Houston)`;
  } else if (role === "owner") {
    subject = `Booking · ${p.refCode} · ${p.professionalName}`;
    h1 = "Marketplace booking";
    subtitle = "New booking on Anak.Studio.";
    intro = `<strong>${escapeHtml(p.professionalName)}</strong> with <strong>${escapeHtml(p.clientName)}</strong>`;
  } else {
    subject = `You're booked · ${p.refCode}`;
    h1 = "Request received";
    subtitle = "Thanks — your booking request is in.";
    intro = `Hi ${escapeHtml(p.clientName)}, your professional will confirm soon.`;
  }

  const rowHtml = rows
    .map(
      (r, i) => `
            <tr>
              <td style="padding:12px 0;${i < rows.length - 1 ? "border-bottom:1px solid #e8e8ed;" : ""}vertical-align:top;width:120px;font-size:13px;line-height:1.4;color:#6e6e73;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${escapeHtml(r.label)}
              </td>
              <td style="padding:12px 0;${i < rows.length - 1 ? "border-bottom:1px solid #e8e8ed;" : ""}vertical-align:top;font-size:15px;line-height:1.4;color:#1d1d1f;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${escapeHtml(r.value)}
              </td>
            </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <div style="font-size:17px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f;">Anak.Studio</div>
              <div style="margin-top:4px;font-size:12px;color:#6e6e73;letter-spacing:0.01em;">Houston lashes &amp; brows</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.03em;color:#1d1d1f;">${escapeHtml(h1)}</h1>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.45;color:#6e6e73;">${escapeHtml(subtitle)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:15px;line-height:1.5;color:#1d1d1f;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rowHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <div style="border-top:1px solid #e8e8ed;padding-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6e6e73;">Anak.Studio · Houston lashes &amp; brows</p>
                <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6e6e73;">Questions? Reply to this email or WhatsApp your professional.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  let textLead: string;
  if (role === "professional") {
    textLead = `New booking for ${p.professionalName}.\nClient: ${p.clientName} · ${p.clientPhone}\n`;
  } else if (role === "owner") {
    textLead = `Marketplace booking.\nPro: ${p.professionalName}\nClient: ${p.clientName}\n`;
  } else {
    textLead = `Hi ${p.clientName} — your booking request was received. Your professional will confirm soon.\n`;
  }

  const text = `${textLead}\n${plainTextBody(p, role)}\n\nAnak.Studio · Houston lashes & brows\nQuestions? Reply to this email or WhatsApp your professional.`;

  return { subject, html, text };
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
  html: string;
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
        html: opts.html,
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
 * HTML + plain text via Resend. No-ops cleanly when Resend env is unset.
 */
export async function sendBookingEmails(
  p: BookingNotifyPayload
): Promise<{ status: NotifyStatus; clientSent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { status: "skipped", clientSent: false };
  }

  const results: NotifyStatus[] = [];
  let clientSent = false;

  if (p.professionalEmail?.includes("@")) {
    const mail = buildBookingEmail(p, "professional");
    results.push(
      await sendResendEmail({
        to: p.professionalEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })
    );
  }

  const ownerEmail = resolveOwnerEmail(p);
  if (ownerEmail) {
    const mail = buildBookingEmail(p, "owner");
    results.push(
      await sendResendEmail({
        to: ownerEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })
    );
  }

  const clientEmail = p.clientEmail?.trim();
  if (clientEmail?.includes("@")) {
    const mail = buildBookingEmail(p, "client");
    const st = await sendResendEmail({
      to: clientEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
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
