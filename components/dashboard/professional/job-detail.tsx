"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, Layers, Wallet, Clock, Bookmark, FileText, Download, MessageSquare } from "lucide-react";
import { ShareMenu } from "@/components/ui/share";
import type { SampleJob } from "@/lib/sample-jobs";

type Overview = { body: string; responsibilities: string[]; requirements: string[] };
type PostingDetail = { requirements: string[]; skills: string[]; benefits: string[] };

/** Plain yellow-tinted icon tile — matches the Jobs browse/preview visual language. */
function JobIcon({ size = 40, iconSize = 17, className = "" }: { size?: number; iconSize?: number; className?: string }) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <Briefcase size={iconSize} />
    </div>
  );
}

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#9a9a9a] leading-tight">{label}</p>
        <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MiniJob({ job }: { job: SampleJob }) {
  return (
    <Link href={`/dashboard/jobs/${job.id}`} className="block rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 hover:border-[#ffd716] transition-colors">
      <div className="flex items-start gap-2.5">
        <JobIcon size={32} iconSize={14} />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white truncate">{job.title}</p>
          <p className="text-[11.5px] text-[#9a9a9a] truncate">{job.company} · {job.location}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-[#9a9a9a]">
        <span className="font-semibold text-[#22c55e]">{job.salary}</span><span>·</span><span>{job.time}</span>
      </div>
    </Link>
  );
}

export function JobDetail({ job, overview, detail, similar, otherFromCompany }: {
  job: SampleJob; overview: Overview; detail: PostingDetail; similar: SampleJob[]; otherFromCompany: SampleJob[];
}) {
  const workModel = job.tags.find((t) => ["On-site", "Hybrid", "Remote"].includes(t)) || "On-site";
  const jobType = job.tags.find((t) => ["Full-time", "Part-time", "Contract", "Internship"].includes(t)) || "Full-time";

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[1200px] mx-auto">
      <Link href="/dashboard/jobs" className="inline-flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-5"><ArrowLeft size={16} /> Back to jobs</Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-7">
            {/* header */}
            <div className="flex items-start gap-4 flex-wrap">
              <JobIcon size={56} iconSize={24} />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white leading-snug">{job.title}</h1>
                <p className="text-[13px] text-[#9a9a9a] mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#caa400]">{job.company}</span>
                  <span className="text-[#e3e3e3] dark:text-white/20">•</span>
                  <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button aria-label="Save" className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#ffd716] transition-colors"><Bookmark size={17} /></button>
                <ShareMenu title={`${job.title} at ${job.company}`} variant="icon" />
                {job.ownerUserId ? (
                  <Link href={`/dashboard/messages?to=${encodeURIComponent(job.ownerUserId)}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white text-[13px] font-semibold hover:border-[#ffd716] hover:text-[#caa400] transition-colors">
                    <MessageSquare size={14} /> Message
                  </Link>
                ) : null}
                <Link href={`/dashboard/jobs/apply?job=${job.id}`} className="px-5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Apply Now</Link>
              </div>
            </div>

            {/* tags */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.tags.map((t) => <span key={t} className="px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-white/[0.06] text-[11px] font-medium text-[#6b6b6b] dark:text-white/55">{t}</span>)}
            </div>

            {/* meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 py-5 border-y border-[#f0f0f0] dark:border-white/10">
              <MetaCell icon={<MapPin size={13} />} label="Location" value={job.location} />
              <MetaCell icon={<Briefcase size={13} />} label="Work model" value={workModel} />
              <MetaCell icon={<Layers size={13} />} label="Job type" value={jobType} />
              <MetaCell icon={<Wallet size={13} />} label="Salary" value={job.salary || "Not disclosed"} />
            </div>
            <p className="text-[12px] text-[#9a9a9a] mt-3 flex items-center gap-1.5"><Clock size={12} /> Posted {job.time} · {job.applicants ?? 24} applicants</p>

            {/* Sections follow the design's Overview panel: Job Description,
                Requirements, Skills & Tools, Benefits & Perks.

                Requirements/Skills/Benefits come from the listing itself, and a
                section is omitted when the poster left it empty. The previous
                "Responsibilities", "Qualifications" and "Attachments" blocks
                rendered JOB_OVERVIEW — one static sample — so every job on the
                board showed the same responsibilities and offered the same two
                invented PDFs to download. */}
            <Section title="Job Description"><p className="text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60 whitespace-pre-wrap">{job.desc || overview.body}</p></Section>
            {detail.requirements.length > 0 && (
              <Section title="Requirements">
                <ul className="space-y-2">{detail.requirements.map((r) => <li key={r} className="flex gap-2 text-[13.5px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#22c55e] mt-0.5 flex-shrink-0">✓</span>{r}</li>)}</ul>
              </Section>
            )}
            {detail.skills.length > 0 && (
              <Section title="Skills & Tools">
                <div className="flex flex-wrap gap-2">
                  {detail.skills.map((sk) => (
                    <span key={sk} className="rounded-full border border-[#f3e6b0] bg-[#fdf6e0] px-3 py-1.5 text-[12.5px] text-[#1e1e1e] dark:border-[#ffd716]/25 dark:bg-[#ffd716]/[0.06] dark:text-white">{sk}</span>
                  ))}
                </div>
              </Section>
            )}
            {detail.benefits.length > 0 && (
              <Section title="Benefits & Perks">
                <ul className="space-y-2">{detail.benefits.map((b) => <li key={b} className="flex gap-2 text-[13.5px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#ffd716] mt-0.5 flex-shrink-0">•</span>{b}</li>)}</ul>
              </Section>
            )}

            <div className="mt-6 flex items-center gap-3">
              <Link href={`/dashboard/jobs/apply?job=${job.id}`} className="flex-1 sm:flex-none text-center px-7 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[14px] font-bold hover:bg-[#e6c114] transition-colors">Apply Now</Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {otherFromCompany.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white uppercase tracking-wide mb-3">Other jobs from {job.company}</h3>
              <div className="space-y-3">{otherFromCompany.map((j) => <MiniJob key={j.id} job={j} />)}</div>
            </div>
          )}
          <div>
            <h3 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white uppercase tracking-wide mb-3">Similar jobs</h3>
            <div className="space-y-3">{similar.map((j) => <MiniJob key={j.id} job={j} />)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-2.5">{title}</h2>
      {children}
    </div>
  );
}
