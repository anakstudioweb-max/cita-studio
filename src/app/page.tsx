import Link from "next/link";
import {
  siteConfig,
  services,
  formatPrice,
  formatDuration,
  weeklyAvailability,
  dayNames,
} from "@/data/site";

export default function HomePage() {
  const featured = services.filter((s) => s.featured);

  const hoursSummary = weeklyAvailability
    .map((a) => dayNames[a.day])
    .join(", ");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sand via-cream to-blush/20" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blush/25 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-rose/15 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose">
            Pestañas &amp; cejas
          </p>
          <h1 className="mt-3 max-w-xl font-display text-4xl leading-tight text-charcoal sm:text-5xl md:text-6xl">
            {siteConfig.name}
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">
            {siteConfig.tagline}. Reserva en línea en pocos pasos, sin apps de terceros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/agendar"
              className="rounded-full bg-rose px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-blush-dark"
            >
              Agendar cita
            </Link>
            <Link
              href="/servicios"
              className="rounded-full border border-blush/60 bg-white/60 px-6 py-3 text-sm font-medium text-charcoal transition hover:bg-sand"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-sand sm:p-10">
          <h2 className="font-display text-2xl text-charcoal sm:text-3xl">Sobre el estudio</h2>
          <p className="mt-4 max-w-2xl text-muted leading-relaxed">{siteConfig.about}</p>
          <p className="mt-4 text-sm text-muted">
            Horario: {hoursSummary} · {weeklyAvailability[0]?.open}–{weeklyAvailability[0]?.close}
          </p>
        </div>
      </section>

      {/* Featured services */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-charcoal sm:text-3xl">
              Servicios destacados
            </h2>
            <p className="mt-1 text-sm text-muted">Lo más pedido por nuestras clientas</p>
          </div>
          <Link href="/servicios" className="hidden text-sm font-medium text-rose hover:underline sm:block">
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featured.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-sand bg-white/80 p-5 shadow-sm transition hover:border-blush/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-charcoal">{s.name}</h3>
                <span className="shrink-0 rounded-full bg-blush/20 px-2.5 py-0.5 text-sm font-semibold text-rose">
                  {formatPrice(s.price)}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{s.description}</p>
              <p className="mt-3 text-xs text-muted">{formatDuration(s.durationMinutes)}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link href="/servicios" className="text-sm font-medium text-rose">
            Ver todos los servicios →
          </Link>
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/agendar"
            className="inline-flex rounded-full bg-charcoal px-7 py-3 text-sm font-medium text-cream transition hover:bg-charcoal/90"
          >
            Reservar ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
