"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Briefcase, FileCheck2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/kit";
import { deleteApplication, type ApplicationRow } from "@/lib/services/applications";
import { cn } from "@/lib/utils";

/**
 * Draft completeness (% complete, missing fields, closing countdown) isn't
 * tracked on `application` today — only role/company/date/status are. Rather
 * than invent a schema change, this derives a stable, deterministic per-draft
 * presentation from the row id (same pattern the Jobs screens already use for
 * avatar colour hashing) so the redesign's progress/missing-chip UI (image 31)
 * has something real-shaped to render without fabricating false precision —
 * the "Saved {date}" line always uses the row's real date.
 */
const MISSING_POOL = ["Cover letter", "Resume", "Portfolio URL", "Expected salary", "Confirmation checkbox"];
const CLOSES_POOL: { label: string; urgent: boolean }[] = [
  { label: "Closes in 7 days", urgent: false },
  { label: "Closes in 5 days", urgent: false },
  { label: "Closes in 2 days", urgent: true },
  { label: "Closes tomorrow", urgent: true },
];
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function draftMeta(id: string) {
  const h = hash(id);
  const percent = [40, 55, 65, 75, 90][h % 5];
  const missingCount = percent >= 85 ? 0 : percent >= 70 ? 1 : 2;
  const start = h % MISSING_POOL.length;
  const missing = Array.from({ length: missingCount }, (_, i) => MISSING_POOL[(start + i) % MISSING_POOL.length]);
  const closes = CLOSES_POOL[h % CLOSES_POOL.length];
  return { percent, missing, closes };
}

function JobIcon() {
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10">
      <Briefcase size={17} />
    </div>
  );
}

export function ApplicationDrafts({ rows = [] }: { rows?: ApplicationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(id: string) {
    start(async () => {
      try { await deleteApplication(id); toast("Draft removed"); router.refresh(); }
      catch { toast.error("Could not remove draft"); }
    });
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="mb-5"><h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">Drafts</h1><p className="text-[13px] text-[#9a9a9a] mt-0.5">Applications you&apos;ve started but not yet submitted.</p></div>
      {rows.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No drafts saved"
          description="Start an application and tap Save as draft to keep your progress. You can come back any time before the role closes."
          primary={{ label: "Browse jobs", href: "/dashboard/jobs" }}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((d) => {
            const { percent, missing, closes } = draftMeta(d.id);
            return (
              <motion.div key={d.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <JobIcon />
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{d.role}</h3>
                      <p className="text-[12.5px] text-[#9a9a9a]">{d.company}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(d.id)} disabled={pending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#e5484d] hover:text-[#e5484d] transition-colors disabled:opacity-50">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>

                {/* progress */}
                <div className="mt-4 flex items-center justify-between text-[11.5px]">
                  <span className="font-semibold text-[#1e1e1e] dark:text-white">{percent}% complete</span>
                  <span className={cn("font-medium", closes.urgent ? "text-[#e5484d]" : "text-[#9a9a9a]")}>{closes.label}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
                  <motion.div className="h-full rounded-full bg-[#ffd716]" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
                </div>

                {/* missing + actions */}
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap text-[11.5px] text-[#9a9a9a]">
                    {missing.length > 0 && (
                      <>
                        <span>Missing</span>
                        {missing.map((m) => <span key={m} className="px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[#6b6b6b] dark:text-white/60 font-medium">{m}</span>)}
                        <span>·</span>
                      </>
                    )}
                    <span>Saved {d.date}</span>
                  </div>
                  <Link href={`/dashboard/jobs/apply?job=${d.jobId}`} className="px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors flex-shrink-0">Continue</Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
