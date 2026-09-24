"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/utils";

type CatalogService = {
  id: string;
  category: "lashes" | "brows";
  name: string;
  description: string;
  durationMin: number;
  fromPriceCents: number;
  available: boolean;
};

type ProCard = {
  id: string;
  name: string;
  bio: string;
  photoUrl: string;
  city: string;
  address: string;
  instagram: string;
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
  };
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

export function BookingWizard() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [selectedService, setSelectedService] = useState<CatalogService | null>(
    null
  );
  const [pros, setPros] = useState<ProCard[]>([]);
  const [selectedPro, setSelectedPro] = useState<ProCard | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [copied, setCopied] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) setDbError(true);
        setServices(d.services || []);
      })
      .catch(() => setDbError(true));
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    setLoading(true);
    fetch(`/api/professionals?service=${encodeURIComponent(selectedService.name)}`)
      .then((r) => r.json())
      .then((d) => setPros(d.professionals || []))
      .finally(() => setLoading(false));
  }, [selectedService]);

  useEffect(() => {
    if (!selectedPro || !date) return;
    setLoading(true);
    setTime(null);
    fetch(
      `/api/slots?professionalId=${selectedPro.id}&serviceId=${selectedPro.service.id}&date=${date}`
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .finally(() => setLoading(false));
  }, [selectedPro, date]);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );
  const today = todayStr();
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  async function submit() {
    if (!selectedPro || !date || !time) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedPro.id,
          professionalServiceId: selectedPro.service.id,
          date,
          time,
          clientName: name,
          clientPhone: phone,
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

  const lashes = services.filter((s) => s.category === "lashes");
  const brows = services.filter((s) => s.category === "brows");

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
      {!dbError && step === 1 && services.length === 0 && (
        <div className="card border-[var(--line)] p-4 text-sm text-[var(--taupe)]">
          {t.noServices}
        </div>
      )}

      <ol className="flex flex-wrap gap-3" aria-label="Booking steps">
        {[
          t.stepService,
          t.stepPro,
          t.stepWhen,
          t.stepDetails,
        ].map((label, i) => {
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
        })}
      </ol>

      {step === 1 && (
        <section className="space-y-8">
          <ServiceGroup
            title={t.lashes}
            items={lashes}
            locale={locale}
            minutesLabel={t.minutes}
            onSelect={(s) => {
              setSelectedService(s);
              setSelectedPro(null);
              setDate(null);
              setTime(null);
              setStep(2);
            }}
          />
          <ServiceGroup
            title={t.brows}
            items={brows}
            locale={locale}
            minutesLabel={t.minutes}
            onSelect={(s) => {
              setSelectedService(s);
              setSelectedPro(null);
              setDate(null);
              setTime(null);
              setStep(2);
            }}
          />
        </section>
      )}

      {step === 2 && selectedService && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-section text-2xl">{selectedService.name}</h2>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              {t.back}
            </button>
          </div>
          {loading && <p className="text-[var(--taupe)]">{t.loading}</p>}
          {!loading && pros.length === 0 && (
            <p className="empty-state">{t.noPros}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {pros.map((p) => (
              <button
                key={p.id}
                className="card tap flex gap-4 p-4 text-left transition hover:border-[var(--ink)]"
                onClick={() => {
                  setSelectedPro(p);
                  setStep(3);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl || "/avatars/luna.svg"}
                  alt=""
                  className="h-20 w-20 rounded-[12px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="heading-section text-lg">{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--taupe)]">
                    {p.bio}
                  </p>
                  <p className="mt-2 text-sm">
                    {p.address}
                    <span className="mx-2 text-[var(--muted)]">·</span>
                    {money(p.service.priceCents, locale)}
                    <span className="text-[var(--muted)]">
                      {" "}
                      / {p.service.durationMin}
                      {t.minutes}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && selectedPro && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="heading-section text-2xl">{t.pickDay}</h2>
              <p className="text-sm text-[var(--taupe)]">
                {selectedPro.name} · {selectedPro.service.name}
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
              <p className="heading-section text-base capitalize">{monthLabel}</p>
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
                const dow = new Date(Date.UTC(cursor.y, cursor.m, day, 12)).getUTCDay();
                const closed = dow === 0 || dow === 1;
                const past = ds < today;
                const disabled = closed || past;
                const selected = date === ds;
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => setDate(ds)}
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
              {loading && <p className="text-[var(--taupe)]">{t.loading}</p>}
              {!loading && slots.length === 0 && (
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

      {step === 4 && selectedPro && date && time && (
        <section className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-section text-2xl">{t.stepDetails}</h2>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>
              {t.back}
            </button>
          </div>
          <div className="card space-y-1 p-3.5 text-sm text-[var(--taupe)]">
            <p>
              {selectedPro.service.name} · {selectedPro.name}
            </p>
            <p>
              {date} · {time} · {money(selectedPro.service.priceCents, locale)}
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
            <input
              className="input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
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
            disabled={loading || name.trim().length < 2 || phone.trim().length < 7}
            onClick={submit}
          >
            {loading ? t.submitting : t.submit}
          </button>
        </section>
      )}

      {step === 5 && confirm && (
        <section className="mx-auto max-w-lg space-y-5">
          <p className="chip">{t.confirmed}</p>
          <h2 className="heading-display text-3xl tracking-tight sm:text-4xl">{confirm.refCode}</h2>
          <div className="card space-y-3 p-4 text-sm">
            <Row label={t.professional} value={confirm.professionalName} />
            <Row label={t.stepService} value={confirm.serviceName} />
            <Row label={t.date} value={confirm.whenLabel} />
            <Row label={t.place} value={confirm.place} />
            <Row label={t.price} value={money(confirm.priceCents, locale)} />
          </div>
          {confirm.whatsappUrl ? (
            <a
              className="btn btn-primary w-full"
              href={confirm.whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t.whatsappBtn}
            </a>
          ) : (
            <button
              className="btn btn-primary w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(confirm.message);
                setCopied(true);
                toast("Copied");
              }}
            >
              {copied ? t.copied : t.copyMsg}
            </button>
          )}
          {!confirm.whatsappUrl ? null : (
            <button
              className="btn btn-ghost w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(confirm.message);
                setCopied(true);
                toast("Copied");
              }}
            >
              {copied ? t.copied : t.copyMsg}
            </button>
          )}
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

function ServiceGroup({
  title,
  items,
  locale,
  minutesLabel,
  onSelect,
}: {
  title: string;
  items: CatalogService[];
  locale: string;
  minutesLabel: string;
  onSelect: (s: CatalogService) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="mb-3 heading-section text-xl">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <button
            key={s.id}
            disabled={!s.available}
            onClick={() => onSelect(s)}
            className="card tap flex min-h-[4.5rem] items-center justify-between gap-3 p-4 text-left transition hover:bg-[var(--paper)] disabled:opacity-40"
          >
            <div>
              <p className="heading-section text-xl leading-tight">{s.name}</p>
              <p className="mt-1 text-sm text-[var(--taupe)]">
                {s.durationMin}
                {minutesLabel}
              </p>
            </div>
            <p className="text-xl font-medium">{money(s.fromPriceCents, locale)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
