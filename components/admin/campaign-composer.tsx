"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Search, X, Check } from "lucide-react";
import { RichEditor } from "@/components/admin/rich-editor";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SelectMenu } from "@/components/ui/select-menu";
import {
  saveCampaign, sendTestEmail, startCampaignSend, scheduleCampaign,
  getCampaignAudienceCount, searchCampaignRecipients, type CampaignRow,
} from "@/lib/services/campaigns";

const inputClass =
  "w-full rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 text-[13px] text-[#1e1e1e] outline-none transition-colors placeholder:text-[#b3b3b3] focus:border-[#ffd716] dark:border-white/15 dark:bg-[#161616] dark:text-white";

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
      <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
      <p className="mb-4 mt-0.5 text-[12.5px] text-[#9a9a9a]">{hint}</p>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, optional, children }: { label: string; htmlFor: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-semibold text-[#1e1e1e] dark:text-white">
        {label} {optional && <span className="font-normal text-[#9a9a9a]">(Optional)</span>}
      </label>
      {children}
    </div>
  );
}

export type SegmentOption = { id: string; name: string };

export type Recipient = { id: string; name: string; email: string };

/**
 * The six audiences. Four resolve from a role filter; the last two carry an
 * explicit list, which is why the audience can no longer be a single string.
 */
export type AudienceKind = "all_users" | "professionals" | "exhibitors" | "employers" | "custom" | "segments";

const AUDIENCE_LABEL: Record<AudienceKind, string> = {
  all_users: "All Active Users",
  professionals: "Professionals",
  exhibitors: "Exhibitors",
  employers: "Employers",
  custom: "Custom recipients",
  segments: "Segments",
};
const AUDIENCE_OPTIONS = Object.values(AUDIENCE_LABEL);
const AUDIENCE_BY_LABEL = Object.fromEntries(
  Object.entries(AUDIENCE_LABEL).map(([k, v]) => [v, k as AudienceKind]),
) as Record<string, AudienceKind>;

/**
 * Searchable people picker for "Custom recipients".
 *
 * Search rather than a full list: the user table is already ~1,800 rows, and the
 * server caps results at 25 and needs two characters before it will look, so this
 * cannot turn into a table scan on every keystroke.
 */
function RecipientPicker({ selected, onChange }: { selected: Recipient[]; onChange: (r: Recipient[]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    const mine = ++reqId.current;
    setSearching(true);
    // Debounced: one request per pause, not one per keystroke.
    const t = setTimeout(() => {
      searchCampaignRecipients(q)
        .then((r: Recipient[]) => { if (mine === reqId.current) setResults(r); })
        .catch(() => { if (mine === reqId.current) setResults([]); })
        .finally(() => { if (mine === reqId.current) setSearching(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const add = (r: Recipient) => {
    if (!selected.some((s) => s.id === r.id)) onChange([...selected, r]);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="mt-4 rounded-xl border border-[#ececec] p-4 dark:border-white/10">
      <p className="mb-2 text-[12px] font-semibold text-[#1e1e1e] dark:text-white">
        Recipients {selected.length > 0 && <span className="font-normal text-[#9a9a9a]">({selected.length} selected)</span>}
      </p>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[12px] text-[#1e1e1e] dark:bg-white/5 dark:text-white">
              {r.name || r.email}
              <button type="button" onClick={() => onChange(selected.filter((x) => x.id !== r.id))} aria-label={`Remove ${r.name || r.email}`} className="text-[#9a9a9a] transition-colors hover:text-[#e5484d]">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or email…"
          className={inputClass + " pl-9"}
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#f0f0f0] dark:border-white/10">
          {searching ? (
            <p className="px-3 py-2.5 text-[12.5px] text-[#9a9a9a]">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-[12.5px] text-[#9a9a9a]">Nobody matches that.</p>
          ) : (
            results.map((r) => {
              const chosen = selected.some((x) => x.id === r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => add(r)}
                  disabled={chosen}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#fffbe6] disabled:opacity-45 dark:hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[#1e1e1e] dark:text-white">{r.name || "—"}</span>
                    <span className="block truncate text-[11.5px] text-[#9a9a9a]">{r.email}</span>
                  </span>
                  {chosen && <Check size={14} className="flex-shrink-0 text-[#16a34a]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Multi-select over saved segments. The union is mailed, de-duplicated server-side. */
function SegmentPicker({ segments, selected, onChange }: { segments: SegmentOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (segments.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[#e3e3e3] p-4 text-[12.5px] text-[#9a9a9a] dark:border-white/10">
        No saved segments yet. Build one under Audience Segments, then pick it here.
      </div>
    );
  }
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="mt-4 rounded-xl border border-[#ececec] p-4 dark:border-white/10">
      <p className="mb-2 text-[12px] font-semibold text-[#1e1e1e] dark:text-white">
        Segments {selected.length > 0 && <span className="font-normal text-[#9a9a9a]">({selected.length} selected)</span>}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {segments.map((sg) => (
          <label key={sg.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[#1e1e1e] transition-colors hover:bg-[#fafafa] dark:text-white dark:hover:bg-white/[0.03]">
            <input type="checkbox" checked={selected.includes(sg.id)} onChange={() => toggle(sg.id)} className="h-4 w-4 accent-[#ffd716]" />
            <span className="truncate">{sg.name}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-[#9a9a9a]">Anyone in more than one selected segment is mailed once.</p>
    </div>
  );
}

export function CampaignComposer({
  campaign, segments, mailConfigured, defaultTestTo,
}: {
  campaign: CampaignRow | null;
  segments: SegmentOption[];
  mailConfigured: boolean;
  defaultTestTo: string;
}) {
  const router = useRouter();

  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [previewText, setPreviewText] = useState(campaign?.previewText ?? "");
  const [fromName, setFromName] = useState(campaign?.fromName ?? "Nomarc Projects");
  // info@, not support@ — support@ is not a mailbox on this domain, and the old
  // default (support@nomarc.com) was not even the right domain, so every reply
  // to a campaign bounced.
  const [replyTo, setReplyTo] = useState(campaign?.replyTo ?? "info@nomarcprojects.com");
  const [bodyHtml, setBodyHtml] = useState(campaign?.bodyHtml ?? "");
  /**
   * Audience is now a kind plus its own payload, rather than one string that
   * encoded both ("seg:<uuid>" or a built-in key). Two of the six kinds carry a
   * list, which a single string cannot express.
   */
  const [audienceKind, setAudienceKind] = useState<AudienceKind>(() => {
    if (campaign?.audienceKey === "custom" || campaign?.audienceKey === "segments") return campaign.audienceKey;
    if (campaign?.segmentId) return "segments";
    return (campaign?.audienceKey as AudienceKind) ?? "all_users";
  });
  const [customRecipients, setCustomRecipients] = useState<Recipient[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(
    campaign?.segmentIds ?? (campaign?.segmentId ? [campaign.segmentId] : []),
  );
  const [mode, setMode] = useState<"now" | "later">(campaign?.scheduledAtRaw ? "later" : "now");
  const [when, setWhen] = useState(() => {
    if (!campaign?.scheduledAtRaw) return "";
    // datetime-local wants local wall-clock, not the ISO Z string.
    const d = new Date(campaign.scheduledAtRaw);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [testTo, setTestTo] = useState(defaultTestTo);
  const [count, setCount] = useState<number | null>(null);
  const [busy, startAction] = useTransition();

  const readOnly = campaign?.status === "sent" || campaign?.status === "sending";

  const audiencePayload = useMemo(() => {
    if (audienceKind === "custom") {
      return { segmentId: null, audienceKey: "custom", recipientUserIds: customRecipients.map((r) => r.id), segmentIds: null };
    }
    if (audienceKind === "segments") {
      return { segmentId: null, audienceKey: "segments", recipientUserIds: null, segmentIds: selectedSegmentIds };
    }
    return { segmentId: null, audienceKey: audienceKind, recipientUserIds: null, segmentIds: null };
  }, [audienceKind, customRecipients, selectedSegmentIds]);

  // Live recipient count for the chosen audience.
  const reqId = useRef(0);
  useEffect(() => {
    const mine = ++reqId.current;
    setCount(null);
    getCampaignAudienceCount(audiencePayload)
      .then((n) => { if (mine === reqId.current) setCount(n); })
      .catch(() => { if (mine === reqId.current) setCount(null); });
  }, [audiencePayload]);

  function payload() {
    return { name, subject, previewText, fromName, replyTo, bodyHtml, ...audiencePayload };
  }

  /** Persist first so send/schedule always act on stored content, never just local state. */
  async function persist(): Promise<string | null> {
    const res = await saveCampaign({ ...payload(), id: campaign?.id });
    if (!res.ok) { toast.error(res.error ?? "Couldn't save."); return null; }
    return res.id ?? campaign?.id ?? null;
  }

  function onSaveDraft() {
    startAction(async () => {
      const id = await persist();
      if (!id) return;
      toast.success("Saved as draft.");
      router.push("/admin/email-campaigns");
    });
  }

  function onTest() {
    startAction(async () => {
      const res = await sendTestEmail({ ...payload(), to: testTo });
      res.ok ? toast.success(`Test email sent to ${res.to}.`) : toast.error(res.error ?? "Couldn't send the test.");
    });
  }

  function onSubmit() {
    if (mode === "later" && !when) { toast.error("Pick a date and time to schedule."); return; }
    if (mode === "now" && !window.confirm(`Send "${name || "this campaign"}" now to ${count ?? "the"} recipient${count === 1 ? "" : "s"}? This can't be undone.`)) return;

    startAction(async () => {
      const id = await persist();
      if (!id) return;
      if (mode === "later") {
        // datetime-local is local time; toISOString converts to UTC for storage.
        const res = await scheduleCampaign(id, new Date(when).toISOString());
        if (!res.ok) { toast.error(res.error ?? "Couldn't schedule."); return; }
        toast.success("Campaign scheduled.");
      } else {
        // Queue, don't inline-send: startCampaignSend enqueues every recipient
        // and returns in milliseconds; the throttle-aware drain delivers over
        // the following minutes. This is what keeps a large blast from timing
        // out inside the request and wedging the campaign.
        const res = await startCampaignSend(id);
        if (!res.ok) { toast.error(res.error ?? "Couldn't queue the send."); return; }
        toast.success(`Queued for delivery to ${res.queued?.toLocaleString() ?? "the"} recipient${res.queued === 1 ? "" : "s"}.`);
      }
      router.push("/admin/email-campaigns");
    });
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <Link href="/admin/email-campaigns" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">
        <ArrowLeft size={15} /> Back to Campaigns
      </Link>

      {readOnly && (
        <div className="mb-4 rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3 text-[12.5px] text-[#6b6b6b] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60">
          This campaign has already gone out, so it’s read-only — its open and click rates describe exactly this content. Duplicate it to send a revised version.
        </div>
      )}
      {!mailConfigured && (
        <div className="mb-4 rounded-xl border border-[#ffd716]/40 bg-[#fffdf2] px-4 py-3 text-[12.5px] text-[#8a7400] dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.06] dark:text-[#ffd716]">
          Email isn’t configured here — you can draft and schedule, but nothing will actually be delivered.
        </div>
      )}

      <fieldset disabled={readOnly || busy} className="space-y-5 disabled:opacity-70">
        <Section title="Campaign Setup" hint="Internal identifiers and target audience selection for this broadcast.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign Name" htmlFor="c-name">
              <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="This name is for your internal tracking only. Recipients won't see this." />
            </Field>
            <Field label="Target Audience" htmlFor="c-aud">
              {/* The app's own dropdown, not a raw <select>: the native control
                  rendered with the OS blue highlight and its own font, which
                  looked nothing like the rest of the console. */}
              <SelectMenu
                value={AUDIENCE_LABEL[audienceKind] ?? AUDIENCE_LABEL.all_users}
                options={AUDIENCE_OPTIONS}
                onChange={(label: string) => setAudienceKind(AUDIENCE_BY_LABEL[label] ?? "all_users")}
              />
              <p className="mt-1.5 text-[11.5px] text-[#9a9a9a]">
                {count === null ? "Counting recipients…" : `${count.toLocaleString()} recipient${count === 1 ? "" : "s"}`}
              </p>
            </Field>
          </div>

          {audienceKind === "custom" && (
            <RecipientPicker selected={customRecipients} onChange={setCustomRecipients} />
          )}

          {audienceKind === "segments" && (
            <SegmentPicker segments={segments} selected={selectedSegmentIds} onChange={setSelectedSegmentIds} />
          )}
        </Section>

        <Section title="Email Setup" hint="Provide the subject line, preview text, and sender information.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject Line" htmlFor="c-subj">
              <input id="c-subj" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="e.g. Exciting new project management tools are here!" />
            </Field>
            <Field label="Preview Text" htmlFor="c-prev" optional>
              <input id="c-prev" value={previewText} onChange={(e) => setPreviewText(e.target.value)} className={inputClass} placeholder="e.g. Upgrade your workflow with these new features..." />
            </Field>
            <Field label="From Name" htmlFor="c-from">
              <input id="c-from" value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputClass} placeholder="Nomarc Projects" />
            </Field>
            <Field label="Reply-To Email" htmlFor="c-reply">
              <input id="c-reply" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className={inputClass} placeholder="info@nomarcprojects.com" />
            </Field>
          </div>
        </Section>

        <Section title="Email Content" hint="Compose your message; it goes out inside the standard Nomarc email template.">
          <RichEditor value={bodyHtml} onChange={setBodyHtml} />
        </Section>

        <Section title="Delivery Schedule" hint="This controls when the blast goes out.">
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1e1e1e] dark:text-white">
              <input type="radio" name="mode" checked={mode === "now"} onChange={() => setMode("now")} className="accent-[#ffd716]" />
              Send immediately
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1e1e1e] dark:text-white">
              <input type="radio" name="mode" checked={mode === "later"} onChange={() => setMode("later")} className="accent-[#ffd716]" />
              Schedule for later
            </label>
            {mode === "later" && <DateTimePicker value={when} onChange={setWhen} />}
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-6">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            aria-label="Test recipient address"
            placeholder="test@example.com"
            className="mr-auto w-full max-w-[240px] rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[12.5px] text-[#1e1e1e] dark:border-white/15 dark:bg-[#161616] dark:text-white"
          />
          <button onClick={onTest} className="rounded-lg border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5">
            Send Test Email
          </button>
          <button onClick={onSaveDraft} className="rounded-lg border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#f7f7f7] dark:border-white/15 dark:text-white dark:hover:bg-white/5">
            Save as draft
          </button>
          <button onClick={onSubmit} className="inline-flex items-center gap-2 rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {mode === "later" ? "Schedule" : "Send now"}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
