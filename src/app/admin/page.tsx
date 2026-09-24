"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/utils";

type CatalogService = {
  id: string;
  category: "lashes" | "brows" | "both";
  name: string;
  description: string;
  durationMin: number;
  basePriceCents: number;
  photoUrl?: string | null;
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
  photoUrl?: string | null;
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
  clientPhone: string;
  startAt: string;
  priceCents: number;
  status: "requested" | "confirmed" | "done" | "cancelled";
};

type Tab = "services" | "pros" | "bookings" | "notifications";

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
  const { toast } = useToast();
  const router = useRouter();
  const [pros, setPros] = useState<Pro[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [filterPro, setFilterPro] = useState("");
  const [tab, setTab] = useState<Tab>("services");
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
        photoUrl: string;
      }
    >
  >({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {}
  );
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [ownerEmail, setOwnerEmail] = useState("admin@anak.studio");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerEmailDraft, setOwnerEmailDraft] = useState("");
  const [showOwnerAccount, setShowOwnerAccount] = useState(false);

  type NotifTemplates = {
    email_pro_subject: string;
    email_pro_headline: string;
    email_pro_intro: string;
    email_pro_footer: string;
    email_owner_subject: string;
    email_owner_headline: string;
    email_owner_intro: string;
    email_owner_footer: string;
    email_client_subject: string;
    email_client_headline: string;
    email_client_intro: string;
    email_client_footer: string;
    sms_pro: string;
    sms_client: string;
  };
  const [notifTemplates, setNotifTemplates] = useState<NotifTemplates | null>(
    null
  );
  const [notifPlaceholders, setNotifPlaceholders] = useState<string[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPreviewRole, setNotifPreviewRole] = useState<
    "pro" | "owner" | "client"
  >("pro");

  const [saving, setSaving] = useState(false);

  const flash = (m: string, tone: "success" | "error" = "success") => {
    toast(m, tone);
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
    setEmailDrafts((prev) => {
      const next = { ...prev };
      for (const x of list) {
        if (next[x.id] === undefined) next[x.id] = x.email || "";
      }
      return next;
    });
    setCatalog(c.services || []);
    const q = filterPro ? `?professionalId=${filterPro}` : "";
    const b = await fetch(`/api/admin/bookings${q}`).then((r) => r.json());
    setBookings(b.bookings || []);
    if (me.user?.email) {
      setOwnerEmail(me.user.email);
      setOwnerEmailDraft(me.user.email);
    }
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
    if (saving) return;
    setSaving(true);
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
      flash(t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    flash(catalogForm.id ? "Saved" : "Service added");
    setShowCatalogForm(false);
    setCatalogForm({ ...emptyCatalogForm });
    await load();
    setSaving(false);
  }

  async function deleteCatalog(id: string) {
    if (!confirm(t.confirmDeleteCatalog)) return;
    const res = await fetch(`/api/admin/catalog?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      return;
    }
    flash("Service deleted");
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
    if (!draft || saving) return;
    setSaving(true);
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
      flash(t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    flash("Saved");
    await load();
    setSaving(false);
  }

  async function removePro(id: string) {
    if (!confirm("Remove professional and cascade bookings?")) return;
    const res = await fetch(`/api/admin/professionals?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      return;
    }
    flash("Professional removed");
    if (expandedPro === id) setExpandedPro(null);
    load();
  }

  async function createProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPro),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    const created = await res.json().catch(() => ({}));
    const createdEmail =
      created?.professional?.email || createPro.email || "";
    flash(`Created — email ${createdEmail}`);
    setShowCreatePro(false);
    setCreatePro({ ...emptyCreatePro });
    await load();
    setSaving(false);
  }

  async function setProPassword(professionalId: string) {
    const password = (passwordDrafts[professionalId] || "").trim();
    if (!password) {
      flash("Enter a password", "error");
      return;
    }
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/professionals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: professionalId, password }),
    });
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    flash("Password updated");
    setPasswordDrafts((prev) => ({ ...prev, [professionalId]: "" }));
    setSaving(false);
  }

  async function setProEmail(professionalId: string) {
    const email = (emailDrafts[professionalId] || "").trim().toLowerCase();
    if (!email) {
      flash("Enter an email", "error");
      return;
    }
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/professionals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: professionalId, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    flash("Email updated");
    await load();
    setSaving(false);
  }

  async function saveOwnerAccount(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const payload: { password?: string; email?: string } = {};
    const pwd = ownerPassword.trim();
    const em = ownerEmailDraft.trim().toLowerCase();
    if (pwd) payload.password = pwd;
    if (em && em !== ownerEmail) payload.email = em;
    if (!payload.password && !payload.email) {
      flash("Enter a new password or email", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flash(err.error || t.errorGeneric, "error");
      setSaving(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.email) {
      setOwnerEmail(data.email);
      setOwnerEmailDraft(data.email);
    }
    setOwnerPassword("");
    flash(
      [
        data.passwordUpdated ? "Password updated" : null,
        data.emailUpdated ? "Email updated" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Saved"
    );
    setSaving(false);
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
        photoUrl: svc.photoUrl || null,
        catalogServiceId: svc.catalogServiceId ?? null,
      }),
    });
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      return;
    }
    flash(svc.id ? "Saved" : "Service added");
    await loadProServices(professionalId);
  }

  async function deleteProService(professionalId: string, id: string) {
    const res = await fetch(`/api/admin/services?id=${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      return;
    }
    if (data.softDeleted) flash(t.hideService);
    else flash("Service deleted");
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
      photoUrl: item.photoUrl || null,
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
      photoUrl: "",
    };
    if (!d.name.trim()) return;
    await saveProService(professionalId, {
      name: d.name,
      description: d.description,
      durationMin: d.durationMin,
      priceCents: d.priceCents,
      visible: true,
      photoUrl: d.photoUrl || null,
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
        photoUrl: "",
      },
    }));
  }

  async function patchBooking(
    id: string,
    patch: { status?: Booking["status"]; priceCents?: number }
  ) {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      flash(t.errorGeneric, "error");
      return;
    }
    flash(patch.status ? "Status updated" : "Saved");
    load();
  }

  function setDraft(id: string, patch: Partial<Pro>) {
    setDraftPros((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }


  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const r = await fetch("/api/admin/notifications").then((x) => x.json());
      if (r.error) {
        flash(r.error, "error");
        return;
      }
      setNotifTemplates(r.templates);
      setNotifPlaceholders(r.placeholders || []);
    } catch {
      flash("Failed to load notification templates", "error");
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const saveNotifications = async () => {
    if (!notifTemplates) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifTemplates),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || "Save failed", "error");
        return;
      }
      setNotifTemplates(data.templates);
      flash("Notification templates saved");
    } catch {
      flash("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyPreview = (tpl: string) => {
    const sample: Record<string, string> = {
      ref: "ANA-1A2B",
      service: "Classic lashes",
      when: "Tue Sep 29, 2:00 PM",
      place: "123 Main St, Houston",
      price: "$120",
      clientName: "Maria Lopez",
      clientPhone: "+1 713 555 0199",
      clientEmail: "maria@example.com",
      professionalName: "Ana",
      notes: "First visit",
    };
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => sample[k] ?? "");
  };

  const dayLabels = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip">{t.admin}</p>
          <h1 className="mt-2 heading-display text-3xl">Anak.Studio</h1>
          <p className="mt-1 text-sm text-[var(--taupe)]">
            Signed in as {ownerEmail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setShowOwnerAccount((v) => !v)}
          >
            Owner account
          </button>
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
      </div>

      {showOwnerAccount && (
        <form className="card space-y-3 p-3.5" onSubmit={saveOwnerAccount}>
          <p className="heading-section text-lg">Owner account</p>
          <p className="text-sm text-[var(--taupe)]">
            Change the admin login email and/or password for this owner session.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              {t.email}
              <input
                className="input mt-1"
                type="email"
                value={ownerEmailDraft}
                onChange={(e) => setOwnerEmailDraft(e.target.value)}
              />
            </label>
            <label className="text-sm">
              New password
              <input
                className="input mt-1"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t.loading : t.save}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => setShowOwnerAccount(false)}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["services", t.catalogServices],
            ["pros", t.allPros],
            ["bookings", t.appointments],
            ["notifications", t.notifications],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={`tap rounded-full px-4 py-2 text-sm ${
              tab === k
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "border border-[var(--line)]"
            }`}
            onClick={() => {
              setTab(k);
              if (k === "notifications" && !notifTemplates) {
                void loadNotifications();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
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
            <form className="card space-y-3 p-3.5" onSubmit={saveCatalog}>
              <p className="heading-section text-lg">
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? t.loading : t.save}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={saving}
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
            <p className="empty-state">{t.noCatalogYet}</p>
          )}
          <div className="space-y-3">
            {catalog.map((s) => (
              <div
                key={s.id}
                className="card flex flex-wrap items-start justify-between gap-3 p-3.5"
              >
                <div>
                  <p className="chip">
                    {s.category === "brows" ? t.brows : t.lashes}
                  </p>
                  <p className="mt-1 heading-section text-xl">{s.name}</p>
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="heading-section text-2xl">Professionals</h2>
              <p className="mt-1 text-sm text-[var(--taupe)]">
                Login email & password for each artist
              </p>
            </div>
            <button
              className="btn"
              onClick={() => setShowCreatePro((v) => !v)}
            >
              {t.createProfessional}
            </button>
          </div>

          {showCreatePro && (
            <form className="card space-y-3 p-3.5" onSubmit={createProfessional}>
              <p className="heading-section text-lg">{t.createProfessional}</p>
              <p className="text-sm text-[var(--taupe)]">
                They log in with this email and password.
              </p>
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
                    minLength={1}
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? t.loading : t.createAccount}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={saving}
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
                  photoUrl: "",
                };
              return (
                <div key={p.id} className="card space-y-3 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="heading-section text-xl">{p.name}</p>
                      <p className="mt-1 text-sm">
                        <span className="text-[var(--taupe)]">{t.email}: </span>
                        <span className="font-medium">{p.email || "—"}</span>
                      </p>
                      <p className="text-sm text-[var(--taupe)]">
                        {p.city} · {p.status}
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
                            flash("Saved");
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
                            flash("Saved");
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
                            flash("Saved");
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

                      <button className="btn btn-primary" disabled={saving} onClick={() => savePro(p.id)}>
                        {saving ? t.loading : t.save}
                      </button>

                      <div className="space-y-3 rounded-[12px] border border-[var(--line)] p-3">
                        <p className="text-sm font-medium">Login credentials</p>
                        <label className="text-sm block">
                          {t.email} / username
                          <input
                            className="input mt-1"
                            type="email"
                            autoComplete="off"
                            value={emailDrafts[p.id] ?? p.email ?? ""}
                            onChange={(e) =>
                              setEmailDrafts((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={saving}
                          onClick={() => setProEmail(p.id)}
                        >
                          Change email
                        </button>
                        <label className="text-sm block">
                          Set password
                          <input
                            className="input mt-1"
                            type="password"
                            autoComplete="new-password"
                            placeholder="New password"
                            value={passwordDrafts[p.id] || ""}
                            onChange={(e) =>
                              setPasswordDrafts((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={saving}
                          onClick={() => setProPassword(p.id)}
                        >
                          Set password
                        </button>
                      </div>

                      <div className="space-y-3 border-t border-[var(--line)] pt-4">
                        <p className="heading-section text-lg">{t.services}</p>
                        {svcs.length === 0 && (
                          <p className="text-sm text-[var(--taupe)]">
                            {t.noProServices}
                          </p>
                        )}
                        {svcs.map((s) => (
                          <div
                            key={s.id}
                            className="space-y-2 rounded-[12px] border border-[var(--line)] p-3"
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
                              <input
                                className="input sm:col-span-2"
                                placeholder={t.photoUrl}
                                value={s.photoUrl || ""}
                                onChange={(e) =>
                                  setProServices((prev) => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || []).map((x) =>
                                      x.id === s.id
                                        ? { ...x, photoUrl: e.target.value }
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

                        <div className="space-y-2 rounded-[12px] border border-dashed border-[var(--line)] p-3">
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
                              className="input sm:col-span-2"
                              placeholder={t.photoUrl}
                              value={draft.photoUrl}
                              onChange={(e) =>
                                setNewSvcDraft((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    ...draft,
                                    photoUrl: e.target.value,
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
          {bookings.length === 0 && (
            <p className="empty-state">No appointments yet</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="card space-y-2 p-3.5">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="heading-section text-lg">{b.refCode}</p>
                  <p className="text-sm text-[var(--taupe)]">
                    {b.clientName}
                    {b.clientPhone ? ` · ${b.clientPhone}` : ""} ·{" "}
                    {b.professionalName} · {b.serviceName} · {b.status}
                  </p>
                  <p className="text-sm">
                    {new Date(b.startAt).toLocaleString("en-US", {
                      timeZone: "America/Chicago",
                    })}
                  </p>
                </div>
                <p className="heading-section text-lg">
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

      {/* ——— Notifications ——— */}
      {tab === "notifications" && (
        <div className="space-y-6">
          <div className="card space-y-3 p-4">
            <p className="heading-section text-lg">Email & SMS copy</p>
            <p className="text-sm text-[var(--taupe)]">
              Edit subject, headline, intro, and footer for each email. The
              booking details card (ref, service, when, place, price, etc.) is
              always filled automatically. SMS is a single text field.
              Placeholders:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(notifPlaceholders.length
                ? notifPlaceholders
                : [
                    "{{ref}}",
                    "{{service}}",
                    "{{when}}",
                    "{{place}}",
                    "{{price}}",
                    "{{clientName}}",
                    "{{clientPhone}}",
                    "{{clientEmail}}",
                    "{{professionalName}}",
                    "{{notes}}",
                  ]
              ).map((ph) => (
                <code
                  key={ph}
                  className="rounded-md border border-[var(--line)] bg-[var(--ivory)] px-2 py-0.5 text-xs"
                >
                  {ph}
                </code>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              disabled={notifLoading}
              onClick={() => void loadNotifications()}
            >
              {notifLoading ? t.loading : "Reload from server"}
            </button>
          </div>

          {!notifTemplates && (
            <p className="empty-state">
              {notifLoading ? t.loading : "Open this tab to load templates…"}
            </p>
          )}

          {notifTemplates && (
            <>
              {(
                [
                  ["pro", "Professional email"],
                  ["owner", "Owner email"],
                  ["client", "Client email"],
                ] as const
              ).map(([role, title]) => {
                const sk = `email_${role}_subject` as keyof NotifTemplates;
                const hk = `email_${role}_headline` as keyof NotifTemplates;
                const ik = `email_${role}_intro` as keyof NotifTemplates;
                const fk = `email_${role}_footer` as keyof NotifTemplates;
                return (
                  <div key={role} className="card space-y-3 p-4">
                    <p className="heading-section text-lg">{title}</p>
                    <label className="block text-sm">
                      Subject
                      <input
                        className="input mt-1"
                        value={notifTemplates[sk]}
                        onChange={(e) =>
                          setNotifTemplates({
                            ...notifTemplates,
                            [sk]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Headline
                      <input
                        className="input mt-1"
                        value={notifTemplates[hk]}
                        onChange={(e) =>
                          setNotifTemplates({
                            ...notifTemplates,
                            [hk]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Intro (newlines → paragraphs)
                      <textarea
                        className="input mt-1 min-h-[6rem]"
                        value={notifTemplates[ik]}
                        onChange={(e) =>
                          setNotifTemplates({
                            ...notifTemplates,
                            [ik]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Footer note
                      <input
                        className="input mt-1"
                        value={notifTemplates[fk]}
                        onChange={(e) =>
                          setNotifTemplates({
                            ...notifTemplates,
                            [fk]: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                );
              })}

              <div className="card space-y-3 p-4">
                <p className="heading-section text-lg">SMS</p>
                <label className="block text-sm">
                  Professional SMS
                  <textarea
                    className="input mt-1 min-h-[4rem]"
                    value={notifTemplates.sms_pro}
                    onChange={(e) =>
                      setNotifTemplates({
                        ...notifTemplates,
                        sms_pro: e.target.value,
                      })
                    }
                  />
                  <span className="mt-1 block text-xs text-[var(--taupe)]">
                    {notifTemplates.sms_pro.length} chars
                  </span>
                </label>
                <label className="block text-sm">
                  Client SMS
                  <textarea
                    className="input mt-1 min-h-[4rem]"
                    value={notifTemplates.sms_client}
                    onChange={(e) =>
                      setNotifTemplates({
                        ...notifTemplates,
                        sms_client: e.target.value,
                      })
                    }
                  />
                  <span className="mt-1 block text-xs text-[var(--taupe)]">
                    {notifTemplates.sms_client.length} chars
                  </span>
                </label>
              </div>

              <div className="card space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="heading-section text-lg">Live preview</p>
                  <select
                    className="input max-w-[10rem]"
                    value={notifPreviewRole}
                    onChange={(e) =>
                      setNotifPreviewRole(
                        e.target.value as "pro" | "owner" | "client"
                      )
                    }
                  >
                    <option value="pro">Professional</option>
                    <option value="owner">Owner</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <p className="text-sm">
                  <span className="text-[var(--taupe)]">Subject: </span>
                  {applyPreview(
                    notifTemplates[
                      `email_${notifPreviewRole}_subject` as keyof NotifTemplates
                    ]
                  )}
                </p>
                <p className="text-xl font-semibold tracking-tight">
                  {applyPreview(
                    notifTemplates[
                      `email_${notifPreviewRole}_headline` as keyof NotifTemplates
                    ]
                  )}
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {applyPreview(
                    notifTemplates[
                      `email_${notifPreviewRole}_intro` as keyof NotifTemplates
                    ]
                  )}
                </div>
                <div className="rounded-lg border border-[var(--line)] p-3 text-sm">
                  <p className="text-[var(--taupe)]">Details card (auto)</p>
                  <p>Ref: ANA-1A2B</p>
                  <p>Service: Classic lashes</p>
                  <p>When: Tue Sep 29, 2:00 PM (Houston)</p>
                  <p>Place: 123 Main St, Houston</p>
                  <p>Price: $120</p>
                </div>
                <p className="text-xs text-[var(--taupe)]">
                  {applyPreview(
                    notifTemplates[
                      `email_${notifPreviewRole}_footer` as keyof NotifTemplates
                    ]
                  )}
                </p>
                <div className="border-t border-[var(--line)] pt-3 text-sm">
                  <p className="text-[var(--taupe)]">SMS preview</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {applyPreview(
                      notifPreviewRole === "client"
                        ? notifTemplates.sms_client
                        : notifTemplates.sms_pro
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void saveNotifications()}
              >
                {saving ? t.loading : t.save}
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
}
