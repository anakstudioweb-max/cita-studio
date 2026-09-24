/** Tipos compartidos — mismos campos que usaría Supabase después */

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string; // ISO
};
