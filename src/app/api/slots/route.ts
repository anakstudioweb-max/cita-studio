import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";
import { getServiceById } from "@/data/site";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!serviceId || !date) {
    return NextResponse.json(
      { error: "Faltan serviceId o date" },
      { status: 400 }
    );
  }

  if (!getServiceById(serviceId)) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const slots = await getAvailableSlots(serviceId, date);
  return NextResponse.json({ slots });
}
