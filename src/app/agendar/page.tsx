import type { Metadata } from "next";
import { BookingWizard } from "@/components/BookingWizard";
import { services } from "@/data/site";

export const metadata: Metadata = {
  title: "Agendar",
};

type Props = {
  searchParams: Promise<{ service?: string }>;
};

export default async function AgendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialService =
    params.service && services.some((s) => s.id === params.service)
      ? params.service
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-charcoal sm:text-4xl">Agendar cita</h1>
      <p className="mt-3 text-muted">
        Elige el servicio, la fecha y un horario libre. Recibirás confirmación al instante.
      </p>
      <div className="mt-8">
        <BookingWizard initialServiceId={initialService} />
      </div>
    </div>
  );
}
