import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  formatPrice,
  formatDuration,
  type ServiceCategory,
} from "@/data/site";

export const metadata: Metadata = {
  title: "Servicios",
};

const categories: { key: ServiceCategory; label: string }[] = [
  { key: "pestañas", label: "Pestañas" },
  { key: "cejas", label: "Cejas" },
  { key: "combos", label: "Combos" },
];

export default function ServiciosPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 max-w-xl">
        <h1 className="font-display text-3xl text-charcoal sm:text-4xl">Servicios y precios</h1>
        <p className="mt-3 text-muted">
          Todos los tratamientos incluyen consulta breve. Los precios están en USD y son editables
          desde la configuración del sitio.
        </p>
      </div>

      <div className="space-y-12">
        {categories.map((cat) => {
          const items = services.filter((s) => s.category === cat.key);
          if (items.length === 0) return null;
          return (
            <section key={cat.key}>
              <h2 className="mb-4 font-display text-2xl text-rose">{cat.label}</h2>
              <ul className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-white/80 shadow-sm">
                {items.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-charcoal">{s.name}</p>
                      <p className="mt-1 text-sm text-muted">{s.description}</p>
                      <p className="mt-2 text-xs text-muted">
                        Duración: {formatDuration(s.durationMinutes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      <span className="text-lg font-semibold text-charcoal">
                        {formatPrice(s.price)}
                      </span>
                      <Link
                        href={`/agendar?service=${s.id}`}
                        className="rounded-full bg-rose/90 px-4 py-1.5 text-xs font-medium text-white hover:bg-blush-dark"
                      >
                        Agendar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
