import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation";
import { getServiceById } from "@/data/site";
import { getAvailableSlots } from "@/lib/slots";
import { saveBooking, getUpcomingBookings } from "@/lib/bookings";
import { addMinutes } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD || "demo123";
  if (auth !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const bookings = await getUpcomingBookings();
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const service = getServiceById(data.serviceId);
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const slots = await getAvailableSlots(data.serviceId, data.date);
  const match = slots.find((s) => s.startTime === data.startTime);
  if (!match) {
    return NextResponse.json(
      { error: "Ese horario ya no está disponible. Elige otro." },
      { status: 409 }
    );
  }

  const endTime = addMinutes(data.startTime, service.durationMinutes);

  const booking: Booking = {
    id: randomUUID(),
    serviceId: service.id,
    serviceName: service.name,
    date: data.date,
    startTime: data.startTime,
    endTime,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    notes: data.notes || undefined,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  await saveBooking(booking);

  return NextResponse.json({ booking }, { status: 201 });
}
