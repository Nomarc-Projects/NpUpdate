"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Users } from "lucide-react";
import { setAboutTeam } from "@/lib/services/platform-settings";
import type { AboutTeamSetting } from "@/lib/services/platform-settings-shared";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

export function AboutTeamView({ current }: { current: AboutTeamSetting }) {
  const [enabled, setEnabled] = useState(current.enabled);
  const [heading, setHeading] = useState(current.heading);
  const [subtitle, setSubtitle] = useState(current.subtitle);
  const [eyebrow, setEyebrow] = useState(current.eyebrow);
  const [members, setMembers] = useState(
    current.members.map((m) => ({ name: m.name, role: m.role, img: m.img })),
  );
  const [pending, start] = useTransition();

  function setMember(
    i: number,
    patch: Partial<{ name: string; role: string; img: string }>,
  ) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function save(next: Partial<AboutTeamSetting>, successMsg: string) {
    start(async () => {
      try {
        await setAboutTeam({
          enabled,
          heading,
          subtitle,
          eyebrow,
          members: members.filter((m) => m.name.trim()),
          ...next,
        });
        toast.success(successMsg);
      } catch {
        toast.error("Couldn't save. Check you're still signed in as an admin.");
      }
    });
  }

  function toggle(v: boolean) {
    setEnabled(v);
    save({ enabled: v }, v ? "Section shown on the About page" : "Section hidden from the About page");
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
              <Users size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">
                Team section on the About page
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
                {enabled
                  ? "Visible to all visitors on /about. Heading, subtitle and the member cards below are what they see."
                  : "Hidden. The rest of the About page renders as normal; only this section is tucked away."}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!enabled)}
            disabled={pending}
            aria-label={enabled ? "Hide the team section" : "Show the team section"}
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
          Leave these as they are for the designed default copy.
        </p>

        <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Eyebrow
        </label>
        <input
          className={inputClass}
          value={eyebrow}
          onChange={(e) => setEyebrow(e.target.value)}
          placeholder="Meet the team"
        />

        <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Heading
        </label>
        <input
          className={inputClass}
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="The Minds Behind Nomarc"
        />

        <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
          Subtitle
        </label>
        <textarea
          className={cn(inputClass, "min-h-[80px] resize-y")}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>

      {/* ── Team members ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {members.map((m, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Member {i + 1}</p>
              {members.length > 1 && (
                <button
                  onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
                  Name
                </label>
                <input
                  className={inputClass}
                  value={m.name}
                  onChange={(e) => setMember(i, { name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
                  Role
                </label>
                <input
                  className={inputClass}
                  value={m.role}
                  onChange={(e) => setMember(i, { role: e.target.value })}
                  placeholder="Founder and CEO"
                />
              </div>
            </div>

            <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[#6b6b6b] dark:text-white/70">
              Photo
            </label>
            <p className="mb-2 text-[11.5px] text-[#9a9a9a]">
              {m.img ? (
                <>
                  Current: <span className="font-medium text-[#6b6b6b] dark:text-white/70">{m.img}</span>
                </>
              ) : (
                "No photo set — upload one or clear it to use the paved default."
              )}
            </p>
            <FileUpload
              accept="image/png,image/jpeg,image/webp"
              maxSizeMB={5}
              label="Upload photo (optional)"
              upload={(f) => uploadFile(f, "project")}
              onChange={(items) => {
                const u = items[0]?.url;
                if (u) setMember(i, { img: u });
              }}
            />
          </div>
        ))}

        <button
          onClick={() => setMembers((prev) => [...prev, { name: "", role: "", img: "" }])}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e3e3e3] px-5 py-3.5 text-[13px] font-semibold text-[#6b6b6b] transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:border-white/15 dark:text-white/70 dark:hover:text-white"
        >
          <Plus size={15} /> Add member
        </button>
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