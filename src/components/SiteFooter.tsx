"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n/context";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[var(--line)] py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-sm text-sm text-[var(--taupe)]">{t.footerTag}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
          <Link
            className="min-h-10 inline-flex items-center text-[var(--taupe)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
            href="/privacy"
          >
            {t.privacy}
          </Link>
          <Link
            className="min-h-10 inline-flex items-center text-[var(--taupe)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
            href="/terms"
          >
            {t.terms}
          </Link>
          <Link
            className="min-h-10 inline-flex items-center text-[var(--taupe)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
            href="/contact"
          >
            {t.contact}
          </Link>
          <Link
            className="min-h-10 inline-flex items-center text-[var(--taupe)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
            href="/login"
          >
            {t.login}
          </Link>
          <Link
            className="min-h-10 inline-flex items-center text-[var(--taupe)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
            href="/signup"
          >
            {t.signup}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
