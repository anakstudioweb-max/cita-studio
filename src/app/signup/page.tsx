"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Houston");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        setError(data.error || t.errorGeneric);
        return;
      }
      router.push(data.redirect || "/pro");
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <h1 className="font-serif text-4xl">{t.signup}</h1>
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <label className="block text-sm">
          {t.name}
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          {t.email}
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          {t.city}
          <input
            className="input mt-1"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          {t.password}
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t.loading : t.createAccount}
        </button>
      </form>
      <p className="text-sm text-[var(--taupe)]">
        {t.alreadyHave}{" "}
        <Link className="underline" href="/login">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
