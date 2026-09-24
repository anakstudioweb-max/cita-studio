"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/utils";
import { ProAppointments } from "@/components/ProAppointments";

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
  catalogServiceId?: string | null;
  photoUrl?: string | null;
};

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  basePriceCents: number;
  photoUrl?: string | null;
};

const emptyDraft = {
  name: "",
  description: "",
  durationMin: 60,
  priceCents: 5000,
  visible: true,
  photoUrl: "",
};

export default function ProPanelPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"appointments" | "profile" | "services">(
    "appointments"
  );
  const [pro, setPro] = useState<Pro | null>(null);
  const [services, setServices] = useState<Svc[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const s = await fetch("/api/pro/services").then((r) => r.json());
    setServices(s.services || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const items = (d.services || []).map(
          (c: {
            id: string;
            name: string;
            description: string;
            durationMin: number;
            basePriceCents: number;
            photoUrl?: string | null;
          }) => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            durationMin: c.durationMin,
            basePriceCents: c.basePriceCents,
            photoUrl: c.photoUrl || null,
          })
        );
        setCatalog(items);
      })
      .catch(() => setCatalog([]));
  }, []);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pro || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pro/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pro),
      });
      if (res.ok) toast("Saved");
      else toast(t.errorGeneric, "error");
    } catch {
      toast(t.errorGeneric, "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveService(
    svc: Partial<Svc> & {
      name: string;
      durationMin: number;
      priceCents: number;
    }
  ) {
    const res = await fetch("/api/pro/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: svc.id,
        name: svc.name,
        description: svc.description || "",
        durationMin: svc.durationMin,
        priceCents: svc.priceCents,
        visible: svc.visible ?? true,
        photoUrl: svc.photoUrl || null,
        catalogServiceId: svc.catalogServiceId ?? null,
      }),
    });
    if (!res.ok) {
      toast(t.errorGeneric, "error");
      return false;
    }
    toast(svc.id ? "Saved" : "Service added");
    await load();
    return true;
  }

  async function deleteService(id: string) {
    const res = await fetch(`/api/pro/services?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(t.errorGeneric, "error");
      return;
    }
    if (data.softDeleted) toast(t.hideService);
    else toast("Service deleted");
    await load();
  }

  async function addFreeForm() {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    try {
    const ok = await saveService({
      name: draft.name.trim(),
      description: draft.description,
      durationMin: draft.durationMin,
      priceCents: draft.priceCents,
      visible: draft.visible,
      photoUrl: draft.photoUrl || null,
    });
    if (ok) {
      setDraft(emptyDraft);
      setShowAdd(false);
    }
    } finally {
      setSaving(false);
    }
  }

  async function addFromCatalog(catalogId: string) {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    await saveService({
      name: item.name,
      description: item.description,
      durationMin: item.durationMin,
      priceCents: item.basePriceCents,
      visible: true,
      photoUrl: item.photoUrl || null,
      catalogServiceId: item.id,
    });
  }

  if (!pro) {
    return <p className="pt-10 text-[var(--taupe)]">{t.loading}</p>;
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip">{t.proPanel}</p>
          <h1 className="mt-2 heading-display text-3xl">{pro.name}</h1>
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

      {tab === "appointments" && (
        <ProAppointments locale={locale} />
      )}

      {tab === "profile" && (
        <form className="card grid max-w-xl gap-3 p-3.5" onSubmit={saveProfile}>
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
          <button className="btn btn-primary" disabled={saving}>{saving ? t.loading : t.save}</button>
        </form>
      )}

      {tab === "services" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setShowAdd((v) => !v)}
            >
              {t.addService}
            </button>
            {catalog.length > 0 && (
              <select
                className="input max-w-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addFromCatalog(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">{t.addFromCatalog}</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {money(c.basePriceCents, locale)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {showAdd && (
            <div className="card space-y-3 border-dashed p-3.5">
              <p className="text-sm font-medium">{t.freeFormService}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  placeholder={t.name}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
                <input
                  className="input"
                  placeholder={t.description}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
                <input
                  className="input sm:col-span-2"
                  placeholder={t.photoUrl}
                  value={draft.photoUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, photoUrl: e.target.value }))
                  }
                />
                <input
                  className="input"
                  type="number"
                  placeholder={t.duration}
                  value={draft.durationMin}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      durationMin: Number(e.target.value),
                    }))
                  }
                />
                <input
                  className="input"
                  type="number"
                  placeholder="$"
                  value={draft.priceCents / 100}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priceCents: Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.visible}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, visible: e.target.checked }))
                  }
                />
                {t.visible}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving}
                  onClick={addFreeForm}
                >
                  {saving ? t.loading : t.add}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setDraft(emptyDraft);
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {services.map((s) => (
            <div key={s.id} className="card grid gap-2 p-3.5 sm:grid-cols-2">
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
                className="input sm:col-span-2"
                placeholder={t.photoUrl}
                value={s.photoUrl || ""}
                onChange={(e) =>
                  setServices((all) =>
                    all.map((x) =>
                      x.id === s.id
                        ? { ...x, photoUrl: e.target.value }
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
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost"
                  onClick={() => saveService(s)}
                >
                  {t.save}
                </button>
                <button
                  className="btn btn-ghost text-red-800"
                  onClick={() => deleteService(s.id)}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}

          {!services.length && !showAdd && (
            <p className="empty-state">{t.noProServices}</p>
          )}
        </div>
      )}
    </div>
  );
}
