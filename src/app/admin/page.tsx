"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/utils";

type Pro = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "paused" | "expired";
  paidUntil: string | null;
  city: string;
  address: string;
  whatsapp: string;
  bio: string;
};

type Booking = {
  id: string;
  refCode: string;
  professionalId: string;
  professionalName?: string;
  serviceName?: string;
  clientName: string;
  startAt: string;
  priceCents: number;
  status: "requested" | "confirmed" | "done" | "cancelled";
};

export default function AdminPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pros, setPros] = useState<Pro[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterPro, setFilterPro] = useState("");
  const [tab, setTab] = useState<"pros" | "bookings">("pros");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    if (me.user.role !== "owner") {
      router.push("/pro");
      return;
    }
    const p = await fetch("/api/admin/professionals").then((r) => r.json());
    setPros(p.professionals || []);
    const q = filterPro ? `?professionalId=${filterPro}` : "";
    const b = await fetch(`/api/admin/bookings${q}`).then((r) => r.json());
    setBookings(b.bookings || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPro]);

  async function patchPro(id: string, patch: Partial<Pro>) {
    await fetch("/api/admin/professionals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setMsg("Updated");
    load();
  }

  async function removePro(id: string) {
    if (!confirm("Remove professional and cascade bookings?")) return;
    await fetch(`/api/admin/professionals?id=${id}`, { method: "DELETE" });
    load();
  }

  async function patchBooking(
    id: string,
    patch: { status?: Booking["status"]; priceCents?: number }
  ) {
    await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    load();
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip">{t.admin}</p>
          <h1 className="mt-2 font-serif text-4xl">Anak.Studio</h1>
        </div>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
        >
          {t.logout}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          className={`tap rounded-full px-4 py-2 text-sm ${
            tab === "pros"
              ? "bg-[var(--ink)] text-[var(--ivory)]"
              : "border border-[var(--line)]"
          }`}
          onClick={() => setTab("pros")}
        >
          {t.allPros}
        </button>
        <button
          className={`tap rounded-full px-4 py-2 text-sm ${
            tab === "bookings"
              ? "bg-[var(--ink)] text-[var(--ivory)]"
              : "border border-[var(--line)]"
          }`}
          onClick={() => setTab("bookings")}
        >
          {t.appointments}
        </button>
      </div>
      {msg && <p className="text-sm text-[var(--blush)]">{msg}</p>}

      {tab === "pros" && (
        <div className="space-y-3">
          {pros.map((p) => (
            <div key={p.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-serif text-2xl">{p.name}</p>
                  <p className="text-sm text-[var(--taupe)]">
                    {p.email} · {p.city}
                  </p>
                </div>
                <button
                  className="btn btn-ghost text-red-800"
                  onClick={() => removePro(p.id)}
                >
                  {t.removePro}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="input max-w-[10rem]"
                  value={p.status}
                  onChange={(e) =>
                    patchPro(p.id, {
                      status: e.target.value as Pro["status"],
                    })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                </select>
                <input
                  className="input max-w-[12rem]"
                  type="date"
                  value={p.paidUntil || ""}
                  onChange={(e) =>
                    patchPro(p.id, { paidUntil: e.target.value || null })
                  }
                />
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    patchPro(p.id, {
                      status: p.status === "active" ? "paused" : "active",
                      paidUntil:
                        p.status === "active"
                          ? p.paidUntil
                          : p.paidUntil || "2099-12-31",
                    })
                  }
                >
                  {t.toggleAccess}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-4">
          <label className="text-sm">
            {t.filterPro}
            <select
              className="input mt-1 max-w-sm"
              value={filterPro}
              onChange={(e) => setFilterPro(e.target.value)}
            >
              <option value="">All</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {bookings.map((b) => (
            <div key={b.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">{b.refCode}</p>
                  <p className="text-sm text-[var(--taupe)]">
                    {b.professionalName} · {b.serviceName} · {b.clientName}
                  </p>
                  <p className="text-sm">
                    {new Date(b.startAt).toLocaleString("en-US", {
                      timeZone: "America/Chicago",
                    })}
                  </p>
                </div>
                <p className="font-serif text-xl">
                  {money(b.priceCents, locale)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="input max-w-[10rem]"
                  value={b.status}
                  onChange={(e) =>
                    patchBooking(b.id, {
                      status: e.target.value as Booking["status"],
                    })
                  }
                >
                  <option value="requested">{t.requested}</option>
                  <option value="confirmed">{t.confirmedStatus}</option>
                  <option value="done">{t.done}</option>
                  <option value="cancelled">{t.cancelled}</option>
                </select>
                <input
                  className="input max-w-[8rem]"
                  type="number"
                  defaultValue={b.priceCents / 100}
                  onBlur={(e) =>
                    patchBooking(b.id, {
                      priceCents: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
