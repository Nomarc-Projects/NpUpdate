import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Search, Sparkles } from "lucide-react";
import { PropertyCard } from "@/components/properties/property-card";
import { getPublicProperties } from "@/lib/services/properties";
import { getProperties } from "@/lib/services/platform-settings-read";
import { isAdmin } from "@/lib/authz";
import { PROPERTY_CATEGORIES, PROPERTY_KINDS } from "@/lib/constants/property";
import { parseMoneyToMinor } from "@/lib/properties/pricing";
import { pageMetadata } from "@/lib/og";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Properties for sale, lease and rent",
    description: "Browse verified homes, commercial spaces, land and bulk land listings across Nigeria on Nomarc Projects.",
    path: "/properties",
  });
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; category?: string; min?: string; max?: string }>;
}) {
  const settings = await getProperties();
  if (!settings.enabled && !(await isAdmin().catch(() => false))) notFound();

  const params = await searchParams;
  const minMinor = parseMoneyToMinor(params.min);
  const maxMinor = parseMoneyToMinor(params.max);
  const items = await getPublicProperties({
    q: params.q,
    kind: params.kind,
    category: params.category,
    minMinor: minMinor ?? undefined,
    maxMinor: maxMinor ?? undefined,
  }).catch(() => []);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-[#ececec] bg-white dark:border-white/10 dark:bg-[#171717]">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7f0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1f7a3d] dark:bg-[#22c55e]/10 dark:text-[#4ade80]">
            <Building2 size={12} /> Nomarc Projects
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white md:text-4xl">
            Find the right space. List with confidence.
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
            Verified listings from realtors, homeowners and space owners — homes, commercial property, land and bulk land.
          </p>
          <form className="mt-6 grid gap-2 rounded-2xl border border-[#ececec] bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1e1e1e] md:grid-cols-[1fr_auto_auto_auto_auto]" action="/properties">
            <label className="flex items-center gap-2 rounded-xl px-3">
              <Search size={15} className="text-[#9a9a9a]" />
              <input name="q" defaultValue={params.q} placeholder="City, state or keyword" className="h-10 w-full bg-transparent text-[13px] outline-none placeholder:text-[#9a9a9a]" />
            </label>
            <select name="kind" defaultValue={params.kind} className="h-10 rounded-xl border border-[#ececec] bg-transparent px-3 text-[12.5px] dark:border-white/10">
              <option value="">All kinds</option>
              {PROPERTY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <select name="category" defaultValue={params.category} className="h-10 rounded-xl border border-[#ececec] bg-transparent px-3 text-[12.5px] dark:border-white/10">
              <option value="">All categories</option>
              {PROPERTY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input name="min" defaultValue={params.min} placeholder="Min ₦" inputMode="decimal" className="h-10 rounded-xl border border-[#ececec] bg-transparent px-3 text-[12.5px] dark:border-white/10" />
            <button className="h-10 rounded-xl bg-[#1e1e1e] px-5 text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">Search</button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{items.length} {items.length === 1 ? "property" : "properties"}</p>
          <Link href="/dashboard/properties/new" className="rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12px] font-semibold text-[#1e1e1e] hover:border-[#22c55e] dark:border-white/15 dark:text-white">
            List your property
          </Link>
        </div>

        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <PropertyCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#dcdcdc] bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-[#1a1a1a]">
            <Sparkles className="mx-auto text-[#9a9a9a]" size={24} />
            <p className="mt-3 text-[14px] font-bold text-[#1e1e1e] dark:text-white">No published properties match yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#9a9a9a]">Try a broader search. New listings appear here after admin approval and payment.</p>
          </div>
        )}

        {settings.sowr.enabled && (
          <div className="mt-10 overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-white md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4ade80]">SOWR</p>
            <h2 className="mt-2 text-xl font-extrabold md:text-2xl">{settings.sowr.heading}</h2>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-white/65">{settings.sowr.body}</p>
            <Link href={settings.sowr.ctaHref} className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-[12.5px] font-bold text-[#1e1e1e]">{settings.sowr.ctaLabel}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
