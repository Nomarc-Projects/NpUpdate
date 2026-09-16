"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Clock, ExternalLink, Save, Users, Wrench } from "lucide-react";
import { setMaintenance } from "@/lib/services/platform-settings";
import type { MaintenanceSetting } from "@/lib/services/platform-settings-shared";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

export function MaintenanceView({ current }: { current: MaintenanceSetting }) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [headline, setHeadline] = useState(current.headline);
  const [message, setMessage] = useState(current.message);
  const [etaText, setEtaText] = useState(current.etaText);
  const [allowEmails, setAllowEmails] = useState(current.allowEmails.join(", "));
  const [pending, start] = useTransition();

  /** Parse the comma/newline separated allowlist box into clean lowercase emails. */
  function parseAllow(): string[] {
    return allowEmails
      .split(/[,\n;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
  }

  function save(next: Partial<MaintenanceSetting>, successMsg: string) {
    start(async () => {
      try {
        await setMaintenance({
          enabled,
          headline,
          message,
          etaText,
          allowEmails: parseAllow(),
          ...next,
        });
        toast.success(successMsg);
      } catch {
        toast.error("Couldn't save. Check you're still signed in as an admin.");
      }
    });
  }

  /** The toggle saves immediately — a switch that needs a separate Save is how
   *  you end up believing the site is down when it isn't. */
  function toggle(v: boolean) {
    setEnabled(v);
    save({ enabled: v }, v ? "Maintenance mode is ON" : "Maintenance mode is OFF");
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* ── The switch ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 transition-colors dark:bg-[#1e1e1e]",
          enabled
            ? "border-[#ffd716] bg-[#fffdf2] dark:border-[#ffd716]/40 dark:bg-[#ffd716]/[0.04]"
            : "border-[#ececec] dark:border-white/10",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                enabled
                  ? "bg-[#ffd716] text-[#1e1e1e]"
                  : "bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5",
              )}
            >
              <Wrench size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
                Maintenance mode
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled
                  ? "The platform is hidden. Visitors and non-admin users see the maintenance page; you and other admins see the live site."
                  : "The platform is live and visible to everyone."}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!enabled)}
            disabled={pending}
            aria-label={enabled ? "Turn maintenance mode off" : "Turn maintenance mode on"}
            className={cn(
              "relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-[#22c55e]" : "bg-[#e3e3e3] dark:bg-white/10",
            )}
          >
            <div
              className={cn(
                "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
                enabled ? "left-[22px]" : "left-[3px]",
              )}
            />
          </button>
        </div>

        {enabled && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ffd716]/40 bg-white/60 px-3.5 py-3 dark:border-[#ffd716]/20 dark:bg-black/20">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[#b89500]" />
            <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/70">
              Sign-in stays open on purpose. Regular users can still authenticate — they just
              land on the maintenance page and keep their session, so when you switch this off
              they continue straight into the dashboard without signing in again.
            </p>
          </div>
        )}
      </div>

      {/* ── What visitors see ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
              What visitors see
            </p>
            <p className="text-[12px] text-[#9a9a9a]">
              Leave these as they are for the designed default copy.
            </p>
          </div>
          <Link
            href="/maintenance"
            target="_blank"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
          >
            <ExternalLink size={13} /> Preview
          </Link>
        </div>

        <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Headline
        </label>
        <input
          className={inputClass}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="We’ll be back shortly"
        />

        <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Message
        </label>
        <textarea
          className={cn(inputClass, "min-h-[92px] resize-y")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          <Clock size={12} className="mr-1 inline" /> Expected return (optional)
        </label>
        <input
          className={inputClass}
          value={etaText}
          onChange={(e) => setEtaText(e.target.value)}
          placeholder="Back by 6:00pm WAT"
        />
        <p className="mt-1.5 text-[11.5px] text-[#9a9a9a]">
          Free text, shown as a pill under the message. Leave empty to hide it.
        </p>
      </div>

      {/* ── Allowlist ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="mb-3 flex items-start gap-3.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5">
            <Users size={17} />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
              Allowed through
            </p>
            <p className="text-[12px] text-[#9a9a9a]">
              Admins always bypass. Add non-admin emails here to let testers or stakeholders in
              while maintenance is on.
            </p>
          </div>
        </div>
        <textarea
          className={cn(inputClass, "min-h-[72px] resize-y")}
          value={allowEmails}
          onChange={(e) => setAllowEmails(e.target.value)}
          placeholder="tester@example.com, stakeholder@example.com"
        />
        <p className="mt-1.5 text-[11.5px] text-[#9a9a9a]">
          Comma, semicolon or newline separated. The user must be signed in for this to apply.
        </p>
      </div>

      <button
        onClick={() => save({}, "Saved")}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60"
      >
        <Save size={15} /> {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
