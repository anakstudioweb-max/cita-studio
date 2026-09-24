"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";

export default function SignupPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Houston");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || t.errorGeneric;
        setError(msg);
        toast(msg, "error");
        return;
      }
      toast("Account created");
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
      <h1 className="heading-display text-3xl">{t.signup}</h1>
      <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-5">
        <label className="block text-sm font-medium">
          {t.name}
          <input
            className="input mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          {t.email}
          <input
            className="input mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          {t.city}
          <input
            className="input mt-1.5"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          {t.password}
          <input
            className="input mt-1.5"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t.loading : t.createAccount}
        </button>
      </form>
      <p className="text-sm text-[var(--taupe)]">
        {t.alreadyHave}{" "}
        <Link className="font-medium text-[var(--ink)] underline underline-offset-4" href="/login">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
