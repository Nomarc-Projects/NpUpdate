"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Copy, ExternalLink, Mail } from "lucide-react";

type ApplyJob = { id: string; title: string; company: string; location: string };

const secondaryClass =
  "px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors";
const primaryClass =
  "px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors";

function ApplyShell({ job, icon, children }: { job: ApplyJob; icon: ReactNode; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="px-6 md:px-8 py-6 max-w-[920px]">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
        className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-5"
      >
        <ArrowLeft size={16} /> Back to job
      </button>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Briefcase size={16} /></div>
          <div>
            <h2 className="text-sm font-bold text-[#1e1e1e] dark:text-white">{job.title}</h2>
            <p className="text-[12px] text-[#9a9a9a]">{job.company}{job.location && ` • ${job.location}`}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 sm:p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]">{icon}</div>
        {children}
      </div>
    </div>
  );
}

/** Shown for jobs where the poster chose "External URL" — the Nomarc form must never render. */
export function ApplyExternalNotice({ job, url }: { job: ApplyJob; url: string | null }) {
  const router = useRouter();
  return (
    <ApplyShell job={job} icon={<ExternalLink size={28} />}>
      <h1 className="mt-5 text-xl font-bold text-[#1e1e1e] dark:text-white">You are now leaving Nomarc Projects</h1>
      <p className="mt-2 text-sm text-[#9a9a9a] max-w-md leading-relaxed">
        This employer handles applications on their own website. Continue opens their application in a new tab.
      </p>
      {!url && (
        <p role="alert" className="mt-3 text-[13px] text-[#e5484d] dark:text-[#ff8b8b]">
          This employer has not provided a valid application link yet.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className={primaryClass}>Continue</a>
        ) : (
          <button type="button" disabled className={`${primaryClass} opacity-50 cursor-not-allowed`}>Continue</button>
        )}
        <button type="button" onClick={() => router.push(`/dashboard/jobs/${job.id}`)} className={secondaryClass}>Cancel</button>
      </div>
    </ApplyShell>
  );
}

/** Shown for jobs where the poster chose "Email" — the Nomarc form must never render. */
export function ApplyEmailNotice({ job, email }: { job: ApplyJob; email: string | null }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  async function copyAddress() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("Copied");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy the address");
    }
  }

  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(`Application for ${job.title}`)}`
    : null;

  return (
    <ApplyShell job={job} icon={<Mail size={28} />}>
      <h1 className="mt-5 text-xl font-bold text-[#1e1e1e] dark:text-white">To apply, send an email to:</h1>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[#f3e6b0] bg-[#fff7cc] px-4 py-3 dark:border-[#ffd716]/25 dark:bg-[#ffd716]/10">
        <span className="text-[16px] font-semibold text-[#1e1e1e] dark:text-white break-all">{email ?? "Not provided"}</span>
        {email && (
          <>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy email address"
              title="Copy email address"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#caa400] hover:bg-white/60 hover:text-[#1e1e1e] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            >
              <Copy size={16} />
            </button>
            {copied && <span role="status" className="text-[12px] font-semibold text-[#16803c] dark:text-[#4ade80]">Copied</span>}
          </>
        )}
      </div>
      {!email && (
        <p role="alert" className="mt-3 text-[13px] text-[#e5484d] dark:text-[#ff8b8b]">
          This employer has not provided a valid email address yet.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {mailto ? (
          <a href={mailto} className={primaryClass}>Open email app</a>
        ) : (
          <button type="button" disabled className={`${primaryClass} opacity-50 cursor-not-allowed`}>Open email app</button>
        )}
        <button type="button" onClick={() => router.push(`/dashboard/jobs/${job.id}`)} className={secondaryClass}>Back to job</button>
      </div>
    </ApplyShell>
  );
}
