"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Award, BadgeCheck, Building2, Package } from "lucide-react";
import { NomarcAvatar } from "@/components/ui/avatar";
import { DashboardTabs, EmptyState } from "@/components/dashboard/kit";
import { RequestQuoteModal } from "@/components/dashboard/buyer/request-quote-modal";
import { getOrCreateDirectConversation } from "@/lib/services/messaging";
import type { CompanyDetail, CompanyRecommendation } from "@/lib/services/company";

/**
 * Exhibition Hub "View Exhibitor" — a full navigation (not a slide-over,
 * unlike Product Overview) matching image 43/44: sticky identity card on the
 * left, Catalog / Recommendations tabs on the right. Distinct from the
 * Directory > Companies profile (`components/dashboard/company-detail.tsx`,
 * out of scope) which is a different, richer full-width page for a different
 * entry point.
 */
export function ExhibitorView({
  company, recommendations, canRequestQuote = true,
}: {
  company: CompanyDetail;
  recommendations: CompanyRecommendation[];
  canRequestQuote?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"catalog" | "recommendations">("catalog");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const firstProduct = company.products[0];

  async function message() {
    setMessaging(true);
    try {
      await getOrCreateDirectConversation(company.ownerUserId);
      router.push("/dashboard/messages");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start conversation");
    } finally {
      setMessaging(false);
    }
  }

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-4">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
        {/* Identity card */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 lg:sticky lg:top-6">
          <NomarcAvatar src={company.avatarUrl ?? undefined} name={company.name} size="lg" />
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <h1 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">{company.name}</h1>
            {company.verified && <BadgeCheck size={16} className="flex-shrink-0 text-[#1e9df5]" />}
          </div>
          {(company.tagline || company.industry) && <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">{[company.tagline, company.headquarters].filter(Boolean).join(" • ")}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setQuoteOpen(true)}
              disabled={!firstProduct}
              title={firstProduct ? undefined : "No products listed yet"}
              className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Request quote
            </button>
            <button onClick={message} disabled={messaging} className="flex-1 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-60">
              Message
            </button>
          </div>

          {company.about && (
            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">About</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/65 line-clamp-6">{company.about}</p>
            </div>
          )}

          {(company.headquarters || company.yearFounded || company.companySize) && (
            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Company Details</h3>
              <div className="mt-2 space-y-1.5 text-[12.5px] text-[#6b6b6b] dark:text-white/65">
                {company.headquarters && <p>Headquarters · {company.headquarters}</p>}
                {company.yearFounded && <p>Year Founded · {company.yearFounded}</p>}
                {company.companySize && <p>Company Size · {company.companySize}</p>}
              </div>
            </div>
          )}

          {company.categories.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Categories</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {company.categories.map((c) => (
                  <span key={c} className="rounded-full border border-[#ffd716]/60 bg-[#fffdf2] dark:bg-[#ffd716]/10 px-2.5 py-1 text-[11.5px] font-medium text-[#3d3d3d] dark:text-white/80">{c}</span>
                ))}
              </div>
            </div>
          )}

          {company.certifications.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white flex items-center gap-1.5"><Award size={13} className="text-[#caa400]" /> Certifications</h3>
              <div className="mt-2 space-y-2.5">
                {company.certifications.map((cert) => (
                  <div key={cert.id}>
                    <p className="text-[12.5px] font-medium text-[#1e1e1e] dark:text-white">{cert.name}</p>
                    <p className="text-[11px] text-[#9a9a9a]">{[cert.issuer, cert.year].filter(Boolean).join(" • ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          <div className="px-5">
            <DashboardTabs
              tabs={[{ key: "catalog", label: "Catalog" }, { key: "recommendations", label: "Recommendations" }]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
              layoutId="exhibitor-view-tab"
            />
          </div>
          <div className="p-5">
            {tab === "catalog" ? (
              company.products.length === 0 ? (
                <EmptyState icon={Package} tone="grey" title="No products listed yet" description="This exhibitor hasn't published any catalog items." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {company.products.map((p) => (
                    <Link key={p.id} href={`/dashboard/products/${p.id}`} className="group rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden hover:border-[#ffd716] transition-colors">
                      <div className="relative aspect-square bg-[#f5f5f5] dark:bg-white/5 overflow-hidden">
                        {p.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><Package size={22} /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
                          <p className="text-[11.5px] font-semibold text-white line-clamp-1">{p.name}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : recommendations.length === 0 ? (
              <EmptyState icon={Building2} tone="grey" title="No recommendations yet" description="Buyers who've worked with this exhibitor haven't left a recommendation yet." />
            ) : (
              <ul className="space-y-3">
                {recommendations.map((r) => (
                  <li key={r.id} className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
                    <div className="flex items-start gap-3">
                      <NomarcAvatar src={r.avatarUrl} name={r.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{r.name}{r.role && <span className="font-normal text-[#9a9a9a]"> · {r.role}</span>}</p>
                        <p className="text-[11px] text-[#9a9a9a]">{r.date}</p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-[#3d3d3d] dark:text-white/75">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <RequestQuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        canRequest={canRequestQuote}
        product={firstProduct ? { id: firstProduct.id, name: firstProduct.name, vendor: company.name } : null}
      />
    </div>
  );
}
