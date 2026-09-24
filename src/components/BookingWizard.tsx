"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/utils";
import { parseUsPhone } from "@/lib/phone";
import { instagramHref } from "@/lib/instagram";
import { downloadIcs, googleCalendarUrl } from "@/lib/calendar";

type ProCard = {
  id: string;
  name: string;
  bio: string;
  photoUrl: string;
  city: string;
  address: string;
  instagram: string;
  instagramUrl?: string | null;
};

type ProService = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
};

type Confirmation = {
  refCode: string;
  whenLabel: string;
  place: string;
  priceCents: number;
  professionalName: string;
  serviceName: string;
  whatsappUrl: string | null;
  message: string;
  startAt?: string;
  endAt?: string;
  date?: string;
  time?: string;
  durationMin?: number;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function monthMatrix(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function todayStr() {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(new Date());
}

function monogram(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.trim().slice(0, 2) || "?").toUpperCase();
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProPhoto({
  name,
  photoUrl,
  size = "lg",
}: {
  name: string;
  photoUrl?: string;
  size?: "lg" | "sm";
}) {
  const dim = size === "lg" ? "h-20 w-20 text-lg" : "h-12 w-12 text-sm";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[var(--paper)] font-semibold tracking-tight text-[var(--ink)]`}
      aria-hidden
    >
      {monogram(name)}
    </div>
  );
}

export function BookingWizard() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [pros, setPros] = useState<ProCard[]>([]);
  const [selectedPro, setSelectedPro] = useState<ProCard | null>(null);
  const [services, setServices] = useState<ProService[]>([]);
  const [selectedServices, setSelectedServices] = useState<ProService[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [prosReady, setProsReady] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [dbError, setDbError] = useState(false);

  const selectedIds = useMemo(
    () => selectedServices.map((s) => s.id),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMin, 0),
    [selectedServices]
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.priceCents, 0),
    [selectedServices]
  );
  const servicesLabel = useMemo(
    () => selectedServices.map((s) => s.name).join(" · "),
    [selectedServices]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/professionals", { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) setDbError(true);
        setPros(d.professionals || []);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDbError(true);
      })
      .finally(() => setProsReady(true));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!selectedPro) return;
    const ac = new AbortController();
    fetch(
      `/api/professionals?professionalId=${encodeURIComponent(selectedPro.id)}`,
      { signal: ac.signal }
    )
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services || []);
        setServicesLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setServices([]);
        setServicesLoading(false);
      });
    return () => ac.abort();
  }, [selectedPro]);

  useEffect(() => {
    if (!selectedPro || selectedIds.length === 0 || !date) return;
    const ac = new AbortController();
    const qs = new URLSearchParams({
      professionalId: selectedPro.id,
      serviceIds: selectedIds.join(","),
      date,
    });
    fetch(`/api/slots?${qs.toString()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        setSlotsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSlots([]);
        setSlotsLoading(false);
      });
    return () => ac.abort();
  }, [selectedPro, selectedIds, date]);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );
  const today = todayStr();
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  function validatePhoneField(value: string): string | null {
    const parsed = parseUsPhone(value);
    return parsed.ok ? null : t.phoneInvalid;
  }

  function validateEmailField(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t.emailInvalid;
    return null;
  }

  function toggleService(s: ProService) {
    setSelectedServices((prev) => {
      const exists = prev.some((x) => x.id === s.id);
      if (exists) return prev.filter((x) => x.id !== s.id);
      return [...prev, s];
    });
    setDate(null);
    setTime(null);
    setSlots([]);
  }

  async function submit() {
    if (!selectedPro || selectedServices.length === 0 || !date || !time) return;
    const pErr = validatePhoneField(phone);
    const eErr = validateEmailField(email);
    setPhoneError(pErr);
    setEmailError(eErr);
    if (pErr || eErr) {
      setError(pErr || eErr);
      return;
    }
    const parsedPhone = parseUsPhone(phone);
    if (!parsedPhone.ok) {
      setPhoneError(t.phoneInvalid);
      setError(t.phoneInvalid);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedPro.id,
          professionalServiceIds: selectedServices.map((s) => s.id),
          date,
          time,
          clientName: name,
          clientPhone: parsedPhone.e164,
          clientEmail: email.trim() || undefined,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.errorGeneric);
        return;
      }
      setConfirm(data.booking);
      setStep(5);
      toast("Booking confirmed");
    } catch {
      setError(t.errorGeneric);
      toast(t.errorGeneric, "error");
    } finally {
      setLoading(false);
    }
  }

  const calendarEvent = useMemo(() => {
    if (!confirm?.startAt || !confirm?.endAt) return null;
    const start = new Date(confirm.startAt);
    const end = new Date(confirm.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return {
      title: `${confirm.serviceName} · ${confirm.professionalName}`,
      description: `Anak.Studio booking ${confirm.refCode}\n${confirm.whenLabel}`,
      location: confirm.place || "",
      start,
      end,
    };
  }, [confirm]);

  return (
    <div className="space-y-10">
      <section className="pt-2 sm:pt-4">
        <p className="chip mb-4">{t.eyebrow}</p>
        <h1 className="heading-display text-4xl sm:text-5xl lg:text-6xl">
          {t.title}
          <br />
          <span className="font-medium text-[var(--taupe)]">{t.titleItalic}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--taupe)] sm:text-lg">
          {t.sub}
        </p>
      </section>

      {dbError && (
        <div className="card border-[var(--line)] p-4 text-sm text-[var(--taupe)]">
          {t.dbMissing}
        </div>
      )}
      {!dbError && step === 1 && prosReady && pros.length === 0 && (
        <div className="card border-[var(--line)] p-4 text-sm text-[var(--taupe)]">
          {t.noProsHome}
        </div>
      )}

      {step < 5 && (
        <ol className="flex flex-wrap gap-3" aria-label="Booking steps">
          {[t.stepPro, t.stepService, t.stepWhen, t.stepDetails].map(
            (label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <li
                  key={label}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-3 py-2 text-base ${
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--ivory)]"
                      : done
                        ? "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--taupe)]"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="step-dot bg-white/10">{n}</span>
                  <span className="pr-1 font-medium">{label}</span>
                </li>
              );
            }
          )}
        </ol>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="heading-section text-2xl">{t.pickProfessional}</h2>
          {!prosReady && <p className="text-[var(--taupe)]">{t.loading}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {pros.map((p) => {
              const ig = p.instagramUrl || instagramHref(p.instagram);
              return (
                <div
                  key={p.id}
                  className="card relative flex gap-4 p-4 transition hover:border-[var(--ink)]"
                >
                  <button
                    type="button"
                    className="tap flex min-w-0 flex-1 gap-4 text-left"
                    onClick={() => {
                      setSelectedPro(p);
                      setSelectedServices([]);
                      setServices([]);
                      setServicesLoading(true);
                      setDate(null);
                      setTime(null);
                      setStep(2);
                    }}
                  >
                    <ProPhoto name={p.name} photoUrl={p.photoUrl} />
                    <div className="min-w-0 flex-1 pr-8">
                      <p className="heading-section text-lg">{p.name}</p>
                      {p.bio ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--taupe)]">
                          {p.bio}
                        </p>
                      ) : null}
                      {(p.city || p.address) && (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {p.address || p.city}
                        </p>
                      )}
                    </div>
                  </button>
                  {ig ? (
                    <a
                      href={ig}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--taupe)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                      aria-label="Instagram"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <InstagramIcon className="h-5 w-5" />
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {step === 2 && selectedPro && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProPhoto
                name={selectedPro.name}
                photoUrl={selectedPro.photoUrl}
                size="sm"
              />
              <div className="min-w-0">
                <h2 className="heading-section text-2xl">
                  {t.pickServices || t.pickService}
                </h2>
                <p className="text-sm text-[var(--taupe)]">{selectedPro.name}</p>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setStep(1);
                setSelectedServices([]);
              }}
            >
              {t.back}
            </button>
          </div>
          {servicesLoading && <p className="text-[var(--taupe)]">{t.loading}</p>}
          {!servicesLoading && services.length === 0 && (
            <p className="empty-state">{t.noServices}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => {
              const selected = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleService(s)}
                  className={`card tap flex min-h-[4.5rem] items-center justify-between gap-3 p-4 text-left transition ${
                    selected
                      ? "border-[var(--ink)] bg-[var(--paper)] ring-1 ring-[var(--ink)]"
                      : "hover:bg-[var(--paper)]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="heading-section text-xl leading-tight">
                      {s.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--taupe)]">
                      {s.durationMin}
                      {t.minutes}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-medium">
                      {money(s.priceCents, locale)}
                    </p>
                    {selected ? (
                      <p className="mt-1 text-xs font-medium text-[var(--ink)]">
                        ✓
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedServices.length > 0 && (
            <div className="card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 border-[var(--ink)] p-4 shadow-sm">
              <div>
                <p className="text-sm text-[var(--taupe)]">
                  {t.selectedTotal} · {selectedServices.length}
                </p>
                <p className="heading-section text-lg">
                  {totalDuration}
                  {t.minutes} · {money(totalPrice, locale)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setDate(null);
                  setTime(null);
                  setSlots([]);
                  setStep(3);
                }}
              >
                {t.continue}
              </button>
            </div>
          )}
          {!servicesLoading &&
            services.length > 0 &&
            selectedServices.length === 0 && (
              <p className="text-sm text-[var(--taupe)]">{t.selectAtLeastOne}</p>
            )}
        </section>
      )}

      {step === 3 && selectedPro && selectedServices.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="heading-section text-2xl">{t.pickDay}</h2>
              <p className="text-sm text-[var(--taupe)]">
                {selectedPro.name} · {servicesLabel}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {totalDuration}
                {t.minutes} · {money(totalPrice, locale)}
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              {t.back}
            </button>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                className="tap rounded-full border border-[var(--line)] px-3"
                onClick={() =>
                  setCursor((c) => {
                    const d = new Date(c.y, c.m - 1, 1);
                    return { y: d.getFullYear(), m: d.getMonth() };
                  })
                }
              >
                ‹
              </button>
              <p className="heading-section text-base capitalize">
                {monthLabel}
              </p>
              <button
                className="tap rounded-full border border-[var(--line)] px-3"
                onClick={() =>
                  setCursor((c) => {
                    const d = new Date(c.y, c.m + 1, 1);
                    return { y: d.getFullYear(), m: d.getMonth() };
                  })
                }
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted)]">
              {DAY_LABELS.map((d, i) => (
                <div key={i} className="py-2">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day == null) return <div key={i} />;
                const ds = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dow = new Date(
                  Date.UTC(cursor.y, cursor.m, day, 12)
                ).getUTCDay();
                const closed = dow === 0 || dow === 1;
                const past = ds < today;
                const disabled = closed || past;
                const selected = date === ds;
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => {
                      setDate(ds);
                      setTime(null);
                      setSlots([]);
                      setSlotsLoading(true);
                    }}
                    className={`tap min-h-12 rounded-[12px] text-base font-medium ${
                      selected
                        ? "bg-[var(--ink)] text-[var(--ivory)]"
                        : disabled
                          ? "text-[var(--muted)]/40"
                          : "hover:bg-[var(--paper)]"
                    }`}
                    title={closed ? t.closed : past ? t.past : ds}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {date && (
            <div>
              <h3 className="mb-3 heading-section text-xl">{t.pickTime}</h3>
              {slotsLoading && <p className="text-[var(--taupe)]">{t.loading}</p>}
              {!slotsLoading && slots.length === 0 && (
                <p className="text-[var(--taupe)]">{t.noSlots}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    className={`tap min-h-14 rounded-full border px-5 text-base font-medium ${
                      time === s
                        ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--ivory)]"
                        : "border-[var(--line)]"
                    }`}
                    onClick={() => setTime(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {time && (
                <button
                  className="btn btn-primary mt-6"
                  onClick={() => setStep(4)}
                >
                  {t.continue}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {step === 4 &&
        selectedPro &&
        selectedServices.length > 0 &&
        date &&
        time && (
          <section className="mx-auto max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="heading-section text-2xl">{t.stepDetails}</h2>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>
                {t.back}
              </button>
            </div>
            <div className="card space-y-1 p-3.5 text-sm text-[var(--taupe)]">
              <p>
                {servicesLabel} · {selectedPro.name}
              </p>
              <p>
                {date} · {time} · {totalDuration}
                {t.minutes} · {money(totalPrice, locale)}
              </p>
              <p>{selectedPro.address}</p>
            </div>
            <label className="block text-sm">
              {t.yourName}
              <input
                className="input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              {t.phone}
              <div className="mt-1 flex overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--ivory)] focus-within:border-[var(--ink)]">
                <span
                  className="inline-flex items-center border-r border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-medium text-[var(--taupe)]"
                  title="United States"
                >
                  +1
                </span>
                <input
                  className="min-h-12 w-full flex-1 border-0 bg-transparent px-3 text-base outline-none"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  onBlur={() => setPhoneError(validatePhoneField(phone))}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="(832) 362-1746"
                  required
                  aria-invalid={!!phoneError}
                  aria-describedby="phone-hint"
                />
              </div>
              <p
                id="phone-hint"
                className={`mt-1 text-xs ${phoneError ? "text-red-700" : "text-[var(--muted)]"}`}
              >
                {phoneError || t.phoneHint}
              </p>
            </label>
            <label className="block text-sm">
              {t.emailOptional}
              <input
                className="input mt-1"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => setEmailError(validateEmailField(email))}
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-700">{emailError}</p>
              )}
            </label>
            <label className="block text-sm">
              {t.notes}
              <textarea
                className="input mt-1 min-h-[6rem] py-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              className="btn btn-primary w-full"
              disabled={
                loading ||
                name.trim().length < 2 ||
                !!phoneError ||
                !!emailError ||
                phone.trim().length < 7
              }
              onClick={submit}
            >
              {loading ? t.submitting : t.submit}
            </button>
          </section>
        )}

      {step === 5 && confirm && (
        <section className="mx-auto max-w-lg space-y-5">
          <p className="chip">{t.confirmed}</p>
          <h2 className="heading-display text-3xl tracking-tight sm:text-4xl">
            {confirm.refCode}
          </h2>
          <p className="text-[var(--taupe)]">{t.sub}</p>
          <div className="card space-y-3 p-4 text-sm">
            <Row label={t.professional} value={confirm.professionalName} />
            <Row label={t.stepService} value={confirm.serviceName} />
            <Row label={t.date} value={confirm.whenLabel} />
            {confirm.durationMin ? (
              <Row
                label={t.duration}
                value={`${confirm.durationMin}${t.minutes}`}
              />
            ) : null}
            <Row label={t.place} value={confirm.place} />
            <Row label={t.price} value={money(confirm.priceCents, locale)} />
          </div>
          <div className="flex flex-col gap-3">
            {confirm.whatsappUrl ? (
              <a
                className="btn btn-primary w-full"
                href={confirm.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t.whatsappBtn}
              </a>
            ) : null}
            {calendarEvent ? (
              <>
                <a
                  className="btn btn-ghost w-full"
                  href={googleCalendarUrl(calendarEvent)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.googleCalendar}
                </a>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={() =>
                    downloadIcs(
                      calendarEvent,
                      `${confirm.refCode.toLowerCase()}.ics`
                    )
                  }
                >
                  {t.downloadIcs}
                </button>
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2 last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
