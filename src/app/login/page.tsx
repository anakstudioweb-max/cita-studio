"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || t.errorGeneric;
        setError(msg);
        toast(msg, "error");
        return;
      }
      toast("Signed in");
      router.push(data.redirect || "/pro");
    } catch {
      setError(t.errorGeneric);
      toast(t.errorGeneric, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pt-8">
      <div>
        <h1 className="heading-display text-3xl">{t.login}</h1>
        <p className="mt-2 text-sm text-[var(--taupe)]">{t.sub}</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-5">
        <label className="block text-sm font-medium">
          {t.email}
          <span className="ml-1 font-normal text-[var(--muted)]">
            (admin or user)
          </span>
          <input
            className="input mt-1.5"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="block text-sm font-medium">
          {t.password}
          <input
            className="input mt-1.5"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t.loading : t.login}
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full opacity-60"
          disabled
          title={t.googleOauthNote}
        >
          Google — {t.googleOauthNote}
        </button>
      </form>
      <p className="text-sm text-[var(--taupe)]">
        {t.noAccount}{" "}
        <Link className="font-medium text-[var(--ink)] underline underline-offset-4" href="/signup">
          {t.signup}
        </Link>
      </p>
    </div>
  );
}
