"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n/context";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[var(--line)] py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-sm text-base text-[var(--taupe)]">{t.footerTag}</p>
        </div>
        <nav className="flex flex-col gap-3 text-base sm:flex-row sm:flex-wrap sm:gap-6">
          <Link className="min-h-12 inline-flex items-center underline-offset-4 hover:underline" href="/privacy">
            {t.privacy}
          </Link>
          <Link className="min-h-12 inline-flex items-center underline-offset-4 hover:underline" href="/contact">
            {t.contact}
          </Link>
          <Link className="min-h-12 inline-flex items-center underline-offset-4 hover:underline" href="/login">
            {t.login}
          </Link>
          <Link className="min-h-12 inline-flex items-center underline-offset-4 hover:underline" href="/signup">
            {t.signup}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
