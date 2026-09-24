import Link from "next/link";
import { siteConfig } from "@/data/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-sand bg-sand/50">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg text-charcoal">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-muted">{siteConfig.tagline}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-charcoal">Navegación</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>
              <Link href="/servicios" className="hover:text-rose">
                Servicios
              </Link>
            </li>
            <li>
              <Link href="/agendar" className="hover:text-rose">
                Agendar
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-rose">
                Contacto
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-charcoal">Contacto</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>{siteConfig.contact.phone}</li>
            <li>{siteConfig.contact.instagram}</li>
            <li>{siteConfig.contact.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand/80 py-4 text-center text-xs text-muted">
        © {year} {siteConfig.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
