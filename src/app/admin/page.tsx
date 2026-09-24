"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loginRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!loginRes.ok) {
        const data = await loginRes.json();
        throw new Error(data.error || "Contraseña incorrecta");
      }

      const res = await fetch("/api/bookings", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No autorizado");
      setBookings(data.bookings || []);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No autorizado");
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl text-charcoal">Admin</h1>
        <p className="mt-2 text-sm text-muted">
          Acceso con contraseña (variable <code className="text-xs">ADMIN_PASSWORD</code>).
        </p>
        <form onSubmit={login} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-rose">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-charcoal py-2.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-charcoal">Próximas citas</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full border border-sand px-4 py-1.5 text-sm text-muted hover:bg-sand"
        >
          Actualizar
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-rose">{error}</p>}

      {loading && <p className="mt-6 text-sm text-muted">Cargando…</p>}

      {!loading && bookings.length === 0 && (
        <p className="mt-8 rounded-2xl bg-sand/50 p-6 text-sm text-muted">
          No hay citas próximas. Cuando alguien reserve en /agendar, aparecerán aquí.
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="rounded-2xl border border-sand bg-white/80 p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-charcoal">{b.serviceName}</p>
                <p className="mt-1 text-sm text-muted">
                  {b.date} · {b.startTime}–{b.endTime}
                </p>
              </div>
              <span className="rounded-full bg-blush/20 px-2.5 py-0.5 text-xs font-medium text-rose">
                {b.status === "confirmed" ? "Confirmada" : b.status}
              </span>
            </div>
            <div className="mt-3 text-sm text-charcoal">
              <p>{b.customerName}</p>
              <p className="text-muted">
                {b.customerPhone} · {b.customerEmail}
              </p>
              {b.notes && <p className="mt-2 text-muted italic">“{b.notes}”</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
