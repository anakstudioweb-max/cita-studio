"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/utils";

type CatalogService = {
  id: string;
  category: "lashes" | "brows" | "both";
  name: string;
  description: string;
  durationMin: number;
  basePriceCents: number;
};

type ProService = {
  id: string;
  professionalId: string;
  catalogServiceId: string | null;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  visible: boolean;
};

type Pro = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "paused" | "expired";
  paidUntil: string | null;
  city: string;
  address: string;
  whatsapp: string;
  instagram: string;
  photoUrl: string;
  bio: string;
  categories: "lashes" | "brows" | "both";
  hoursJson: { start: string; end: string };
  closedDaysJson: number[];
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

type Tab = "services" | "pros" | "bookings";

const emptyCatalogForm = {
  id: "" as string | undefined,
  category: "lashes" as "lashes" | "brows",
  name: "",
  description: "",
  durationMin: 60,
  basePriceCents: 5000,
};

const emptyCreatePro = {
  email: "",
  password: "",
  name: "",
  city: "Houston",
};

export default function AdminPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pros, setPros] = useState<Pro[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [filterPro, setFilterPro] = useState("");
  const [tab, setTab] = useState<Tab>("services");
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedPro, setExpandedPro] = useState<string | null>(null);
  const [proServices, setProServices] = useState<Record<string, ProService[]>>(
    {}
  );
  const [catalogForm, setCatalogForm] = useState({ ...emptyCatalogForm });
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [showCreatePro, setShowCreatePro] = useState(false);
  const [createPro, setCreatePro] = useState({ ...emptyCreatePro });
  const [draftPros, setDraftPros] = useState<Record<string, Pro>>({});
  const [newSvcDraft, setNewSvcDraft] = useState<
    Record<
      string,
      {
        name: string;
        description: string;
        durationMin: number;
        priceCents: number;
        catalogServiceId: string;
      }
    >
  >({});

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };

  const load = useCallback(async () => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    if (me.user.role !== "owner") {
      router.push("/pro");
      return;
    }
    const [p, c] = await Promise.all([
      fetch("/api/admin/professionals").then((r) => r.json()),
      fetch("/api/admin/catalog").then((r) => r.json()),
    ]);
    const list: Pro[] = (p.professionals || []).map(
      (x: Pro & { hoursJson?: Pro["hoursJson"]; closedDaysJson?: number[] }) => ({
        ...x,
        hoursJson: x.hoursJson || { start: "10:00", end: "19:00" },
        closedDaysJson: x.closedDaysJson || [0, 1],
        instagram: x.instagram || "",
        photoUrl: x.photoUrl || "",
        categories: x.categories || "both",
      })
    );
    setPros(list);
    setDraftPros(Object.fromEntries(list.map((x) => [x.id, { ...x }])));
    setCatalog(c.services || []);
    const q = filterPro ? `?professionalId=${filterPro}` : "";
    const b = await fetch(`/api/admin/bookings${q}`).then((r) => r.json());
    setBookings(b.bookings || []);
  }, [filterPro, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadProServices(professionalId: string) {
    const r = await fetch(
      `/api/admin/services?professionalId=${professionalId}`
    ).then((x) => x.json());
    setProServices((prev) => ({
      ...prev,
      [professionalId]: r.services || [],
    }));
  }

  async function toggleExpand(id: string) {
    if (expandedPro === id) {
      setExpandedPro(null);
      return;
    }
    setExpandedPro(id);
    await loadProServices(id);
  }

  async function saveCatalog(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(catalogForm.id ? { id: catalogForm.id } : {}),
      category: catalogForm.category,
      name: catalogForm.name,
      description: catalogForm.description,
      durationMin: Number(catalogForm.durationMin),
      basePriceCents: Number(catalogForm.basePriceCents),
    };
    const res = await fetch("/api/admin/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      flash(t.errorGeneric);
      return;
    }
    flash(catalogForm.id ? t.updated : t.created);
    setShowCatalogForm(false);
    setCatalogForm({ ...emptyCatalogForm });
    load();
  }

  async function deleteCatalog(id: string) {
    if (!confirm(t.confirmDeleteCatalog)) return;
    await fetch(`/api/admin/catalog?id=${id}`, { method: "DELETE" });
    flash(t.updated);
    load();
  }

  function editCatalog(s: CatalogService) {
    setCatalogForm({
      id: s.id,
      category: s.category === "brows" ? "brows" : "lashes",
      name: s.name,
      description: s.description || "",
      durationMin: s.durationMin,
      basePriceCents: s.basePriceCents,
    });
    setShowCatalogForm(true);
  }

  async function savePro(id: string) {
    const draft = draftPros[id];
    if (!draft) return;
    const res = await fetch("/api/admin/professionals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: draft.name,
        bio: draft.bio,
        city: draft.city,
        address: draft.address,
        whatsapp: draft.whatsapp,
        instagram: draft.instagram,
        photoUrl: draft.photoUrl,
        categories: draft.categories,
        hoursJson: draft.hoursJson,
        closedDaysJson: draft.closedDaysJson,
        status: draft.status,
        paidUntil: draft.paidUntil,
      }),
    });
    if (!res.ok) {
      flash(t.errorGeneric);
      return;
    }
    flash(t.updated);
    load();
  }

  async function removePro(id: string) {
    if (!confirm("Remove professional and cascade bookings?")) return;
    await fetch(`/api/admin/professionals?id=${id}`, { method: "DELETE" });
    if (expandedPro === id) setExpandedPro(null);
    load();
  }

  async function createProfessional(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPro),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || t.errorGeneric);
      return;
    }
    flash(t.created);
    setShowCreatePro(false);
    setCreatePro({ ...emptyCreatePro });
    load();
  }

  async function saveProService(
    professionalId: string,
    svc: Partial<ProService> & {
      name: string;
      durationMin: number;
      priceCents: number;
    }
  ) {
    const res = await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId,
        id: svc.id,
        name: svc.name,
        description: svc.description || "",
        durationMin: svc.durationMin,
        priceCents: svc.priceCents,
        visible: svc.visible ?? true,
        catalogServiceId: svc.catalogServiceId ?? null,
      }),
    });
    if (!res.ok) {
      flash(t.errorGeneric);
      return;
    }
    flash(t.updated);
    await loadProServices(professionalId);
  }

  async function deleteProService(professionalId: string, id: string) {
    const res = await fetch(`/api/admin/services?id=${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (data.softDeleted) flash(t.hideService);
    else flash(t.updated);
    await loadProServices(professionalId);
  }

  async function addFromCatalog(professionalId: string, catalogId: string) {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    await saveProService(professionalId, {
      name: item.name,
      description: item.description,
      durationMin: item.durationMin,
      priceCents: item.basePriceCents,
      visible: true,
      catalogServiceId: item.id,
    });
  }

  async function addFreeForm(professionalId: string) {
    const d = newSvcDraft[professionalId] || {
      name: "",
      description: "",
      durationMin: 60,
      priceCents: 5000,
      catalogServiceId: "",
    };
    if (!d.name.trim()) return;
    await saveProService(professionalId, {
      name: d.name,
      description: d.description,
      durationMin: d.durationMin,
      priceCents: d.priceCents,
      visible: true,
      catalogServiceId: d.catalogServiceId || null,
    });
    setNewSvcDraft((prev) => ({
      ...prev,
      [professionalId]: {
        name: "",
        description: "",
        durationMin: 60,
        priceCents: 5000,
        catalogServiceId: "",
      },
    }));
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

  function setDraft(id: string, patch: Partial<Pro>) {
    setDraftPros((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  const dayLabels = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

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

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["services", t.catalogServices],
            ["pros", t.allPros],
            ["bookings", t.appointments],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={`tap rounded-full px-4 py-2 text-sm ${
              tab === k
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "border border-[var(--line)]"
            }`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="text-sm text-[var(--blush)]">{msg}</p>}

      {/* ——— Catalog Services ——— */}
      {tab === "services" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--taupe)]">{t.syncNote}</p>
            <button
              className="btn"
              onClick={() => {
                setCatalogForm({ ...emptyCatalogForm, id: undefined });
                setShowCatalogForm(true);
              }}
            >
              {t.newCatalogService}
            </button>
          </div>

          {showCatalogForm && (
            <form className="card space-y-3 p-4" onSubmit={saveCatalog}>
              <p className="font-serif text-xl">
                {catalogForm.id ? t.editService : t.newCatalogService}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  {t.category}
                  <select
                    className="input mt-1"
                    value={catalogForm.category}
                    onChange={(e) =>
                      setCatalogForm((f) => ({
                        ...f,
                        category: e.target.value as "lashes" | "brows",
                      }))
                    }
                  >
                    <option value="lashes">{t.lashes}</option>
                    <option value="brows">{t.brows}</option>
                  </select>
                </label>
                <label className="text-sm">
                  {t.name}
                  <input
                    className="input mt-1"
                    required
                    value={catalogForm.name}
                    onChange={(e) =>
                      setCatalogForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  {t.description}
                  <input
                    className="input mt-1"
                    value={catalogForm.description}
                    onChange={(e) =>
                      setCatalogForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-sm">
                  {t.duration} ({t.minutes})
                  <input
                    className="input mt-1"
                    type="number"
                    min={15}
                    step={15}
                    required
                    value={catalogForm.durationMin}
                    onChange={(e) =>
                      setCatalogForm((f) => ({
                        ...f,
                        durationMin: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="text-sm">
                  {t.basePrice} ($)
                  <input
                    className="input mt-1"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={catalogForm.basePriceCents / 100}
                    onChange={(e) =>
                      setCatalogForm((f) => ({
                        ...f,
                        basePriceCents: Math.round(
                          Number(e.target.value) * 100
                        ),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn" type="submit">
                  {t.save}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCatalogForm(false);
                    setCatalogForm({ ...emptyCatalogForm });
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {catalog.length === 0 && (
            <p className="text-sm text-[var(--taupe)]">{t.noCatalogYet}</p>
          )}
          <div className="space-y-3">
            {catalog.map((s) => (
              <div
                key={s.id}
                className="card flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div>
                  <p className="chip">
                    {s.category === "brows" ? t.brows : t.lashes}
                  </p>
                  <p className="mt-1 font-serif text-2xl">{s.name}</p>
                  {s.description && (
                    <p className="text-sm text-[var(--taupe)]">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-1 text-sm">
                    {s.durationMin} {t.minutes} ·{" "}
                    {money(s.basePriceCents, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => editCatalog(s)}
                  >
                    {t.editService}
                  </button>
                  <button
                    className="btn btn-ghost text-red-800"
                    onClick={() => deleteCatalog(s.id)}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ——— Professionals ——— */}
      {tab === "pros" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="btn"
              onClick={() => setShowCreatePro((v) => !v)}
            >
              {t.createProfessional}
            </button>
          </div>

          {showCreatePro && (
            <form className="card space-y-3 p-4" onSubmit={createProfessional}>
              <p className="font-serif text-xl">{t.createProfessional}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  {t.email}
                  <input
                    className="input mt-1"
                    type="email"
                    required
                    value={createPro.email}
                    onChange={(e) =>
                      setCreatePro((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  {t.password}
                  <input
                    className="input mt-1"
                    type="password"
                    minLength={8}
                    required
                    value={createPro.password}
                    onChange={(e) =>
                      setCreatePro((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  {t.name}
                  <input
                    className="input mt-1"
                    required
                    value={createPro.name}
                    onChange={(e) =>
                      setCreatePro((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  {t.city}
                  <input
                    className="input mt-1"
                    value={createPro.city}
                    onChange={(e) =>
                      setCreatePro((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button className="btn" type="submit">
                  {t.createAccount}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreatePro(false)}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {pros.map((p) => {
              const d = draftPros[p.id] || p;
              const open = expandedPro === p.id;
              const svcs = proServices[p.id] || [];
              const draft =
                newSvcDraft[p.id] || {
                  name: "",
                  description: "",
                  durationMin: 60,
                  priceCents: 5000,
                  catalogServiceId: "",
                };
              return (
                <div key={p.id} className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-2xl">{p.name}</p>
                      <p className="text-sm text-[var(--taupe)]">
                        {p.email} · {p.city} · {p.status}
                        {p.paidUntil ? ` · ${p.paidUntil}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-ghost"
                        onClick={() => toggleExpand(p.id)}
                      >
                        {open ? t.collapse : t.expand}
                      </button>
                      <button
                        className="btn btn-ghost text-red-800"
                        onClick={() => removePro(p.id)}
                      >
                        {t.removePro}
                      </button>
                    </div>
                  </div>

                  {!open && (
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="input max-w-[10rem]"
                        value={d.status}
                        onChange={(e) => {
                          const status = e.target.value as Pro["status"];
                          setDraft(p.id, { status });
                          fetch("/api/admin/professionals", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, status }),
                          }).then(() => {
                            flash(t.updated);
                            load();
                          });
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                      </select>
                      <input
                        className="input max-w-[12rem]"
                        type="date"
                        value={d.paidUntil || ""}
                        onChange={(e) => {
                          const paidUntil = e.target.value || null;
                          setDraft(p.id, { paidUntil });
                          fetch("/api/admin/professionals", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, paidUntil }),
                          }).then(() => {
                            flash(t.updated);
                            load();
                          });
                        }}
                      />
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          const status =
                            d.status === "active" ? "paused" : "active";
                          const paidUntil =
                            status === "active"
                              ? d.paidUntil || "2099-12-31"
                              : d.paidUntil;
                          fetch("/api/admin/professionals", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, status, paidUntil }),
                          }).then(() => {
                            flash(t.updated);
                            load();
                          });
                        }}
                      >
                        {t.toggleAccess}
                      </button>
                    </div>
                  )}

                  {open && (
                    <div className="space-y-4 border-t border-[var(--line)] pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                          {t.name}
                          <input
                            className="input mt-1"
                            value={d.name}
                            onChange={(e) =>
                              setDraft(p.id, { name: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.city}
                          <input
                            className="input mt-1"
                            value={d.city}
                            onChange={(e) =>
                              setDraft(p.id, { city: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          {t.bio}
                          <textarea
                            className="input mt-1 min-h-[4rem]"
                            value={d.bio}
                            onChange={(e) =>
                              setDraft(p.id, { bio: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          {t.address}
                          <input
                            className="input mt-1"
                            value={d.address}
                            onChange={(e) =>
                              setDraft(p.id, { address: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.whatsapp}
                          <input
                            className="input mt-1"
                            value={d.whatsapp}
                            onChange={(e) =>
                              setDraft(p.id, { whatsapp: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.instagram}
                          <input
                            className="input mt-1"
                            value={d.instagram}
                            onChange={(e) =>
                              setDraft(p.id, { instagram: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          {t.photoUrl}
                          <input
                            className="input mt-1"
                            value={d.photoUrl}
                            onChange={(e) =>
                              setDraft(p.id, { photoUrl: e.target.value })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.category}
                          <select
                            className="input mt-1"
                            value={d.categories}
                            onChange={(e) =>
                              setDraft(p.id, {
                                categories: e.target
                                  .value as Pro["categories"],
                              })
                            }
                          >
                            <option value="lashes">{t.lashes}</option>
                            <option value="brows">{t.brows}</option>
                            <option value="both">{t.both}</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          {t.status}
                          <select
                            className="input mt-1"
                            value={d.status}
                            onChange={(e) =>
                              setDraft(p.id, {
                                status: e.target.value as Pro["status"],
                              })
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="expired">Expired</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          {t.paidUntil}
                          <input
                            className="input mt-1"
                            type="date"
                            value={d.paidUntil || ""}
                            onChange={(e) =>
                              setDraft(p.id, {
                                paidUntil: e.target.value || null,
                              })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.hours} ({t.start})
                          <input
                            className="input mt-1"
                            type="time"
                            value={d.hoursJson?.start || "10:00"}
                            onChange={(e) =>
                              setDraft(p.id, {
                                hoursJson: {
                                  ...d.hoursJson,
                                  start: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t.hours} ({t.end})
                          <input
                            className="input mt-1"
                            type="time"
                            value={d.hoursJson?.end || "19:00"}
                            onChange={(e) =>
                              setDraft(p.id, {
                                hoursJson: {
                                  ...d.hoursJson,
                                  end: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      </div>

                      <div>
                        <p className="mb-2 text-sm">{t.closedDays}</p>
                        <div className="flex flex-wrap gap-2">
                          {dayLabels.map((label, i) => {
                            const on = (d.closedDaysJson || []).includes(i);
                            return (
                              <button
                                key={i}
                                type="button"
                                className={`tap rounded-full px-3 py-1 text-xs ${
                                  on
                                    ? "bg-[var(--ink)] text-[var(--ivory)]"
                                    : "border border-[var(--line)]"
                                }`}
                                onClick={() => {
                                  const set = new Set(d.closedDaysJson || []);
                                  if (set.has(i)) set.delete(i);
                                  else set.add(i);
                                  setDraft(p.id, {
                                    closedDaysJson: [...set].sort(),
                                  });
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button className="btn" onClick={() => savePro(p.id)}>
                        {t.save}
                      </button>

                      <div className="space-y-3 border-t border-[var(--line)] pt-4">
                        <p className="font-serif text-xl">{t.services}</p>
                        {svcs.length === 0 && (
                          <p className="text-sm text-[var(--taupe)]">
                            {t.noProServices}
                          </p>
                        )}
                        {svcs.map((s) => (
                          <div
                            key={s.id}
                            className="space-y-2 rounded-2xl border border-[var(--line)] p-3"
                          >
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                className="input"
                                value={s.name}
                                onChange={(e) =>
                                  setProServices((prev) => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || []).map((x) =>
                                      x.id === s.id
                                        ? { ...x, name: e.target.value }
                                        : x
                                    ),
                                  }))
                                }
                              />
                              <input
                                className="input"
                                placeholder={t.description}
                                value={s.description}
                                onChange={(e) =>
                                  setProServices((prev) => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || []).map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            description: e.target.value,
                                          }
                                        : x
                                    ),
                                  }))
                                }
                              />
                              <label className="text-sm">
                                {t.duration}
                                <input
                                  className="input mt-1"
                                  type="number"
                                  value={s.durationMin}
                                  onChange={(e) =>
                                    setProServices((prev) => ({
                                      ...prev,
                                      [p.id]: (prev[p.id] || []).map((x) =>
                                        x.id === s.id
                                          ? {
                                              ...x,
                                              durationMin: Number(
                                                e.target.value
                                              ),
                                            }
                                          : x
                                      ),
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-sm">
                                {t.price} ($)
                                <input
                                  className="input mt-1"
                                  type="number"
                                  value={s.priceCents / 100}
                                  onChange={(e) =>
                                    setProServices((prev) => ({
                                      ...prev,
                                      [p.id]: (prev[p.id] || []).map((x) =>
                                        x.id === s.id
                                          ? {
                                              ...x,
                                              priceCents: Math.round(
                                                Number(e.target.value) * 100
                                              ),
                                            }
                                          : x
                                      ),
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={s.visible}
                                  onChange={(e) =>
                                    setProServices((prev) => ({
                                      ...prev,
                                      [p.id]: (prev[p.id] || []).map((x) =>
                                        x.id === s.id
                                          ? {
                                              ...x,
                                              visible: e.target.checked,
                                            }
                                          : x
                                      ),
                                    }))
                                  }
                                />
                                {t.visible}
                              </label>
                              <button
                                className="btn btn-ghost"
                                onClick={() => saveProService(p.id, s)}
                              >
                                {t.save}
                              </button>
                              <button
                                className="btn btn-ghost text-red-800"
                                onClick={() => deleteProService(p.id, s.id)}
                              >
                                {t.delete}
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="space-y-2 rounded-2xl border border-dashed border-[var(--line)] p-3">
                          <p className="text-sm">{t.addFromCatalog}</p>
                          <select
                            className="input"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addFromCatalog(p.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">—</option>
                            {catalog.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} · {money(c.basePriceCents, locale)}
                              </option>
                            ))}
                          </select>

                          <p className="pt-2 text-sm">{t.freeFormService}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              className="input"
                              placeholder={t.name}
                              value={draft.name}
                              onChange={(e) =>
                                setNewSvcDraft((prev) => ({
                                  ...prev,
                                  [p.id]: { ...draft, name: e.target.value },
                                }))
                              }
                            />
                            <input
                              className="input"
                              placeholder={t.description}
                              value={draft.description}
                              onChange={(e) =>
                                setNewSvcDraft((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...draft,
                                    description: e.target.value,
                                  },
                                }))
                              }
                            />
                            <input
                              className="input"
                              type="number"
                              placeholder={t.duration}
                              value={draft.durationMin}
                              onChange={(e) =>
                                setNewSvcDraft((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...draft,
                                    durationMin: Number(e.target.value),
                                  },
                                }))
                              }
                            />
                            <input
                              className="input"
                              type="number"
                              placeholder="$"
                              value={draft.priceCents / 100}
                              onChange={(e) =>
                                setNewSvcDraft((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...draft,
                                    priceCents: Math.round(
                                      Number(e.target.value) * 100
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => addFreeForm(p.id)}
                          >
                            {t.addService}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ——— Bookings ——— */}
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
