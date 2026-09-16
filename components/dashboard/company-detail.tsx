"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, MapPin, Users, Calendar, Building2, Package, Award, MessageSquare, ExternalLink } from "lucide-react";
import type { CompanyDetail } from "@/lib/services/company";
import { SaveToList } from "@/components/dashboard/save-to-list";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Stat({ Icon, label, value }: { Icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#caa400] flex-shrink-0"><Icon size={16} /></span>
      <div className="min-w-0"><p className="text-[11px] text-[#9a9a9a]">{label}</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{value}</p></div>
    </div>
  );
}

export function CompanyDetailView({ company: c }: { company: CompanyDetail }) {
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1080px] mx-auto">
      <Link href="/dashboard/companies" className="inline-flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-4"><ArrowLeft size={15} /> Back to companies</Link>

      {/* header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-[#fff7cc] to-[#ffe98a] dark:from-[#ffd716]/10 dark:to-[#ffd716]/5" />
        <div className="px-5 sm:px-6 pb-5">
          <div className="flex items-end gap-4 -mt-10 sm:-mt-12">
            {c.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatarUrl} alt={c.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-[#1e1e1e] bg-white" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] font-bold text-2xl ring-4 ring-white dark:ring-[#1e1e1e]">{initials(c.name) || <Building2 size={28} />}</div>
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white flex items-center gap-2 flex-wrap">
                {c.name}
                {c.verified && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] bg-[#e0edff] dark:bg-[#6366f1]/20 dark:text-[#818cf8] px-2 py-0.5 rounded-full"><BadgeCheck size={12} /> Verified</span>}
              </h1>
              {(c.tagline || c.industry) && <p className="text-[13px] text-[#9a9a9a] mt-0.5">{c.tagline || c.industry}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/messages" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><MessageSquare size={15} /> Contact</Link>
              <SaveToList itemType="company" itemId={c.id} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#f0f0f0] dark:border-white/10 pt-5">
            {c.industry && <Stat Icon={Building2} label="Industry" value={c.industry} />}
            {c.headquarters && <Stat Icon={MapPin} label="Headquarters" value={c.headquarters} />}
            {c.companySize && <Stat Icon={Users} label="Company size" value={c.companySize} />}
            {c.yearFounded && <Stat Icon={Calendar} label="Founded" value={String(c.yearFounded)} />}
          </div>
        </div>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* about */}
          {c.about && (
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
              <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-2">About</h2>
              <p className="text-[13.5px] leading-relaxed text-[#4b4b4b] dark:text-white/70 whitespace-pre-wrap">{c.about}</p>
            </div>
          )}

          {/* products */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-4 flex items-center gap-2"><Package size={16} className="text-[#caa400]" /> Products & materials</h2>
            {c.products.length === 0 ? (
              <p className="text-[13px] text-[#9a9a9a]">No products listed yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {c.products.map((p) => (
                  <Link key={p.id} href={`/dashboard/products/${p.id}`} className="group rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden hover:border-[#ffd716] transition-colors">
                    <div className="aspect-[4/3] bg-[#f5f5f5] dark:bg-white/5 overflow-hidden">
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><Package size={22} /></div>}
                    </div>
                    <div className="p-2.5"><p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white line-clamp-2 group-hover:text-[#caa400] transition-colors">{p.name}</p></div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          {c.categories.length > 0 && (
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-3">Specialties</p>
              <div className="flex flex-wrap gap-1.5">
                {c.categories.map((t) => <span key={t} className="text-[12px] px-2.5 py-1 rounded-full bg-[#f3f3f3] dark:bg-white/5 text-[#6b6b6b] dark:text-white/70">{t}</span>)}
              </div>
            </div>
          )}
          {c.certifications.length > 0 && (
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-3 flex items-center gap-1.5"><Award size={15} className="text-[#caa400]" /> Certifications</p>
              <div className="space-y-3">
                {c.certifications.map((cert) => (
                  <div key={cert.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{cert.name}</p><p className="text-[11px] text-[#9a9a9a]">{[cert.issuer, cert.year].filter(Boolean).join(" · ")}</p></div>
                    {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-[#9a9a9a] hover:text-[#caa400] flex-shrink-0"><ExternalLink size={14} /></a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
