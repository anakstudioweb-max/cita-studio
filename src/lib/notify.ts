import { digitsOnly, whatsappLink } from "@/lib/utils";
import {
  applyPlaceholders,
  applyPlaceholdersHtml,
  emailFieldsForRole,
  escapeHtml,
  loadTemplates,
  type PlaceholderVars,
  type TemplateMap,
} from "@/lib/notification-templates";
import { toUsE164 } from "@/lib/phone";

export type NotifyStatus = "sent" | "skipped" | "failed";

export type BookingNotifyPayload = {
  refCode: string;
  serviceName: string;
  whenLabel: string;
  place: string;
  priceCents: number;
  durationMin?: number;
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

function placeholderVars(
  p: BookingNotifyPayload,
  role?: EmailRole
): PlaceholderVars {
  return {
    // Never surface internal refs in client copy (even if a DB template still has {{ref}}).
    ref: role === "client" ? "" : p.refCode,
    service: p.serviceName,
    when: p.whenLabel,
    place: p.place,
    price: moneyUsd(p.priceCents),
    clientName: p.clientName,
    clientPhone: p.clientPhone,
    clientEmail: p.clientEmail?.trim() || "",
    professionalName: p.professionalName,
    notes: p.notes?.trim() || "",
  };
}

type DetailRow = { label: string; value: string };

function detailRows(p: BookingNotifyPayload, role: EmailRole): DetailRow[] {
  // Client emails stay human — no internal ref codes.
  const rows: DetailRow[] = [];
  if (role !== "client") {
    rows.push({ label: "Ref", value: p.refCode });
  }
  rows.push(
    { label: "Service", value: p.serviceName },
    { label: "When", value: `${p.whenLabel} (Houston)` },
    ...(p.durationMin
      ? [{ label: "Duration", value: `${p.durationMin} min` }]
      : []),
    { label: "Place", value: p.place },
    { label: "Price", value: moneyUsd(p.priceCents) }
  );

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

/** Plain SMS/WhatsApp text for staff to copy-paste to the client. */
export function buildClientSmsCopyText(
  p: BookingNotifyPayload,
  templates?: TemplateMap
): string {
  const vars = placeholderVars(p, "client");
  const tpl =
    templates?.sms_client ||
    "Hi {{clientName}}, your Anak.Studio appointment is confirmed. {{service}} on {{when}} (Houston time). See you there!";
  return applyPlaceholders(tpl, vars).trim();
}

function copyPasteSectionHtml(
  p: BookingNotifyPayload,
  templates: TemplateMap
): string {
  const smsText = buildClientSmsCopyText(p, templates);
  const wa = whatsappLink(p.clientPhone, smsText);
  const waBlock = wa
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
         <a href="${escapeHtml(wa)}" style="color:#0071e3;text-decoration:none;">Open WhatsApp to client</a>
         <span style="color:#6e6e73;"> · ${escapeHtml(p.clientPhone)}</span>
       </p>`
    : `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#6e6e73;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
         Client phone: ${escapeHtml(p.clientPhone)}
       </p>`;

  return `
          <tr>
            <td style="padding:8px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <div style="background-color:#f5f5f7;border:1px solid #e8e8ed;border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#1d1d1f;">
                  Copy &amp; paste to text the client
                </p>
                <p style="margin:0 0 10px;font-size:12px;line-height:1.4;color:#6e6e73;">
                  Send this from your personal phone (SMS or WhatsApp). Automatic texts are disabled.
                </p>
                <pre style="margin:0;padding:12px 14px;background:#ffffff;border:1px solid #d2d2d7;border-radius:8px;font-size:13px;line-height:1.45;color:#1d1d1f;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(smsText)}</pre>
                ${waBlock}
              </div>
            </td>
          </tr>`;
}

function copyPasteSectionPlain(
  p: BookingNotifyPayload,
  templates: TemplateMap
): string {
  const smsText = buildClientSmsCopyText(p, templates);
  return `\n---\nCopy & paste to text the client (${p.clientPhone}):\n${smsText}\n---\n`;
}

/** Build Apple-clean HTML + plain text using DB/hardcoded templates. */
export function buildBookingEmailFromTemplates(
  p: BookingNotifyPayload,
  role: EmailRole,
  templates: TemplateMap
): { subject: string; html: string; text: string } {
  const vars = placeholderVars(p, role);
  const fields = emailFieldsForRole(templates, role);
  let subject = applyPlaceholders(fields.subject, vars);
  // Clean leftover separators if {{ref}} was emptied for client.
  if (role === "client") {
    subject = subject
      .replace(/\s*·\s*·/g, " · ")
      .replace(/^\s*·\s*|\s*·\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  const headline = applyPlaceholders(fields.headline, vars);
  const introHtml = applyPlaceholdersHtml(fields.intro, vars);
  const footerNote = applyPlaceholders(fields.footer, vars);
  const rows = detailRows(p, role);
  const includeCopyPaste = role === "professional" || role === "owner";

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

  const copyHtml = includeCopyPaste ? copyPasteSectionHtml(p, templates) : "";

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
              <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.03em;color:#1d1d1f;">${escapeHtml(headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              ${introHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rowHtml}
              </table>
            </td>
          </tr>
          ${copyHtml}
          <tr>
            <td style="padding:24px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              <div style="border-top:1px solid #e8e8ed;padding-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6e6e73;">Anak.Studio · Houston lashes &amp; brows</p>
                <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6e6e73;"><a href="https://bookanakstudio.com" style="color:#6e6e73;text-decoration:underline;">bookanakstudio.com</a></p>
                <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6e6e73;">${escapeHtml(footerNote)}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const introPlain = applyPlaceholders(fields.intro, vars);
  const copyPlain = includeCopyPaste
    ? copyPasteSectionPlain(p, templates)
    : "";
  const text = `${headline}\n\n${introPlain}\n\n${plainTextBody(p, role)}${copyPlain}\n\nAnak.Studio · Houston lashes & brows\nhttps://bookanakstudio.com\n${footerNote}`;

  return { subject, html, text };
}

/** Async wrapper: load templates then build. */
export async function buildBookingEmail(
  p: BookingNotifyPayload,
  role: EmailRole
): Promise<{ subject: string; html: string; text: string }> {
  const templates = await loadTemplates();
  return buildBookingEmailFromTemplates(p, role, templates);
}

/**
 * Normalize to E.164 when possible.
 * Prefers strict US validation; falls back to legacy digit heuristics for
 * non-client numbers (e.g. professional WhatsApp) used only for links.
 */
export function toE164(phone: string): string | null {
  const us = toUsE164(phone);
  if (us) return us;
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

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "(invalid)";
  return `${email[0]}***${email.slice(at)}`;
}

function isResendSandboxFrom(from: string): boolean {
  return /onboarding@resend\.dev/i.test(from);
}

function looksLikeResendSandboxRestriction(status: number, detail: string): boolean {
  const d = detail.toLowerCase();
  return (
    status === 403 ||
    status === 422 ||
    d.includes("only send testing emails") ||
    d.includes("verify a domain") ||
    d.includes("you can only send") ||
    d.includes("testing emails to your own email") ||
    d.includes("domain is not verified")
  );
}

async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  role?: EmailRole;
}): Promise<NotifyStatus> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return "skipped";
  if (!opts.to?.includes("@")) return "skipped";

  const role = opts.role ?? "client";
  const toMasked = maskEmail(opts.to);

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
      const sandbox =
        isResendSandboxFrom(from) ||
        looksLikeResendSandboxRestriction(res.status, detail);
      console.error(
        "Resend email failed",
        {
          role,
          to: toMasked,
          from,
          status: res.status,
          sandboxLikely: sandbox,
          detail: detail.slice(0, 300),
          hint: sandbox
            ? "RESEND_FROM is still onboarding@resend.dev (or domain unverified). Resend only delivers to the account email until you verify a custom domain."
            : undefined,
        }
      );
      return "failed";
    }
    console.info("Resend email sent", { role, to: toMasked });
    return "sent";
  } catch (err) {
    console.error("Resend email error", {
      role,
      to: toMasked,
      message: err instanceof Error ? err.message : "unknown",
    });
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

export type BookingEmailResult = {
  status: NotifyStatus;
  /** True only when Resend accepted the client message. */
  clientSent: boolean;
  /** Per-recipient outcome for the optional client confirmation. */
  clientStatus: NotifyStatus;
};

/**
 * Email professional, owner, and client (if email provided).
 * HTML + plain text via Resend. No-ops cleanly when Resend env is unset.
 * Pro/owner emails include a copy-paste SMS/WhatsApp block for the client.
 *
 * Note: with RESEND_FROM=onboarding@resend.dev (unverified domain), Resend
 * only delivers to the Resend account email. Owner may succeed while client
 * fails — check logs for sandboxLikely and verify a custom domain in Resend.
 */
export async function sendBookingEmails(
  p: BookingNotifyPayload
): Promise<BookingEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { status: "skipped", clientSent: false, clientStatus: "skipped" };
  }

  if (isResendSandboxFrom(from)) {
    console.warn(
      "Resend sandbox FROM detected (onboarding@resend.dev). Client confirmation emails to other inboxes will fail until you verify a domain and set RESEND_FROM to that domain."
    );
  }

  const templates = await loadTemplates();
  const results: NotifyStatus[] = [];
  let clientStatus: NotifyStatus = "skipped";

  if (p.professionalEmail?.includes("@")) {
    const mail = buildBookingEmailFromTemplates(p, "professional", templates);
    results.push(
      await sendResendEmail({
        to: p.professionalEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        role: "professional",
      })
    );
  }

  const ownerEmail = resolveOwnerEmail(p);
  if (ownerEmail) {
    const mail = buildBookingEmailFromTemplates(p, "owner", templates);
    results.push(
      await sendResendEmail({
        to: ownerEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        role: "owner",
      })
    );
  }

  const clientEmail = p.clientEmail?.trim();
  if (clientEmail?.includes("@")) {
    const mail = buildBookingEmailFromTemplates(p, "client", templates);
    clientStatus = await sendResendEmail({
      to: clientEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      role: "client",
    });
    results.push(clientStatus);
  }

  if (!results.length) {
    return { status: "skipped", clientSent: false, clientStatus: "skipped" };
  }
  return {
    status: aggregate(results),
    clientSent: clientStatus === "sent",
    clientStatus,
  };
}


/**
 * Second email to the client when a professional confirms (and optionally
 * reschedules) the appointment. No-ops when client email is missing or Resend unset.
 */
export async function sendBookingConfirmedEmail(
  p: BookingNotifyPayload
): Promise<NotifyStatus> {
  const clientEmail = p.clientEmail?.trim();
  if (!clientEmail?.includes("@")) return "skipped";

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return "skipped";

  const templates = await loadTemplates();
  const confirmedOverlay: TemplateMap = {
    ...templates,
    email_client_subject: templates.email_client_confirmed_subject,
    email_client_headline: templates.email_client_confirmed_headline,
    email_client_intro: templates.email_client_confirmed_intro,
    email_client_footer: templates.email_client_confirmed_footer,
  };
  const mail = buildBookingEmailFromTemplates(p, "client", confirmedOverlay);
  return sendResendEmail({
    to: clientEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    role: "client",
  });
}



/**
 * Email the client when a confirmed appointment's schedule changes.
 * Reuses the confirm email layout with an "updated" overlay. No-ops when
 * client email is missing or Resend is unset.
 */
export async function sendBookingUpdatedEmail(
  p: BookingNotifyPayload
): Promise<NotifyStatus> {
  const clientEmail = p.clientEmail?.trim();
  if (!clientEmail?.includes("@")) return "skipped";

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return "skipped";

  const templates = await loadTemplates();
  const updatedOverlay: TemplateMap = {
    ...templates,
    email_client_subject: "Updated · {{service}}",
    email_client_headline: "Appointment updated",
    email_client_intro:
      "{{professionalName}} updated your appointment.\n\nHi {{clientName}}, here are the new details.",
    email_client_footer:
      templates.email_client_confirmed_footer ||
      "Questions? Reply to this email or WhatsApp your professional.",
  };
  const mail = buildBookingEmailFromTemplates(p, "client", updatedOverlay);
  return sendResendEmail({
    to: clientEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    role: "client",
  });
}

/**
 * Outbound Telnyx SMS is disabled (no 10DLC). Staff text clients manually
 * using the copy-paste block in booking emails.
 * Always returns skipped — does not call Telnyx.
 */
export async function sendBookingSms(
  _p: BookingNotifyPayload
): Promise<{ status: NotifyStatus; clientSent: boolean }> {
  return { status: "skipped", clientSent: false };
}
