"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Store, ThumbsUp, Megaphone, Ban, Pencil, Pin, Share2, EyeOff, Trash2, X,
  MessageSquare, Eye, Video, CalendarClock, Package, ShieldAlert,
} from "lucide-react";
import { KebabMenu } from "@/components/dashboard/kit";
import { useSession } from "@/lib/auth-client";
import { usePromotionEligibility } from "@/lib/use-promotion-eligibility";
import { getMyCompany, type CompanyData, type CompanyCert } from "@/lib/services/company";
import { getMyProducts, deleteProduct, setProductStatus, type MyProduct } from "@/lib/services/products";
import { getKycState } from "@/lib/services/kyc";
import { getIncomingQuotes } from "@/lib/services/rfq";
import { getMyPromotions } from "@/lib/services/promotions";
import { getUnreadCount } from "@/lib/services/messaging";
import { getMyNotifications, type NotificationRow } from "@/lib/services/notifications";
import { getTrialState } from "@/lib/services/exhibitor-trial";
import type { TrialState } from "@/lib/services/exhibitor-trial-rules";
import { RecommendationsPanel } from "@/components/dashboard/shared/recommendations-panel";
import { AdsBoardPanel } from "@/components/dashboard/shared/ads-board-panel";
import { TourWizardButton } from "@/components/tour/tour-wizard-button";
import {
  ProfileIdentityCard, IdentitySection, ChipList,
  DashboardTabs, KpiTileRow, ActivityFeed, EmptyState,
  type Stat, type ActivityItem,
} from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";

type Tab = "overview" | "catalog" | "recommendations" | "ads" | "drafts";

/**
 * Overview metrics and activity are read from this exhibitor's own records — a
 * brand-new account correctly shows zeros and an empty feed. These were once
 * hardcoded ("1,432 catalog views", "Sandra James requested a quote…"), so every
 * account, including one created a minute ago, displayed the same invented
 * history.
 */
const NOTIF_ICON: Record<string, typeof Eye> = {
  quote_request: MessageSquare,
  message: MessageSquare,
  promotion: Megaphone,
  recommendation: ThumbsUp,
  profile_view: Eye,
};

const stockLabel = (p: MyProduct) => (p.stockLevel === "out" ? "Out of Stock" : p.stockLevel === "low" ? "Low Stock" : "In Stock");

/* ── draft completeness (derived from filled fields) ───────────────────── */
function draftMeta(p: MyProduct) {
  const checks: [string, boolean][] = [
    ["Cover Image", !!p.images[0]],
    ["Product Description", !!p.description],
    ["Product Categories/Tags", !!p.category || p.tags.length > 0],
    ["Technical Specs & Features", p.specs.length > 0],
    ["Material/Grade", !!p.type],
    ["Product Gallery", p.images.length > 1],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { complete: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([l]) => l) };
}

/* ── catalog product card (image 71) ───────────────────────────────────── */
function ProductCard({ p, onOpen, onEdit, onHide, onDelete }: {
  p: MyProduct; onOpen: () => void; onEdit: () => void; onHide: () => void; onDelete: () => void;
}) {
  const out = p.stockLevel === "out";
  const share = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/dashboard/my-products/${p.id}`)
      .then(() => toast.success("Link copied")).catch(() => toast.error("Couldn't copy link"));
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#ececec] bg-white transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1e1e1e] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <button onClick={onOpen} className="block aspect-[4/3] w-full overflow-hidden bg-[#f0f0f0] text-left dark:bg-white/5">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#cfcfcf] dark:text-white/20"><Package size={36} /></span>
        )}
      </button>
      {/* overlaid title + status */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3.5 pb-3 pt-10">
        <h4 className="truncate text-[14px] font-bold text-white">{p.name}</h4>
        <p className={cn("text-[12px] font-medium", out ? "text-[#ffb27a]" : "text-[#7ee0a0]")}>{stockLabel(p)}</p>
      </div>
      {/* Portal-based KebabMenu — the card's overflow-hidden used to clip the
          inline absolute menu. */}
      <div className="absolute bottom-3 right-3">
        <KebabMenu
          triggerClassName="h-7 w-7 rounded-full bg-white/90 text-[#1e1e1e] hover:bg-white dark:bg-black/50 dark:text-white border-0"
          items={[
            { icon: Pencil, label: "Edit product", onClick: onEdit },
            { icon: Pin, label: "Pin to top", onClick: () => toast.success("Pinned to top") },
            { icon: Share2, label: "Share", onClick: share },
            { icon: EyeOff, label: "Hide from catalog", onClick: onHide },
            { icon: Trash2, label: "Delete", danger: true, onClick: onDelete },
          ]}
        />
      </div>
    </div>
  );
}

/* ── inline product detail (image 74) ──────────────────────────────────── */
function ProductDetailInline({ p, onClose, onEdit, onHide, onDelete }: {
  p: MyProduct; onClose: () => void; onEdit: () => void; onHide: () => void; onDelete: () => void;
}) {
  const variations = p.variants.map((v) => v.name).filter(Boolean).join(", ");
  const share = () => navigator.clipboard?.writeText(`${window.location.origin}/dashboard/my-products/${p.id}`).then(() => toast.success("Link copied")).catch(() => {});
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
      <div className="mb-3 flex justify-end">
        <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e3e3] text-[#6b6b6b] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white/60"><X size={16} /></button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#ececec] dark:border-white/10">
        <div className="aspect-[16/9] w-full bg-[#f0f0f0] dark:bg-white/5">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#cfcfcf] dark:text-white/20"><Package size={44} /></span>
          )}
        </div>
        <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white">{p.name}</h2>
              <KebabMenu items={[
                { icon: Pencil, label: "Edit product", onClick: onEdit },
                { icon: Pin, label: "Pin to top", onClick: () => toast.success("Pinned to top") },
                { icon: Share2, label: "Share", onClick: share },
                { icon: EyeOff, label: "Hide from catalog", onClick: onHide },
                { icon: Trash2, label: "Delete", danger: true, onClick: onDelete },
              ]} />
            </div>
          <p className="mt-1.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
            <span className="font-semibold text-[#1e1e1e] dark:text-white">Material / Type:</span> {p.type || p.category || "—"}
            {"  •  "}<span className="font-semibold text-[#1e1e1e] dark:text-white">Sizes / Variations:</span> {variations || "—"}
            {"  •  "}<span className="font-semibold text-[#1e1e1e] dark:text-white">Status:</span> {stockLabel(p)}
          </p>

          <h3 className="mt-5 text-[14px] font-bold text-[#1e1e1e] dark:text-white">Product Description</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{p.description || "No description added yet."}</p>

          {p.specs.length > 0 && (
            <>
              <h3 className="mt-5 text-[14px] font-bold text-[#1e1e1e] dark:text-white">Technical Specs &amp; Features:</h3>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
                {p.specs.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span>{s.label}{s.value ? `: ${s.value}` : ""}</span></li>
                ))}
              </ul>
            </>
          )}

          {p.images.length > 1 && (
            <>
              <h3 className="mt-5 text-[14px] font-bold text-[#1e1e1e] dark:text-white">Product Gallery</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {p.images.slice(1).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl border border-[#ececec] object-cover dark:border-white/10" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── drafts row (image 77) ─────────────────────────────────────────────── */
function DraftRow({ p, location, company, onRemove, onContinue }: {
  p: MyProduct; location: string; company: string; onRemove: () => void; onContinue: () => void;
}) {
  const { complete, missing } = draftMeta(p);
  return (
    <div className="flex gap-4 rounded-2xl border border-[#ececec] bg-white p-3.5 dark:border-white/10 dark:bg-[#1e1e1e]">
      <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f0f0] dark:bg-white/5">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={22} className="text-[#cfcfcf] dark:text-white/20" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{p.name}</h4>
            <p className="text-[12px] text-[#9a9a9a]">{company} • {location} • <span className="font-medium">Draft</span></p>
          </div>
          <button onClick={onRemove} className="flex flex-shrink-0 items-center gap-1.5 text-[12px] text-[#9a9a9a] transition-colors hover:text-[#e5484d]"><Trash2 size={14} /> Remove</button>
        </div>
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-[#9a9a9a]"><span>{complete}% complete</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10"><div className="h-full rounded-full bg-[#ffd716]" style={{ width: `${complete}%` }} /></div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
          {missing.length > 0 ? (
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#e5484d]">
              Missing {missing.map((m) => <span key={m} className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[#9a9a9a] dark:bg-white/5">{m}</span>)}
            </p>
          ) : <p className="text-[12px] text-[#16a34a]">Ready to publish</p>}
          <button onClick={onContinue} className="rounded-lg bg-[#ffd716] px-4 py-1.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">Continue</button>
        </div>
      </div>
    </div>
  );
}

/* ── main ──────────────────────────────────────────────────────────────── */
export function ExhibitorHome() {
  const router = useRouter();
  const { data: session } = useSession();
  const sUser = session?.user as { name?: string; image?: string | null } | undefined;
  // Ads Board is restricted to Key players exhibitors and Nomarc partners —
  // everyone else doesn't get the tab at all.
  const { eligible: canPromote } = usePromotionEligibility();

  const [tab, setTab] = useState<Tab>("overview");
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [certs, setCerts] = useState<CompanyCert[]>([]);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [openProduct, setOpenProduct] = useState<MyProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MyProduct | null>(null);
  const [tier2Verified, setTier2Verified] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [trial, setTrial] = useState<TrialState | null>(null);
  const [kpi, setKpi] = useState<{ quotes: number; pendingQuotes: number; impressions: number; activeAds: number; unread: number }>(
    { quotes: 0, pendingQuotes: 0, impressions: 0, activeAds: 0, unread: 0 },
  );
  const loaded = useRef(false);
  // Hydration safety: the welcome header resolves the company/exhibitor name
  // from async client data (useSession + getMyCompany). Rendering the resolved
  // name directly differs between the SSR HTML and the first client paint, so
  // gate it behind `mounted` — the same convention professional-home.tsx uses.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    getMyCompany().then((r) => { setCompany(r.data); setCerts(r.certifications); }).catch(() => {});
    getMyProducts().then((r) => { setProducts(r); loaded.current = true; }).catch(() => { loaded.current = true; });
    getKycState().then((s) => setTier2Verified(s.overallTier >= 2)).catch(() => setTier2Verified(null));
    getMyNotifications().then(setNotifications).catch(() => {});
    getTrialState().then(setTrial).catch(() => {});

    // Each metric is independent — one failing shouldn't blank the whole row,
    // so they settle separately rather than in a single Promise.all.
    Promise.allSettled([getIncomingQuotes(), getMyPromotions(), getUnreadCount()]).then(([q, p, u]) => {
      const quotes = q.status === "fulfilled" ? q.value : [];
      const promos = p.status === "fulfilled" ? p.value : [];
      setKpi({
        quotes: quotes.length,
        pendingQuotes: quotes.filter((x) => x.status === "pending").length,
        impressions: promos.reduce((sum, x) => sum + (x.views ?? 0), 0),
        activeAds: promos.filter((x) => x.status === "active").length,
        unread: u.status === "fulfilled" ? u.value : 0,
      });
    });
    // open the tab requested via ?tab= (e.g. after publishing a product)
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && ["overview", "catalog", "recommendations", "ads", "drafts"].includes(t)) setTab(t as Tab);
  }, []);

  const catalog = useMemo(() => products.filter((p) => p.status !== "draft"), [products]);
  const drafts = useMemo(() => products.filter((p) => p.status === "draft"), [products]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) { if (p.category) set.add(p.category); p.tags.forEach((t) => set.add(t)); }
    return Array.from(set).slice(0, 8);
  }, [products]);

  const stats: Stat[] = useMemo(() => [
    { label: "Products Live", value: catalog.length, hint: catalog.length > 0 ? `${drafts.length} in drafts` : "Publish your first product" },
    { label: "Quote Requests", value: kpi.quotes, hint: kpi.pendingQuotes > 0 ? `${kpi.pendingQuotes} pending review` : "No pending requests" },
    { label: "Ad Impressions", value: kpi.impressions.toLocaleString(), hint: kpi.activeAds > 0 ? `${kpi.activeAds} active campaign${kpi.activeAds === 1 ? "" : "s"}` : "No active campaigns" },
    { label: "Unread Messages", value: kpi.unread, hint: kpi.unread > 0 ? `${kpi.unread} new` : "All caught up" },
  ], [catalog.length, drafts.length, kpi]);

  const activity: ActivityItem[] = useMemo(
    () => notifications.map((n) => ({ id: n.id, icon: NOTIF_ICON[n.type] ?? Eye, text: <>{n.title}</>, meta: n.time })),
    [notifications],
  );
  // Nothing in the schema models scheduled events yet, so this stays empty
  // rather than inventing expo dates and verification calls.
  const upcoming: ActivityItem[] = [];

  /**
   * Plan selection comes after account setup, so an exhibitor only reaches the
   * upload form with an active paid plan. Known non-subscribers go straight to
   * the pricing page; while the plan state is still loading we defer to the
   * route, which re-checks server-side.
   */
  function goToAddProduct() {
    if (trial && !trial.subscribed) { router.push("/dashboard/plans/exhibitor"); return; }
    router.push("/dashboard/add-product");
  }

  const companyName = company?.name || (mounted && sUser?.name) || "Your Company";
  const location = company?.headquarters || "Nigeria";
  const subtitle = [company?.industry, company?.headquarters].filter(Boolean).join(" • ") || "Set up your company profile";

  function removeProduct(p: MyProduct) {
    const prev = products;
    setProducts((l) => l.filter((x) => x.id !== p.id));
    setOpenProduct((o) => (o?.id === p.id ? null : o));
    toast.success("Product deleted");
    deleteProduct(p.id).then(() => router.refresh()).catch(() => { setProducts(prev); toast.error("Couldn't delete"); });
  }
  function hideProduct(p: MyProduct) {
    const prev = products;
    setProducts((l) => l.map((x) => (x.id === p.id ? { ...x, status: "archived" } : x)));
    setOpenProduct((o) => (o?.id === p.id ? null : o));
    toast.success("Hidden from catalog");
    setProductStatus(p.id, "archived").then(() => router.refresh()).catch(() => { setProducts(prev); toast.error("Couldn't update"); });
  }
  const editProduct = (p: MyProduct) => router.push(`/dashboard/my-products/${p.id}`);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "catalog", label: "Catalog" },
    { key: "recommendations", label: "Recommendations" },
    { key: "ads", label: "Ads Board" },
  ];
  const visibleTabs = canPromote ? tabs : tabs.filter((t) => t.key !== "ads");
  const trailing = (
    <>
      <button
        onClick={() => setTab("drafts")}
        className={cn("relative px-3.5 py-2.5 text-[13.5px] font-medium transition-colors", tab === "drafts" ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}
      >
        Drafts
        {tab === "drafts" && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#ffd716]" />}
      </button>
      <button onClick={goToAddProduct} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-[13.5px] font-medium text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white">
        <Plus size={15} /> Add new product
      </button>
    </>
  );

  const isDrafts = tab === "drafts";

  const tabBar = (
    <DashboardTabs
      tabs={visibleTabs}
      active={tab}
      onChange={(k) => { setTab(k as Tab); setOpenProduct(null); }}
      layoutId="exhibitor-tab"
      trailing={trailing}
    />
  );

  return (
    <div className="px-5 py-6 sm:px-6 md:px-8">
      {/* welcome header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Welcome back, {companyName}</h1>
          <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Your products, profile, recommendations, and promotions at a glance.</p>
        </div>
        <TourWizardButton />
      </div>

      <div className={cn(!isDrafts && "flex flex-col gap-6 lg:flex-row")}>
        {/* left identity card (hidden on drafts full-width view) */}
        {!isDrafts && (
          <aside className="w-full flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[300px] lg:self-start lg:overflow-y-auto">
            <ProfileIdentityCard
              name={companyName}
              avatar={company?.avatarUrl || sUser?.image || undefined}
              verified={!!company?.verified}
              subtitle={subtitle}
              editHref="/dashboard/company"
              editLabel="Edit Profile Info"
            >
              <IdentitySection title="About">
                {company?.about || "Add an overview of your company so buyers know what you supply."}
              </IdentitySection>
              <IdentitySection title="Company Details">
                <div className="space-y-1">
                  <p><span className="font-semibold text-[#1e1e1e] dark:text-white">Headquarters</span> • {company?.headquarters || "—"}</p>
                  <p><span className="font-semibold text-[#1e1e1e] dark:text-white">Year Founded</span> • {company?.yearFounded || "—"}</p>
                  <p><span className="font-semibold text-[#1e1e1e] dark:text-white">Company Size</span> • {company?.companySize || "—"}</p>
                </div>
              </IdentitySection>
              {categories.length > 0 && (
                <IdentitySection title="Categories"><ChipList items={categories} tone="yellow" /></IdentitySection>
              )}
              {certs.length > 0 && (
                <IdentitySection title="Certifications">
                  <div className="space-y-2.5">
                    {certs.map((c) => (
                      <div key={c.id}>
                        <p className="font-semibold text-[#1e1e1e] dark:text-white">{c.name}</p>
                        <p className="text-[12px] text-[#9a9a9a]">{[c.issuer, c.year].filter(Boolean).join(" • ")}</p>
                      </div>
                    ))}
                  </div>
                </IdentitySection>
              )}
            </ProfileIdentityCard>
          </aside>
        )}

        {/* right column */}
        <div className="min-w-0 flex-1">
          {tabBar}

          <div className="mt-5">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {/* Overview */}
                {tab === "overview" && (
                  <div className="space-y-4">
                    <KpiTileRow stats={stats} />
                    <ActivityFeed recent={activity} upcoming={upcoming} title="Activity" />
                  </div>
                )}

                {/* Catalog */}
                {tab === "catalog" && (
                  openProduct ? (
                    <ProductDetailInline
                      p={openProduct}
                      onClose={() => setOpenProduct(null)}
                      onEdit={() => editProduct(openProduct)}
                      onHide={() => hideProduct(openProduct)}
                      onDelete={() => setConfirmDelete(openProduct)}
                    />
                  ) : catalog.length === 0 ? (
                    <div className="space-y-4">
                      {tier2Verified === false && (
                        <div className="rounded-2xl border border-[#ffd716]/40 bg-[#fffdf2] p-5 dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.04]">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#ffd716]/20 text-[#8a6d00] dark:text-[#ffd716]"><ShieldAlert size={18} /></span>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Verification Required</h3>
                              <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">To maintain a trusted marketplace for active buyers, all Exhibitors must complete their business verification before uploading products to the catalog. It only takes a few minutes.</p>
                              <Link href="/dashboard/settings/account?tab=verification" className="mt-3 inline-flex items-center rounded-lg bg-[#ffd716] px-4 py-2 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">
                                Verify Business Identity
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                      <EmptyState
                        icon={Store}
                        tone="yellow"
                        title="No catalog items added yet"
                        description="Your catalog is your digital storefront. Upload your materials, equipment, and products to start generating leads and driving sales."
                        primary={{ label: "Add New Product", onClick: goToAddProduct, icon: Plus }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {catalog.map((p) => (
                        <ProductCard
                          key={p.id}
                          p={p}
                          onOpen={() => setOpenProduct(p)}
                          onEdit={() => editProduct(p)}
                          onHide={() => hideProduct(p)}
                          onDelete={() => setConfirmDelete(p)}
                        />
                      ))}
                    </div>
                  )
                )}

                {tab === "recommendations" && (
                  <RecommendationsPanel emptyDescription="Recommendations build immediate trust and credibility with buyers. Ask past clients, partners, or contractors to endorse your company's reliability and product quality." />
                )}

                {canPromote && tab === "ads" && (
                  <AdsBoardPanel
                    ownerName={companyName}
                    ownerMeta={subtitle}
                    ownerAvatarUrl={company?.avatarUrl || undefined}
                    kinds={[
                      { kind: "profile", label: "Profile", ctaLabel: "Promote Profile" },
                      { kind: "product", label: "Product", ctaLabel: "Promote a Product", options: catalog.map((p) => ({ id: p.id, label: p.name, imageUrl: p.images[0], meta: [p.category, p.type].filter(Boolean).join(" · "), description: p.description ?? undefined })) },
                    ]}
                  />
                )}

                {/* Drafts (full width) */}
                {tab === "drafts" && (
                  drafts.length === 0 ? (
                    <EmptyState
                      icon={Ban}
                      tone="yellow"
                      title="No drafts right now"
                      description="Products you start creating but haven't published yet will appear here."
                      primary={{ label: "Add new product", onClick: goToAddProduct, icon: Plus }}
                    />
                  ) : (
                    <div>
                      <div className="mb-4">
                        <h2 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">Product Drafts</h2>
                        <p className="text-[13px] text-[#9a9a9a]">Incomplete product listings. Finish editing to publish them to the Exhibition Hub.</p>
                      </div>
                      <div className="space-y-4">
                        {drafts.map((p) => (
                          <DraftRow
                            key={p.id}
                            p={p}
                            company={companyName}
                            location={location}
                            onRemove={() => setConfirmDelete(p)}
                            onContinue={() => editProduct(p)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:pt-28">
            <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} />
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="relative w-full max-w-[440px] rounded-2xl border border-[#ececec] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1e1e1e]">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Delete product</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">Are you sure you want to delete &ldquo;{confirmDelete.name}&rdquo;? This action is permanent and cannot be undone.</p>
              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-[13.5px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/70 dark:hover:text-white">Cancel</button>
                <button onClick={() => { const p = confirmDelete; setConfirmDelete(null); removeProduct(p); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e5484d] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#d33a3f]"><Trash2 size={15} /> Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
