"use client";

import { Clock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Date + time, built on the house DatePicker rather than the browser's
 * `datetime-local` control.
 *
 * `datetime-local` renders as the OS widget — the "mm/dd/yyyy --:-- --" stub —
 * which ignores the brand entirely, has no dark mode, and formats to the
 * viewer's locale, so a Nigerian admin scheduling a blast reads a US date.
 * Composing the existing calendar popover keeps the Material-style day/month/
 * year navigation already used elsewhere in the app and stays on-brand in both
 * themes.
 *
 * Controlled on the same string shape `datetime-local` used —
 * "yyyy-MM-ddTHH:mm" — so call sites and anything parsing the value are
 * unchanged.
 */
export function DateTimePicker({
  value,
  onChange,
  className = "",
  minuteStep = 15,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** Granularity of the time list. 15 keeps it to 96 options rather than 1,440. */
  minuteStep?: number;
}) {
  const [datePart = "", timePart = ""] = value.split("T");

  // Times are built as a fixed list so the value can never be a partial entry
  // like "1:" — a scheduled send with an unparseable time would fail silently
  // at the point it was supposed to go out.
  const times: string[] = [];
  for (let m = 0; m < 24 * 60; m += minuteStep) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }

  const label = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  function setDate(iso: string) {
    // Picking a date first is the natural order, so default the time to 09:00
    // rather than leaving a date with no time (which reads as scheduled but
    // cannot be sent).
    onChange(iso ? `${iso}T${timePart || "09:00"}` : "");
  }
  function setTime(t: string) {
    if (!datePart) return; // no date yet — nothing meaningful to attach it to
    onChange(`${datePart}T${t}`);
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <DatePicker value={datePart} onChange={setDate} placeholder="Pick a date" />
      <div className="relative">
        <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
        <select
          value={timePart || "09:00"}
          onChange={(e) => setTime(e.target.value)}
          disabled={!datePart}
          aria-label="Scheduled time"
          className="h-[38px] appearance-none rounded-lg border border-[#e3e3e3] bg-white pl-8 pr-8 text-[13px] text-[#1e1e1e] transition-colors focus:border-[#ffd716] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-[#161616] dark:text-white"
        >
          {times.map((t) => (
            <option key={t} value={t} className="dark:bg-[#1e1e1e]">
              {label(t)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
