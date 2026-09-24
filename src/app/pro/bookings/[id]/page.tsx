"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";
import { money, whatsappLink } from "@/lib/utils";
import {
  formatHoustonTime,
  houstonDateTime,
  type ProBooking,
} from "@/lib/pro-booking-ui";

export default function ProBookingDetailPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [booking, setBooking] = useState<ProBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ProBooking["status"]>("requested");

  async function load() {
    setLoading(true);
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/pro/bookings?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.booking) {
        toast(data.error || t.errorGeneric, "error");
        setBooking(null);
        return;
      }
      const b = data.booking as ProBooking;
      setBooking(b);
      const dt = houstonDateTime(b.startAt);
      setDate(dt.date);
      setTime(dt.time);
      setNotes(b.notes || "");
      setStatus(b.status);
    } catch {
      toast(t.errorGeneric, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty = useMemo(() => {
    if (!booking) return false;
    const dt = houstonDateTime(booking.startAt);
    return (
      date !== dt.date ||
      time !== dt.time ||
      notes !== (booking.notes || "") ||
      status !== booking.status
    );
  }, [booking, date, time, notes, status]);

  const isTrashed = Boolean(booking?.deletedAt);

  async function save(extra?: { status?: ProBooking["status"] }) {
    if (!booking || saving) return;
    const nextStatus = extra?.status ?? status;
    setSaving(true);
    try {
      const res = await fetch("/api/pro/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          date,
          time,
          notes,
          status: nextStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || t.errorGeneric, "error");
        return;
      }
      if (data.clientEmailStatus === "sent") {
        toast(
          nextStatus === "confirmed" && booking.status !== "confirmed"
            ? t.confirmedToast
            : t.appointmentSaved
        );
      } else {
        toast(t.appointmentSaved);
      }
      if (extra?.status) setStatus(extra.status);
      await load();
    } catch {
      toast(t.errorGeneric, "error");
    } finally {
      setSaving(false);
    }
  }

  async function softDelete() {
    if (!booking || saving) return;
    if (!window.confirm(t.confirmDeleteBooking)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pro/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, deleted: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || t.errorGeneric, "error");
        return;
      }
      toast(t.appointmentDeleted);
      router.push("/pro");
    } catch {
      toast(t.errorGeneric, "error");
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    if (!booking || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pro/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, deleted: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || t.errorGeneric, "error");
        return;
      }
      toast(t.appointmentRestored);
      await load();
    } catch {
      toast(t.errorGeneric, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="pt-10 text-[var(--taupe)]">{t.loading}</p>;
  }

  if (!booking) {
    return (
      <div className="space-y-4 pt-8">
        <p className="empty-state">{t.noAppointments}</p>
        <Link href="/pro" className="btn btn-ghost">
          {t.backToAppointments}
        </Link>
      </div>
    );
  }

  const waText = `Hi ${booking.clientName}, this is about your Anak.Studio appointment on ${date} at ${formatHoustonTime(booking.startAt)} (Houston).`;
  const wa = whatsappLink(booking.clientPhone, waText);

  return (
    <div className="mx-auto max-w-xl space-y-6 pt-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pro" className="btn btn-ghost text-sm">
          ← {t.backToAppointments}
        </Link>
        {isTrashed && (
          <span className="chip">{t.filterDeleted}</span>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          {t.appointments}
        </p>
        <h1 className="mt-1 heading-display text-3xl sm:text-4xl">
          {booking.clientName}
        </h1>
        <p className="mt-2 text-[var(--taupe)]">
          {booking.serviceName || t.services}
          {" · "}
          {money(booking.priceCents, locale)}
        </p>
      </div>

      <div className="card space-y-3 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-[var(--muted)]">{t.phone}</span>
          <a className="font-medium" href={`tel:${booking.clientPhone}`}>
            {booking.clientPhone}
          </a>
        </div>
        {booking.clientEmail ? (
          <div className="flex justify-between gap-3">
            <span className="text-[var(--muted)]">{t.email}</span>
            <a className="font-medium" href={`mailto:${booking.clientEmail}`}>
              {booking.clientEmail}
            </a>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span className="text-[var(--muted)]">{t.status}</span>
          <span className="font-medium capitalize">
            {status === "requested"
              ? t.requested
              : status === "confirmed"
                ? t.confirmedStatus
                : status === "done"
                  ? t.done
                  : t.cancelled}
          </span>
        </div>
      </div>

      {isTrashed ? (
        <div className="space-y-3">
          <p className="empty-state">{t.deletedBookingHint}</p>
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={saving}
            onClick={restore}
          >
            {saving ? t.loading : t.restoreAppointment}
          </button>
        </div>
      ) : (
        <form
          className="card space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              {t.date}
              <input
                className="input mt-1"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              {t.time}
              <input
                className="input mt-1"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="text-sm block">
            {t.status}
            <select
              className="input mt-1"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ProBooking["status"])
              }
            >
              <option value="requested">{t.requested}</option>
              <option value="confirmed">{t.confirmedStatus}</option>
              <option value="done">{t.done}</option>
              <option value="cancelled">{t.cancelled}</option>
            </select>
          </label>

          <label className="text-sm block">
            {t.notes}
            <textarea
              className="input mt-1 min-h-[5rem]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving || !dirty}
            >
              {saving ? t.loading : t.save}
            </button>
            {status === "requested" && (
              <button
                type="button"
                className="btn btn-ghost flex-1"
                disabled={saving}
                onClick={() => save({ status: "confirmed" })}
              >
                {t.saveAndConfirm}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            {wa ? (
              <a
                className="btn btn-ghost"
                href={wa}
                target="_blank"
                rel="noreferrer"
              >
                {t.whatsappBtn}
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost text-red-800"
              disabled={saving}
              onClick={softDelete}
            >
              {t.deleteAppointment}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
