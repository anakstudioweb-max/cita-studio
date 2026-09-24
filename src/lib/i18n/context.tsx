"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  dictionaries,
  resolveLocale,
  type Dict,
  type Locale,
  LOCALES,
} from "./dictionaries";

const STORAGE_KEY = "anak_locale";

type Ctx = {
  locale: "en" | "es" | "pt" | "fr";
  preference: Locale;
  t: Dict;
  setPreference: (l: Locale) => void;
  locales: typeof LOCALES;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  children,
  acceptLanguage,
}: {
  children: React.ReactNode;
  acceptLanguage?: string;
}) {
  const [preference, setPref] = useState<Locale>("device");
  const [locale, setLocale] = useState<"en" | "es" | "pt" | "fr">("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const pref = stored || "device";
    setPref(pref);
    setLocale(
      resolveLocale(pref, acceptLanguage, navigator.language)
    );
  }, [acceptLanguage]);

  const setPreference = useCallback(
    (l: Locale) => {
      localStorage.setItem(STORAGE_KEY, l);
      setPref(l);
      setLocale(resolveLocale(l, acceptLanguage, navigator.language));
    },
    [acceptLanguage]
  );

  const value = useMemo(
    () => ({
      locale,
      preference,
      t: dictionaries[locale],
      setPreference,
      locales: LOCALES,
    }),
    [locale, preference, setPreference]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
