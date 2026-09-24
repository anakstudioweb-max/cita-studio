"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { money, todayHoustonDateStr } from "@/lib/utils";
import {
  formatHoustonDayLabel,
  formatHoustonTime,
  houstonDateStr,
  type ProBooking,
} from "@/lib/pro-booking-ui";

type Filter = "upcoming" | "requested" | "confirmed" | "past" | "deleted";

type Totals = {
  requested: number;
  confirmed: number;
  done: number;
  cancelled: number;
};

function statusChipClass(status: ProBooking["status"]) {
  switch (status) {
    case "requested":
      return "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]";
    case "confirmed":
      return "bg-[var(--ink)] text-[var(--ivory)] border-[var(--ink)]";
    case "done":
      return "bg-[var(--paper)] text-[var(--taupe)] border-[var(--line)]";
    case "cancelled":
      return "bg-transparent text-[var(--muted)] border-[var(--line)] line-through decoration-transparent";
    default:
      return "";
  }
}

function monthLabel(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 15));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(ym: string): { dateStr: string; dow: number }[] {
  const [y, m] = ym.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: { dateStr: string; dow: number }[] = [];
  for (let day = 1; day <= count; day++) {
    const dateStr = `${ym}-${String(day).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay();
    out.push({ dateStr, dow });
  }
  return out;
}

export function ProAppointments({
  locale,
}: {
  locale: string;
}) {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<ProBooking[]>([]);
  const [totals, setTotals] = useState<Totals>({
    requested: 0,
    confirmed: 0,
    done: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [month, setMonth] = useState(() => todayHoustonDateStr().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const today = todayHoustonDateStr();

  async function load() {
    setLoading(true);
    try {
      const trash = filter === "deleted" ? "&trash=1" : "";
      const res = await fetch(`/api/pro/bookings?${trash.replace(/^&/, "")}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      if (filter !== "deleted") setTotals(data.totals || totals);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const byDay = useMemo(() => {
    const map = new Map<string, ProBooking[]>();
    for (const b of bookings) {
      const d = houstonDateStr(b.startAt);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(b);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
    }
    return map;
  }, [bookings]);

  const filteredList = useMemo(() => {
    const now = Date.now();
    let list = [...bookings];
    if (filter === "upcoming") {
      // All future (from now), ignore selected calendar day — chip clears selectedDay.
      list = list.filter(
        (b) =>
          new Date(b.startAt).getTime() >= now &&
          b.status !== "cancelled" &&
          b.status !== "done"
      );
    } else if (filter === "requested") {
      list = list.filter((b) => b.status === "requested");
    } else if (filter === "confirmed") {
      list = list.filter((b) => b.status === "confirmed");
    } else if (filter === "past") {
      list = list.filter(
        (b) =>
          new Date(b.startAt).getTime() < now ||
          b.status === "done" ||
          b.status === "cancelled"
      );
    }
    // deleted: API already returns trash only
    list.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    if (filter === "past" || filter === "deleted") list.reverse();
    return list;
  }, [bookings, filter]);

  const dayList = useMemo(() => {
    if (!selectedDay) return null;
    return (byDay.get(selectedDay) || []).filter((b) => {
      if (filter === "deleted") return true;
      if (filter === "requested") return b.status === "requested";
      if (filter === "confirmed") return b.status === "confirmed";
      return true;
    });
  }, [selectedDay, byDay, filter]);

  const calendarDays = daysInMonth(month);
  const leadBlank = calendarDays[0]?.dow ?? 0;

  const statusLabel = (s: ProBooking["status"]) => {
    if (s === "requested") return t.requested;
    if (s === "confirmed") return t.confirmedStatus;
    if (s === "done") return t.done;
    return t.cancelled;
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "upcoming", label: t.filterUpcoming },
    { id: "requested", label: t.requested },
    { id: "confirmed", label: t.confirmedStatus },
    { id: "past", label: t.filterPast },
    { id: "deleted", label: t.filterDeleted },
  ];

  function BookingRow({ b }: { b: ProBooking }) {
    return (
      <Link
        href={`/pro/bookings/${b.id}`}
        className="card tap flex items-center justify-between gap-3 p-4 transition hover:border-[var(--ink)]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="heading-section text-lg truncate">{b.clientName}</p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusChipClass(b.status)}`}
            >
              {statusLabel(b.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--taupe)] truncate">
            {formatHoustonTime(b.startAt)}
            {b.serviceName ? ` · ${b.serviceName}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="heading-section text-base">{money(b.priceCents, locale)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">→</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      {filter !== "deleted" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["requested", t.requested],
              ["confirmed", t.confirmedStatus],
              ["done", t.done],
              ["cancelled", t.cancelled],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="card p-3.5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-1 heading-section text-xl">
                {money(totals[k], locale)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`tap rounded-full px-3.5 py-1.5 text-sm ${
              filter === f.id
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "border border-[var(--line)] text-[var(--taupe)]"
            }`}
            onClick={() => {
              setFilter(f.id);
              setSelectedDay(null);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter !== "deleted" && (
        <div className="card mx-auto max-w-[17rem] overflow-hidden p-2 sm:max-w-[18rem] sm:p-2.5">
          <div className="mb-1 flex items-center justify-between gap-1">
            <button
              type="button"
              className="tap rounded-full px-1.5 py-0.5 text-sm text-[var(--taupe)] hover:bg-[var(--paper)]"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="heading-section text-xs capitalize sm:text-sm">
              {monthLabel(month, locale)}
            </p>
            <button
              type="button"
              className="tap rounded-full px-1.5 py-0.5 text-sm text-[var(--taupe)] hover:bg-[var(--paper)]"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-px text-center text-[9px] uppercase tracking-wide text-[var(--muted)]">
            {[t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat].map((d) => (
              <div key={d} className="py-0.5">
                {d.slice(0, 1)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: leadBlank }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {calendarDays.map(({ dateStr }) => {
              const count = byDay.get(dateStr)?.length ?? 0;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDay((d) => (d === dateStr ? null : dateStr))
                  }
                  className={`relative flex h-6 flex-col items-center justify-center rounded text-[10px] transition sm:h-7 sm:text-[11px] ${
                    isSelected
                      ? "bg-[var(--ink)] text-[var(--ivory)]"
                      : isToday
                        ? "bg-[var(--paper)] text-[var(--ink)]"
                        : "hover:bg-[var(--paper)]"
                  }`}
                >
                  <span className="font-medium leading-none">
                    {Number(dateStr.slice(8))}
                  </span>
                  {count > 0 && (
                    <span
                      className={`mt-0.5 h-0.5 w-0.5 rounded-full ${
                        isSelected ? "bg-[var(--ivory)]" : "bg-[var(--ink)]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && dayList && filter !== "deleted" && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {t.pickDay}
              </p>
              <h3 className="heading-section text-xl">
                {formatHoustonDayLabel(selectedDay, locale)}
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => setSelectedDay(null)}
            >
              {t.allDays}
            </button>
          </div>
          {dayList.map((b) => (
            <BookingRow key={b.id} b={b} />
          ))}
          {!dayList.length && (
            <p className="empty-state">{t.noAppointmentsDay}</p>
          )}
        </div>
      )}

      {(!selectedDay || filter === "deleted") && (
        <div className="space-y-3">
          <h3 className="heading-section text-xl">
            {filter === "deleted"
              ? t.filterDeleted
              : filter === "upcoming"
                ? t.filterUpcoming
                : filter === "past"
                  ? t.filterPast
                  : filter === "requested"
                    ? t.requested
                    : t.confirmedStatus}
          </h3>
          {loading && <p className="text-[var(--taupe)]">{t.loading}</p>}
          {!loading &&
            filteredList.map((b) => <BookingRow key={b.id} b={b} />)}
          {!loading && !filteredList.length && (
            <p className="empty-state">
              {filter === "deleted"
                ? t.noDeletedAppointments
                : t.noAppointments}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
