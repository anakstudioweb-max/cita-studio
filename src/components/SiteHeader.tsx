"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionaries";

export function SiteHeader() {
  const { t, preference, setPreference, locales } = useI18n();

  return (
    <header className="sticky top-0 z-40 -mx-4 border-b border-[var(--line)] bg-white/80 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center justify-between gap-3 py-3 sm:py-3.5">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="lang">
            {t.language}
          </label>
          <select
            id="lang"
            className="min-h-10 max-w-[9.5rem] rounded-[12px] border border-[var(--line)] bg-transparent px-3 text-sm text-[var(--ink)] sm:max-w-none"
            value={preference}
            onChange={(e) => setPreference(e.target.value as Locale)}
          >
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-[980px] border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] sm:inline-flex"
          >
            {t.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
