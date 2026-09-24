"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  services,
  formatPrice,
  formatDuration,
  weeklyAvailability,
  dayNames,
  getServiceById,
} from "@/data/site";
import { formatDateEs, toDateKey } from "@/lib/time";

type Step = 1 | 2 | 3 | 4 | 5;

type Slot = { startTime: string; endTime: string };

type Props = {
  initialServiceId?: string;
};

export function BookingWizard({ initialServiceId }: Props) {
  const [step, setStep] = useState<Step>(initialServiceId ? 2 : 1);
  const [serviceId, setServiceId] = useState(initialServiceId || "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const service = useMemo(
    () => (serviceId ? getServiceById(serviceId) : undefined),
    [serviceId]
  );

  const openDays = useMemo(
    () => new Set(weeklyAvailability.map((a) => a.day)),
    []
  );

  const minDate = toDateKey(new Date());
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 60);
  const maxDate = toDateKey(maxDateObj);

  const loadSlots = useCallback(async (sid: string, d: string) => {
    setLoadingSlots(true);
    setError(null);
    setSlots([]);
    setStartTime("");
    try {
      const res = await fetch(
        `/api/slots?serviceId=${encodeURIComponent(sid)}&date=${encodeURIComponent(d)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los horarios");
      setSlots(data.slots || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar horarios");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (serviceId && date) {
      void loadSlots(serviceId, date);
    }
  }, [serviceId, date, loadSlots]);

  function onDateChange(value: string) {
    if (!value) {
      setDate("");
      return;
    }
    const [y, m, d] = value.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    if (!openDays.has(picked.getDay())) {
      setError(
        `Cerrado ese día. Abrimos: ${weeklyAvailability.map((a) => dayNames[a.day]).join(", ")}.`
      );
      setDate("");
      setSlots([]);
      return;
    }
    setError(null);
    setDate(value);
  }

  async function submit() {
    if (!service) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          date,
          startTime,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear la cita");
      }
      setConfirmed(true);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setSubmitting(false);
    }
  }

  const stepsLabel = ["Servicio", "Fecha", "Hora", "Datos", "Listo"];

  return (
    <div className="rounded-3xl border border-sand bg-white/80 p-5 shadow-sm sm:p-8">
      {/* Progress */}
      <ol className="mb-8 flex flex-wrap gap-2">
        {stepsLabel.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li
              key={label}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-rose text-white"
                  : done
                    ? "bg-blush/30 text-charcoal"
                    : "bg-sand text-muted"
              }`}
            >
              {n}. {label}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose" role="alert">
          {error}
        </div>
      )}

      {/* Step 1: service */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl text-charcoal">¿Qué te gustaría hacer?</h2>
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServiceId(s.id);
                setStep(2);
                setError(null);
              }}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-sand p-4 text-left transition hover:border-blush hover:bg-cream"
            >
              <div>
                <p className="font-medium text-charcoal">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDuration(s.durationMinutes)}</p>
              </div>
              <span className="font-semibold text-rose">{formatPrice(s.price)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: date */}
      {step === 2 && service && (
        <div>
          <h2 className="font-display text-xl text-charcoal">Elige la fecha</h2>
          <p className="mt-1 text-sm text-muted">
            {service.name} · {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
          </p>
          <label className="mt-6 block text-sm font-medium text-charcoal">
            Fecha
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand bg-cream px-4 py-3 text-charcoal outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            Abierto: {weeklyAvailability.map((a) => dayNames[a.day]).join(", ")}{" "}
            ({weeklyAvailability[0]?.open}–{weeklyAvailability[0]?.close})
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full px-4 py-2 text-sm text-muted hover:bg-sand"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={!date}
              onClick={() => setStep(3)}
              className="rounded-full bg-rose px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: time */}
      {step === 3 && service && (
        <div>
          <h2 className="font-display text-xl text-charcoal">Elige el horario</h2>
          <p className="mt-1 text-sm capitalize text-muted">{formatDateEs(date)}</p>

          {loadingSlots && (
            <p className="mt-6 text-sm text-muted">Buscando horarios libres…</p>
          )}

          {!loadingSlots && slots.length === 0 && (
            <p className="mt-6 text-sm text-muted">
              No hay horarios libres ese día. Prueba otra fecha.
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => setStartTime(slot.startTime)}
                className={`rounded-xl border px-2 py-2.5 text-sm transition ${
                  startTime === slot.startTime
                    ? "border-rose bg-rose text-white"
                    : "border-sand bg-cream text-charcoal hover:border-blush"
                }`}
              >
                {slot.startTime}
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full px-4 py-2 text-sm text-muted hover:bg-sand"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={!startTime}
              onClick={() => setStep(4)}
              className="rounded-full bg-rose px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: details */}
      {step === 4 && service && (
        <div>
          <h2 className="font-display text-xl text-charcoal">Tus datos</h2>
          <p className="mt-1 text-sm text-muted">
            {service.name} · {formatDateEs(date)} · {startTime}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block text-sm font-medium">
              Nombre completo
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-sand bg-cream px-4 py-2.5 outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-medium">
              Teléfono / WhatsApp
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-sand bg-cream px-4 py-2.5 outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm font-medium">
              Correo electrónico
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-sand bg-cream px-4 py-2.5 outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium">
              Notas (opcional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-sand bg-cream px-4 py-2.5 outline-none focus:border-blush focus:ring-2 focus:ring-blush/30"
                placeholder="Alergias, preferencias, etc."
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-full px-4 py-2 text-sm text-muted hover:bg-sand"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-rose px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Reservando…" : "Confirmar cita"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 5: success */}
      {(step === 5 || confirmed) && service && (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush/30 text-2xl text-rose">
            ✓
          </div>
          <h2 className="mt-4 font-display text-2xl text-charcoal">¡Cita confirmada!</h2>
          <p className="mt-3 text-sm text-muted">
            {service.name}
            <br />
            <span className="capitalize">{formatDateEs(date)}</span> a las {startTime}
            <br />
            {name} · {phone}
          </p>
          <p className="mt-4 text-xs text-muted">
            Guarda estos datos. Te contactaremos si hace falta reprogramar.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setServiceId("");
              setDate("");
              setStartTime("");
              setName("");
              setPhone("");
              setEmail("");
              setNotes("");
              setConfirmed(false);
              setError(null);
            }}
            className="mt-6 rounded-full border border-sand px-5 py-2 text-sm text-charcoal hover:bg-sand"
          >
            Agendar otra cita
          </button>
        </div>
      )}
    </div>
  );
}
