"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Link2, Sparkles } from "lucide-react";
import type { LogoStripSetting } from "@/lib/services/platform-settings-shared";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

type Draft = { name: string; src: string; href: string };

/**
 * Copy for one strip. The two homepage logo strips are curated identically —
 * heading, on/off switch, ordered company cards — so only the words differ and
 * they are passed in rather than hardcoded here.
 */
export type LogoStripCopy = {
  /** Heading of the switch card, e.g. "Key Players marquee on the homepage". */
  title: string;
  /** Shown under the title while the strip is live. */
  shownHint: string;
  /** Shown under the title while the strip is hidden. */
  hiddenHint: string;
  /** aria-label for the on/off switch, given its current state. */
  toggleLabel: (enabled: boolean) => string;
  /** Toast when the strip is switched on. */
  showMessage: string;
  /** Toast when the strip is switched off. */
  hideMessage: string;
  /** Placeholder for the heading input. */
  headingPlaceholder: string;
  /** Placeholder for a company name input. */
  namePlaceholder: string;
  /** Placeholder for the mark-image caption when none is set. */
  emptyImageHint: string;
};

/**
 * Editor for one homepage logo strip. `save` is the caller's server action
 * (setKeyPlayers / setTrustedClients) so the permission check and the audit
 * trail stay with the setting rather than living in the UI.
 */
export function LogoStripView({
  current,
  save,
  copy,
}: {
  current: LogoStripSetting;
  save: (input: Partial<LogoStripSetting>) => Promise<LogoStripSetting>;
  copy: LogoStripCopy;
}) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [heading, setHeading] = useState(current.heading);
  const [logos, setLogos] = useState<Draft[]>(
    current.logos.map((l) => ({ name: l.name, src: l.src, href: l.href })),
  );
  const [pending, start] = useTransition();

  const setLogo = (i: number, patch: Partial<Draft>) =>
    setLogos((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const move = (i: number, dir: -1 | 1) =>
    setLogos((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function persist(next: Partial<LogoStripSetting>, successMsg: string) {
    start(async () => {
      try {
        await save({
          enabled,
          heading,
          logos: logos.filter((l) => l.name.trim()),
          ...next,
        });
        toast.success(successMsg);
      } catch {
        toast.error("Couldn't save. Check you're still signed in as a super admin.");
      }
    });
  }

  function toggle(v: boolean) {
    setEnabled(v);
    persist({ enabled: v }, v ? copy.showMessage : copy.hideMessage);
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
                enabled ? "bg-[#ffd716] text-[#1e1e1e]" : "bg-[#f5f5f5] text-[#9a9a9a] dark:bg-white/5",
              )}
            >
              <Sparkles size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{copy.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled ? copy.shownHint : copy.hiddenHint}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!enabled)}
            disabled={pending}
            aria-label={copy.toggleLabel(enabled)}
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
      </div>

      {/* ── Section copy ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
        <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">Section copy</p>
        <p className="mb-4 mt-0.5 text-[12px] text-[#9a9a9a]">
          Leave the heading as is for the designed default copy.
        </p>

        <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Heading
        </label>
        <input
          className={inputClass}
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder={copy.headingPlaceholder}
        />
      </div>

      {/* ── Company cards ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {logos.map((l, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Company {i + 1}</p>
              <div className="flex items-center gap-1">
                {(logos.length > 1 && (
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-lg p-1.5 text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <ArrowUp size={15} />
                  </button>
                ))}
                {(logos.length > 1 && (
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === logos.length - 1}
                    aria-label="Move down"
                    className="rounded-lg p-1.5 text-[#9a9a9a] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e] disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <ArrowDown size={15} />
                  </button>
                ))}
                <button
                  onClick={() => setLogos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
                  Name
                </label>
                <input
                  className={inputClass}
                  value={l.name}
                  onChange={(e) => setLogo(i, { name: e.target.value })}
                  placeholder={copy.namePlaceholder}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
                  Link
                </label>
                <div className="relative">
                  <Link2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                  <input
                    className={cn(inputClass, "pl-9")}
                    value={l.href}
                    onChange={(e) => setLogo(i, { href: e.target.value })}
                    placeholder="https://… (empty = not clickable)"
                    inputMode="url"
                  />
                </div>
              </div>
            </div>

            <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
              Mark image
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {l.src && (
                <img
                  src={l.src}
                  alt={l.name || "Company mark"}
                  className="h-10 w-24 rounded-lg border border-[#ececec] bg-white p-1 object-contain object-center dark:border-white/10"
                />
              )}
              <p className="text-[11.5px] text-[#9a9a9a]">
                {l.src ? `Current: ${l.src}` : copy.emptyImageHint}
              </p>
            </div>
            <FileUpload
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              maxSizeMB={5}
              label="Upload mark (optional)"
              upload={(f) => uploadFile(f, "logo")}
              onChange={(items) => {
                const u = items[0]?.url;
                if (u) setLogo(i, { src: u });
              }}
            />
          </div>
        ))}

        <button
          onClick={() => setLogos((prev) => [...prev, { name: "", src: "", href: "" }])}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e3e3e3] px-5 py-3.5 text-[13px] font-semibold text-[#6b6b6b] transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:border-white/15 dark:text-white/70 dark:hover:text-white"
        >
          <Plus size={15} /> Add company
        </button>
      </div>

      <button
        onClick={() => persist({}, "Saved")}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60"
      >
        <Save size={15} /> {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
