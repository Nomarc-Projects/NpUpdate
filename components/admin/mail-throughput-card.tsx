"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Gauge, Save } from "lucide-react";
import { getMailThroughputSetting, setMailThroughput } from "@/lib/services/platform-settings";
import { MAIL_THROUGHPUT_DEFAULT } from "@/lib/services/platform-settings-shared";

/**
 * Sending-rate control.
 *
 * The setting, its clamp and the drain that honours it all existed, but nothing
 * rendered it, so the rate was only changeable through the database. This is the
 * surface: the number an admin actually reaches for when a blast is going out
 * too fast for the email plan, or too slowly to finish today.
 *
 * Reads through a server action on mount rather than being handed props, because
 * the settings page it sits on is a client component.
 */
const SCHEDULER_MINUTES = 5;

export function MailThroughputCard() {
  const [perHour, setPerHour] = useState(MAIL_THROUGHPUT_DEFAULT.emailsPerHour);
  const [batch, setBatch] = useState(MAIL_THROUGHPUT_DEFAULT.batchSize);
  const [loaded, setLoaded] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    getMailThroughputSetting()
      .then((s) => { setPerHour(s.emailsPerHour); setBatch(s.batchSize); })
      .catch(() => { /* defaults already shown */ })
      .finally(() => setLoaded(true));
  }, []);

  // What the numbers mean in practice, so the rate isn't an abstract figure.
  const perRun = Math.max(1, Math.round((perHour / 60) * SCHEDULER_MINUTES));
  const hoursFor = (n: number) => (n / Math.max(perHour, 1));

  function save() {
    start(async () => {
      try {
        const next = await setMailThroughput({ emailsPerHour: perHour, batchSize: batch });
        setPerHour(next.emailsPerHour);
        setBatch(next.batchSize);
        toast.success(`Sending capped at ${next.emailsPerHour} emails per hour.`);
      } catch {
        toast.error("Couldn't save the sending rate.");
      }
    });
  }

  const field =
    "w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716] transition-colors";

  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
      <div className="flex items-center gap-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#b89500] dark:bg-[#ffd716]/10">
          <Gauge size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">Email sending rate</p>
          <p className="text-[12px] text-[#9a9a9a]">Caps how fast campaigns leave the platform.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Emails per hour</span>
          <input
            type="number" min={1} max={5000} value={perHour} disabled={!loaded || busy}
            onChange={(e) => setPerHour(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Batch per run</span>
          <input
            type="number" min={1} max={200} value={batch} disabled={!loaded || busy}
            onChange={(e) => setBatch(Number(e.target.value))}
            className={field}
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl bg-[#faf9f4] px-4 py-3 dark:bg-white/[0.03]">
        <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
          At <strong className="text-[#1e1e1e] dark:text-white">{perHour}/hour</strong> the scheduler sends about{" "}
          <strong className="text-[#1e1e1e] dark:text-white">{perRun}</strong> emails every {SCHEDULER_MINUTES} minutes.
          A blast to 1,795 people would take roughly{" "}
          <strong className="text-[#1e1e1e] dark:text-white">{hoursFor(1795).toFixed(1)} hours</strong> to finish.
        </p>
        <p className="mt-1.5 text-[11.5px] text-[#9a9a9a]">
          Raising this past what the Resend rate limit allows causes failed sends, and can get the sending domain blocklisted. Values are clamped to 5,000/hour.
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button" onClick={save} disabled={!loaded || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-50"
        >
          <Save size={14} /> {busy ? "Saving…" : "Save rate"}
        </button>
      </div>
    </div>
  );
}
