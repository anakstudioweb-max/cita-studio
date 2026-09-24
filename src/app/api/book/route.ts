import { NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { ZodError } from "zod";
import { getDb, hasDatabaseUrl, schema } from "@/lib/db";
import { bookSchema } from "@/lib/validation";
import { localToUtc } from "@/lib/slots";
import {
  formatHouston,
  genRefCode,
  isProPubliclyVisible,
  whatsappLink,
} from "@/lib/utils";
import { sendBookingEmails, sendBookingSms } from "@/lib/notify";

export async function POST(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL is not configured. Set a Postgres/Supabase connection string to enable bookings.",
      },
      { status: 503 }
    );
  }

  try {
    const body = bookSchema.parse(await req.json());
    const db = getDb();

    const [pro] = await db
      .select()
      .from(schema.professionals)
      .where(eq(schema.professionals.id, body.professionalId))
      .limit(1);
    if (!pro || !isProPubliclyVisible(pro)) {
      return NextResponse.json({ error: "Professional not available" }, { status: 404 });
    }

    const closed = (pro.closedDaysJson as number[]) || [0, 1];
    const [Y, M, D] = body.date.split("-").map(Number);
    const dow = new Date(Date.UTC(Y, M - 1, D, 12)).getUTCDay();
    if (closed.includes(dow)) {
      return NextResponse.json({ error: "Studio closed that day" }, { status: 400 });
    }

    const serviceIds = body.professionalServiceIds;
    const svcRows = await db
      .select()
      .from(schema.professionalServices)
      .where(inArray(schema.professionalServices.id, serviceIds));

    const byId = new Map(svcRows.map((s) => [s.id, s]));
    const ordered = serviceIds.map((id) => byId.get(id)).filter(Boolean) as typeof svcRows;
    if (ordered.length !== serviceIds.length) {
      return NextResponse.json({ error: "Service not available" }, { status: 404 });
    }
    for (const svc of ordered) {
      if (svc.professionalId !== pro.id || !svc.visible) {
        return NextResponse.json({ error: "Service not available" }, { status: 404 });
      }
    }

    const durationMin = ordered.reduce((sum, s) => sum + s.durationMin, 0);
    const priceCents = ordered.reduce((sum, s) => sum + s.priceCents, 0);
    const serviceNames = ordered.map((s) => s.name).join(" · ");
    const primarySvc = ordered[0]!;

    const startAt = localToUtc(body.date, body.time);
    const endAt = addMinutes(startAt, durationMin);
    if (startAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Slot is in the past" }, { status: 400 });
    }

    const overlaps = await db
      .select()
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.professionalId, pro.id),
          ne(schema.bookings.status, "cancelled"),
          isNull(schema.bookings.deletedAt),
          lt(schema.bookings.startAt, endAt),
          gt(schema.bookings.endAt, startAt)
        )
      );
    if (overlaps.length) {
      return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
    }

    let refCode = genRefCode();
    for (let i = 0; i < 5; i++) {
      const clash = await db
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.refCode, refCode))
        .limit(1);
      if (!clash.length) break;
      refCode = genRefCode();
    }

    // bookSchema already normalized phone to E.164 (+1…) and validated email
    const clientPhone = body.clientPhone;
    const clientEmail = body.clientEmail || "";

    try {
      const [booking] = await db
        .insert(schema.bookings)
        .values({
          refCode,
          professionalId: pro.id,
          professionalServiceId: primarySvc.id,
          serviceIds,
          serviceNames,
          clientName: body.clientName.trim(),
          clientPhone,
          clientEmail,
          notes: body.notes || "",
          startAt,
          endAt,
          priceCents,
          status: "requested",
        })
        .returning();

      const when = formatHouston(startAt, "EEEE, MMM d, yyyy · h:mm a");
      const msg =
        `Hi ${pro.name}, I'd like to confirm my Anak.Studio booking.\n` +
        `Client: ${booking.clientName} · ${booking.clientPhone}\n` +
        `Service: ${serviceNames}\n` +
        `When: ${when} (Houston)\n` +
        `Duration: ${durationMin} min\n` +
        `Place: ${pro.address}\n` +
        `Price: $${(priceCents / 100).toFixed(0)}` +
        (booking.notes ? `\nNotes: ${booking.notes}` : "");

      const wa = whatsappLink(pro.whatsapp, msg);

      // Resolve pro login email + first owner for notifications
      const [proUser] = await db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, pro.userId))
        .limit(1);
      const [ownerUser] = await db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.role, "owner"))
        .limit(1);

      const notifyPayload = {
        refCode: booking.refCode,
        serviceName: serviceNames,
        whenLabel: when,
        place: pro.address || `${pro.city}`,
        priceCents: booking.priceCents,
        durationMin,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        clientEmail: clientEmail || undefined,
        professionalName: pro.name,
        professionalEmail: proUser?.email ?? null,
        professionalPhone: pro.whatsapp || null,
        ownerEmail: ownerUser?.email ?? null,
        notes: booking.notes || undefined,
      };

      let emailStatus: "sent" | "skipped" | "failed" = "skipped";
      let smsStatus: "sent" | "skipped" | "failed" = "skipped";
      let clientEmailSent = false;
      let clientEmailStatus: "sent" | "skipped" | "failed" = "skipped";
      let clientSmsSent = false;

      try {
        const emailResult = await sendBookingEmails(notifyPayload);
        emailStatus = emailResult.status;
        clientEmailSent = emailResult.clientSent;
        clientEmailStatus = emailResult.clientStatus;
        if (
          clientEmail &&
          clientEmail.includes("@") &&
          clientEmailStatus === "failed"
        ) {
          console.error("Client confirmation email failed", {
            ref: booking.refCode,
            clientStatus: clientEmailStatus,
          });
        }
      } catch (err) {
        console.error(
          "sendBookingEmails threw",
          err instanceof Error ? err.message : "unknown"
        );
        emailStatus = "failed";
        if (clientEmail && clientEmail.includes("@")) {
          clientEmailStatus = "failed";
        }
      }

      // Telnyx outbound SMS is disabled — always skipped (copy-paste in emails).
      try {
        const smsResult = await sendBookingSms(notifyPayload);
        smsStatus = smsResult.status;
        clientSmsSent = smsResult.clientSent;
      } catch (err) {
        console.error(
          "sendBookingSms threw",
          err instanceof Error ? err.message : "unknown"
        );
        smsStatus = "skipped";
      }

      return NextResponse.json({
        ok: true,
        booking: {
          refCode: booking.refCode,
          date: body.date,
          time: body.time,
          whenLabel: when,
          place: pro.address,
          city: pro.city,
          priceCents: booking.priceCents,
          professionalName: pro.name,
          serviceName: serviceNames,
          serviceNames,
          durationMin,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          whatsappUrl: wa,
          message: msg,
        },
        notifications: {
          email: emailStatus,
          sms: smsStatus,
          clientEmailSent,
          clientEmail: clientEmailStatus,
          clientSmsSent,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("bookings_pro_start_unique") || msg.includes("unique")) {
        return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
      }
      throw err;
    }
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      const field = first?.path?.join(".") || "";
      const message =
        first?.message ||
        (field === "clientPhone"
          ? "Enter a valid US phone number (10 digits, +1)"
          : field === "clientEmail"
            ? "Enter a valid email address"
            : field.includes("professionalService")
              ? "Select at least one service"
              : "Invalid booking details");
      return NextResponse.json(
        { error: message, field: field || undefined },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Booking failed" }, { status: 400 });
  }
}
