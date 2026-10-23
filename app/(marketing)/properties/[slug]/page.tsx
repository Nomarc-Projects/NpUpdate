import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Bath, BedDouble, CheckCircle2, FileText, MapPin, Ruler, ShieldCheck } from "lucide-react";
import { getPublicProperty } from "@/lib/services/properties";
import { getProperties } from "@/lib/services/platform-settings-read";
import { isAdmin } from "@/lib/authz";
import { propertyStatusLabel, PROPERTY_DOCUMENT_LABEL, type PropertyDocumentType } from "@/lib/constants/property";
import { formatMoney } from "@/lib/properties/pricing";
import { pageMetadata } from "@/lib/og";
import { auth } from "@/lib/auth";
import { getSavedIds } from "@/lib/services/saved";
import { SavePropertyButton } from "@/components/properties/save-property-button";
import { PropertyInquiry } from "@/components/properties/property-inquiry";
import { PropertyPurchaseButton } from "@/components/properties/property-purchase-button";
import { PropertyViewTracker } from "@/components/properties/property-view-tracker";
import { hasPropertyTransaction } from "@/lib/services/property-transactions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicProperty(slug).catch(() => null);
  if (!item) return { title: "Property not found" };
  return pageMetadata({
    title: item.title,
    description: item.description?.slice(0, 155) || `${item.title} in ${[item.city, item.state].filter(Boolean).join(", ")}.`,
    path: `/properties/${slug}`,
  });
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, item] = await Promise.all([getProperties(), getPublicProperty(slug)]);
  if (!settings.enabled && !(await isAdmin().catch(() => false))) notFound();
  if (!item) notFound();

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;
  const saved = signedIn ? await getSavedIds("property").catch(() => []) : [];
  const canBuy = signedIn && session.user.id !== item.ownerUserId && ["sale", "bulk_land"].includes(item.kind);
  const existingTransaction = canBuy ? await hasPropertyTransaction(item.id).catch(() => null) : null;
  const cover = item.media[0]?.url;
  const docs = new Map(item.docs.map((d) => [d.docType, d.status]));

  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <PropertyViewTracker propertyId={item.id} />
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <Link href="/properties" className="text-[12px] font-semibold text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">← Back to properties</Link>
        <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#f4f4f4] dark:bg-white/5">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-[#9a9a9a]">No photo yet</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {item.media.slice(1, 3).map((m) => (
              <div key={m.id} className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#f4f4f4] dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption || item.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef7f0] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]">{item.kind.replaceAll("_", " ")}</span>
              <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10.5px] font-semibold text-[#6b6b6b] dark:bg-white/5 dark:text-white/60">{propertyStatusLabel(item.status)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1f7a3d] dark:text-[#4ade80]"><ShieldCheck size={13} /> Documents {item.documentStatus}</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white md:text-3xl">{item.title}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#6b6b6b] dark:text-white/60"><MapPin size={14} /> {[item.address, item.city, item.state].filter(Boolean).join(", ")}</p>
            {item.lister && (
              <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6b6b6b] dark:text-white/60">
                Listed by <span className="font-semibold text-[#1e1e1e] dark:text-white">{item.lister.companyName || item.lister.displayName || "Nomarc lister"}</span>
                {item.lister.verificationStatus === "verified" && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef7f0] px-2 py-0.5 text-[10px] font-bold text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]"><ShieldCheck size={11} /> Verified lister</span>}
              </p>
            )}
            <p className="mt-4 text-2xl font-extrabold text-[#1e1e1e] dark:text-white">{formatMoney(item.priceMinor, item.currency)} <span className="text-[12px] font-medium text-[#9a9a9a]">{item.pricePeriod === "annual" ? "per year" : item.pricePeriod === "monthly" ? "per month" : item.pricePeriod === "weekly" ? "per week" : item.pricePeriod === "daily" ? "per day" : ""}</span></p>

            <div className="mt-6 flex flex-wrap gap-4 border-y border-[#ececec] py-4 text-[12.5px] text-[#1e1e1e] dark:border-white/10 dark:text-white">
              {item.bedrooms ? <span className="inline-flex items-center gap-1.5"><BedDouble size={15} /> {item.bedrooms} bedrooms</span> : null}
              {item.bathrooms ? <span className="inline-flex items-center gap-1.5"><Bath size={15} /> {item.bathrooms} bathrooms</span> : null}
              {item.sizeSqm ? <span className="inline-flex items-center gap-1.5"><Ruler size={15} /> {item.sizeSqm.toLocaleString()} m²</span> : null}
              {item.sizeAcres ? <span className="inline-flex items-center gap-1.5"><Ruler size={15} /> {item.sizeAcres.toLocaleString()} acres</span> : null}
              {item.minimumAcreage ? <span className="inline-flex items-center gap-1.5"><Ruler size={15} /> Min. {item.minimumAcreage} acres</span> : null}
            </div>

            <div className="mt-6">
              <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">About this property</h2>
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/65">{item.description || "The lister has not added a description yet."}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#ececec] p-4 dark:border-white/10">
              <h2 className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#1e1e1e] dark:text-white"><FileText size={15} /> Ownership documents</h2>
              <p className="mt-1 text-[12px] text-[#9a9a9a]">Documents are private. Their review status is shown publicly; files are only available to the lister and admins.</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {item.docs.map((d) => (
                  <li key={d.docType} className="flex items-center justify-between gap-2 rounded-lg bg-[#fafafa] px-3 py-2 text-[12px] dark:bg-white/5">
                    <span className="text-[#1e1e1e] dark:text-white">{PROPERTY_DOCUMENT_LABEL[d.docType as PropertyDocumentType] ?? d.docType.replaceAll("_", " ")}</span>
                    <span className={d.status === "approved" ? "inline-flex items-center gap-1 text-[#1f7a3d] dark:text-[#4ade80]" : "text-[#9a9a9a]"}>
                      {d.status === "approved" && <CheckCircle2 size={12} />} {d.status}
                    </span>
                  </li>
                ))}
                {!item.docs.length && <li className="text-[12px] text-[#9a9a9a]">No documents uploaded.</li>}
              </ul>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Interested in this property?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#9a9a9a]">Message the lister or save it to your dashboard. You’ll need an account.</p>
              {signedIn ? (
                <PropertyInquiry propertyId={item.id} ownerUserId={item.ownerUserId} />
              ) : (
                <>
                  <Link href={`/login?redirect=/properties/${item.slug}`} className="mt-4 flex h-10 items-center justify-center rounded-xl bg-[#1e1e1e] text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">Sign in to inquire</Link>
                  <Link href="/signup" className="mt-2 flex h-10 items-center justify-center rounded-xl border border-[#e3e3e3] text-[12.5px] font-semibold text-[#1e1e1e] dark:border-white/15 dark:text-white">Create an account</Link>
                </>
              )}
              <SavePropertyButton id={item.id} initialSaved={saved.includes(item.id)} signedIn={signedIn} />
              {canBuy && <PropertyPurchaseButton propertyId={item.id} existingId={existingTransaction} />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
