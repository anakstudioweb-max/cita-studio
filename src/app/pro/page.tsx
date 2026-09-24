"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/utils";

type Pro = {
  id: string;
  name: string;
  bio: string;
  city: string;
  address: string;
  whatsapp: string;
  instagram: string;
  photoUrl: string;
  status: string;
  paidUntil: string | null;
  hoursJson: { start: string; end: string };
  closedDaysJson: number[];
};

type Svc = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  visible: boolean;
};

type Booking = {
  id: string;
  refCode: string;
  clientName: string;
  clientPhone: string;
  startAt: string;
  priceCents: number;
  status: "requested" | "confirmed" | "done" | "cancelled";
  serviceName?: string;
  notes?: string;
};

export default function ProPanelPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<"appointments" | "profile" | "services">(
    "appointments"
  );
  const [pro, setPro] = useState<Pro | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totals, setTotals] = useState({
    requested: 0,
    confirmed: 0,
    done: 0,
    cancelled: 0,
  });
  const [services, setServices] = useState<Svc[]>([]);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    if (me.user.role === "owner") {
      router.push("/admin");
      return;
    }
    setPro(me.professional);
    const b = await fetch(`/api/pro/bookings?month=${month}`).then((r) =>
      r.json()
    );
    setBookings(b.bookings || []);
    setTotals(b.totals || totals);
    const s = await fetch("/api/pro/services").then((r) => r.json());
    setServices(s.services || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const dayList = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [bookings]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pro) return;
    const res = await fetch("/api/pro/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pro),
    });
    if (res.ok) setMsg("Saved");
  }

  async function saveService(svc: Svc) {
    await fetch("/api/pro/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(svc),
    });
    setMsg("Saved");
    load();
  }

  async function updateBooking(
    id: string,
    patch: { status?: Booking["status"]; priceCents?: number }
  ) {
    await fetch("/api/pro/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    load();
  }

  if (!pro) {
    return <p className="pt-10 text-[var(--taupe)]">{t.loading}</p>;
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip">{t.proPanel}</p>
          <h1 className="mt-2 font-serif text-4xl">{pro.name}</h1>
          <p className="text-sm text-[var(--taupe)]">
            {pro.status} · {t.paidUntil}: {pro.paidUntil || "—"}
          </p>
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

      <div className="flex flex-wrap gap-2">
        {(["appointments", "profile", "services"] as const).map((k) => (
          <button
            key={k}
            className={`tap rounded-full px-4 py-2 text-sm ${
              tab === k
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "border border-[var(--line)]"
            }`}
            onClick={() => setTab(k)}
          >
            {k === "appointments"
              ? t.appointments
              : k === "profile"
                ? t.profile
                : t.services}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-[var(--blush)]">{msg}</p>}

      {tab === "appointments" && (
        <div className="space-y-4">
          <label className="text-sm">
            Month
            <input
              className="input mt-1 max-w-xs"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["requested", t.requested],
                ["confirmed", t.confirmedStatus],
                ["done", t.done],
                ["cancelled", t.cancelled],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="card p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-1 font-serif text-2xl">
                  {money(totals[k], locale)}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {dayList.map((b) => (
              <div key={b.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-serif text-xl">{b.refCode}</p>
                    <p className="text-sm text-[var(--taupe)]">
                      {b.serviceName} · {b.clientName} · {b.clientPhone}
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
                      updateBooking(b.id, {
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
                      updateBooking(b.id, {
                        priceCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {!dayList.length && (
              <p className="text-[var(--taupe)]">No appointments this month.</p>
            )}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <form className="card grid max-w-xl gap-3 p-5" onSubmit={saveProfile}>
          {(
            [
              ["name", t.name],
              ["bio", t.bio],
              ["city", t.city],
              ["address", t.address],
              ["whatsapp", t.whatsapp],
              ["instagram", t.instagram],
              ["photoUrl", t.photoUrl],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              {key === "bio" ? (
                <textarea
                  className="input mt-1 min-h-[5rem]"
                  value={pro[key]}
                  onChange={(e) => setPro({ ...pro, [key]: e.target.value })}
                />
              ) : (
                <input
                  className="input mt-1"
                  value={pro[key] || ""}
                  onChange={(e) => setPro({ ...pro, [key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              {t.hours} start
              <input
                className="input mt-1"
                value={pro.hoursJson?.start || "10:00"}
                onChange={(e) =>
                  setPro({
                    ...pro,
                    hoursJson: { ...pro.hoursJson, start: e.target.value },
                  })
                }
              />
            </label>
            <label className="text-sm">
              {t.hours} end
              <input
                className="input mt-1"
                value={pro.hoursJson?.end || "19:00"}
                onChange={(e) =>
                  setPro({
                    ...pro,
                    hoursJson: { ...pro.hoursJson, end: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <label className="text-sm">
            {t.closedDays} (0=Sun … 6=Sat, comma-separated)
            <input
              className="input mt-1"
              value={(pro.closedDaysJson || []).join(",")}
              onChange={(e) =>
                setPro({
                  ...pro,
                  closedDaysJson: e.target.value
                    .split(",")
                    .map((x) => parseInt(x.trim(), 10))
                    .filter((n) => !Number.isNaN(n)),
                })
              }
            />
          </label>
          <button className="btn btn-primary">{t.save}</button>
        </form>
      )}

      {tab === "services" && (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="card grid gap-2 p-4 sm:grid-cols-2">
              <input
                className="input"
                value={s.name}
                onChange={(e) =>
                  setServices((all) =>
                    all.map((x) =>
                      x.id === s.id ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <input
                className="input"
                value={s.description}
                onChange={(e) =>
                  setServices((all) =>
                    all.map((x) =>
                      x.id === s.id
                        ? { ...x, description: e.target.value }
                        : x
                    )
                  )
                }
              />
              <input
                className="input"
                type="number"
                value={s.durationMin}
                onChange={(e) =>
                  setServices((all) =>
                    all.map((x) =>
                      x.id === s.id
                        ? { ...x, durationMin: Number(e.target.value) }
                        : x
                    )
                  )
                }
              />
              <input
                className="input"
                type="number"
                value={s.priceCents / 100}
                onChange={(e) =>
                  setServices((all) =>
                    all.map((x) =>
                      x.id === s.id
                        ? {
                            ...x,
                            priceCents: Math.round(Number(e.target.value) * 100),
                          }
                        : x
                    )
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.visible}
                  onChange={(e) =>
                    setServices((all) =>
                      all.map((x) =>
                        x.id === s.id
                          ? { ...x, visible: e.target.checked }
                          : x
                      )
                    )
                  }
                />
                {t.visible}
              </label>
              <button
                className="btn btn-ghost"
                onClick={() => saveService(s)}
              >
                {t.save}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
