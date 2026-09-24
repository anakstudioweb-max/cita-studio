import type { Metadata } from "next";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "Contacto",
};

export default function ContactoPage() {
  const wa = `https://wa.me/${siteConfig.contact.whatsapp}?text=${encodeURIComponent(
    `Hola, me gustaría información sobre ${siteConfig.name}`
  )}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-charcoal sm:text-4xl">Contacto</h1>
      <p className="mt-3 max-w-xl text-muted">
        Escríbenos por WhatsApp o redes. También puedes agendar directamente desde la web.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-sand bg-white/80 p-6 shadow-sm transition hover:border-blush/50 hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-rose">WhatsApp</p>
          <p className="mt-2 text-lg font-medium text-charcoal">{siteConfig.contact.phone}</p>
          <p className="mt-1 text-sm text-muted">Respuesta rápida · toca para abrir el chat</p>
        </a>

        <a
          href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
          className="rounded-2xl border border-sand bg-white/80 p-6 shadow-sm transition hover:border-blush/50 hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-rose">Teléfono</p>
          <p className="mt-2 text-lg font-medium text-charcoal">{siteConfig.contact.phone}</p>
          <p className="mt-1 text-sm text-muted">Llamadas durante horario de atención</p>
        </a>

        <a
          href={siteConfig.contact.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-sand bg-white/80 p-6 shadow-sm transition hover:border-blush/50 hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-rose">Instagram</p>
          <p className="mt-2 text-lg font-medium text-charcoal">{siteConfig.contact.instagram}</p>
          <p className="mt-1 text-sm text-muted">Trabajos recientes e inspiración</p>
        </a>

        <div className="rounded-2xl border border-sand bg-white/80 p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-rose">Correo</p>
          <p className="mt-2 text-lg font-medium text-charcoal">{siteConfig.contact.email}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.contact.address}</p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl bg-sand/60 p-6 text-sm text-muted">
        <p className="font-medium text-charcoal">Nota</p>
        <p className="mt-2 leading-relaxed">
          Los datos de contacto son provisionales. Cámbialos en{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs text-charcoal">
            src/data/site.ts
          </code>
          . Para reservar un horario concreto, usa la página{" "}
          <a href="/agendar" className="font-medium text-rose hover:underline">
            Agendar
          </a>
          .
        </p>
      </div>
    </div>
  );
}
