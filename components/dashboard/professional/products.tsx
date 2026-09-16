"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, Bookmark, PackageSearch, BadgeCheck, SlidersHorizontal,
  X, LayoutGrid, List, Lock, Store,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/kit";
import { RequestQuoteModal } from "@/components/dashboard/buyer/request-quote-modal";
import { ShopProductCard } from "@/components/shop/product-card";
import { toggleSaved } from "@/lib/services/saved";
import { getBrowseProductById } from "@/lib/services/catalog";
import type { ProductCard } from "@/lib/services/catalog";
import type { CatalogProduct } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";

/** ProductCard enriched with the exhibitor's company id (resolved server-side
 *  in products/page.tsx by name-matching against getCompaniesForDirectory —
 *  catalog.ts's own return shape is untouched). */
export type ProductCardX = ProductCard & { exhibitorId?: string };

const filters = [
  { label: "Primary Industry", options: ["Core Building Materials", "Heavy Machinery & Plant", "Electrical & Lighting", "Plumbing & Water Systems", "HVAC Systems", "Roofing & Waterproofing"] },
  { label: "Product Tags", options: ["Structural Steel", "Rebar", "Flooring", "Excavation", "Cooling Systems"] },
  { label: "Availability", options: ["In Stock", "Made to Order", "Available for Rent"] },
  { label: "Location", options: ["Lagos", "Abuja", "Port Harcourt", "Kano", "Enugu"] },
];

function availColor(a: string) {
  if (a === "In Stock") return "text-[#16a34a]";
  if (a === "Available for Rent") return "text-[#16a34a]";
  return "text-[#ea580c]";
}

/* ─── Filter section (boxed accordion — same visual language as Jobs) ──── */
function FilterGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (o: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;
  return (
    <div className={cn("rounded-xl border transition-colors", open || active ? "border-[#ffd716]" : "border-[#ececec] dark:border-white/10")}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">
        <span className="flex items-center gap-2">
          {label}
          {active && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[9px] font-bold flex items-center justify-center">{selected.length}</span>}
        </span>
        {open ? <ChevronUp size={13} className="text-[#9a9a9a]" /> : <ChevronDown size={13} className="text-[#9a9a9a]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.14 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[#f5f5f5] dark:border-white/5">
              {options.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <label key={opt} onClick={() => onToggle(opt)} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 transition-colors", checked ? "bg-[#ffd716] border-[#ffd716]" : "border-[#d1d5db] dark:border-white/20 group-hover:border-[#ffd716]")}>
                      {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#1e1e1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className={cn("text-[12.5px] select-none transition-colors", checked ? "text-[#1e1e1e] dark:text-white font-medium" : "text-[#6b6b6b] dark:text-white/60 group-hover:text-[#1e1e1e] dark:group-hover:text-white")}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Want to list products?" promo — dismissable, sits at the foot of the
 *  filter rail (image 40). Replaces the old top-right "Become an Exhibitor"
 *  pill (same destination, deduplicated into the redesign's placement). */
function ExhibitorPromo({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
      <button onClick={onDismiss} aria-label="Dismiss" className="absolute top-3 right-3 text-[#b3b3b3] hover:text-[#9a9a9a]"><X size={14} /></button>
      <div className="w-8 h-8 rounded-lg bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-2.5"><Lock size={15} /></div>
      <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">Want to list products?</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-[#9a9a9a]">To become an exhibitor and list products, you must establish your business identity and complete your account verification.</p>
      <Link href="/dashboard/add-product" className="mt-3 block text-center py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors">Setup exhibitor profile</Link>
    </motion.div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-[#f3f3f3] dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b] dark:text-white/70">{children}</span>;
}

/* ─── Product cards ──────────────────────────────────────────────── */
/** Grid card delegates to the shared shop `ProductCard` (converged with the
 *  public Exhibition Hub in the M1 redesign) — opens the overview drawer
 *  in-place instead of navigating (dashboard context keeps you on-page). */
function ProductGridCard({ p, isSaved, onSave, onOpen }: { p: ProductCardX; isSaved: boolean; onSave: () => void; onQuote: () => void; onOpen: () => void }) {
  return <ShopProductCard p={p} onClick={onOpen} isSaved={isSaved} onSave={onSave} />;
}

function ProductListCard({ p, isSaved, onSave, onQuote, onOpen, saved: isSavedPage }: { p: ProductCardX; isSaved: boolean; onSave: () => void; onQuote: () => void; onOpen: () => void; saved: boolean }) {
  return (
    <div onClick={onOpen} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 flex gap-4 hover:border-[#ffd716]/60 transition-colors cursor-pointer">
      <div className="flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} className="w-24 h-20 rounded-lg object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#1e1e1e] dark:text-white hover:text-[#caa400] transition-colors truncate">{p.name}</h3>
            <p className="text-[12px] text-[#9a9a9a] flex items-center gap-1 flex-wrap">
              <span className="inline-flex items-center gap-1">{p.supplier}{p.verified && <BadgeCheck size={12} className="text-[#1e9df5]" />}</span> · {p.location} · <span className={cn(availColor(p.avail), "font-medium")}>{p.avail}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {p.exhibitorId && (
              <Link href={`/dashboard/products/exhibitor/${p.exhibitorId}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                <Store size={13} /> View exhibitor
              </Link>
            )}
            {isSavedPage
              ? <button onClick={onSave} aria-label="Remove" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:border-[#e5484d] hover:text-[#e5484d] transition-colors"><X size={15} /></button>
              : <button onClick={onSave} aria-label={isSaved ? "Unsave" : "Save"} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[#b3b3b3] hover:border-[#ffd716] hover:text-[#ffd716] transition-colors">{isSaved ? <Bookmark size={15} className="fill-[#ffd716] text-[#ffd716]" /> : <Bookmark size={15} />}</button>}
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5">{p.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <button onClick={(e) => { e.stopPropagation(); onQuote(); }} className="px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors">Request quote</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Product overview drawer (image 42) ────────────────────────── */
function ProductOverviewDrawer({ productId, onClose, isSaved, onSave, exhibitorId, onQuote }: {
  productId: string | null; onClose: () => void; isSaved: boolean; onSave: () => void; exhibitorId?: string; onQuote: () => void;
}) {
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) { setDetail(null); return; }
    setLoading(true);
    getBrowseProductById(productId).then((d) => setDetail(d)).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [productId]);

  const open = !!productId;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative h-full w-full max-w-[480px] bg-white dark:bg-[#1e1e1e] shadow-[0_24px_70px_rgba(0,0,0,0.25)] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#ececec] dark:border-white/10 flex-shrink-0">
              <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Overview</h3>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading || !detail ? (
                <div className="p-5 space-y-3">
                  <div className="skeleton aspect-[4/3] w-full rounded-xl" />
                  <div className="skeleton h-5 w-2/3 rounded-md" />
                  <div className="skeleton h-3 w-1/3 rounded-md" />
                </div>
              ) : (
                <>
                  <div className="relative aspect-[4/3] bg-[#f5f5f5] dark:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.images[0]} alt={detail.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{detail.name}</h2>
                      <button onClick={onSave} aria-label="Save" className={cn("w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border transition-colors", isSaved ? "border-[#ffd716] text-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10" : "border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:border-[#ffd716] hover:text-[#ffd716]")}>
                        <Bookmark size={15} className={isSaved ? "fill-[#ffd716]" : ""} />
                      </button>
                    </div>
                    <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">{detail.vendor} · <span className="text-[#16a34a] font-medium">In Stock</span></p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {detail.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      {exhibitorId && (
                        <Link href={`/dashboard/products/exhibitor/${exhibitorId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                          <Store size={13} /> View exhibitor
                        </Link>
                      )}
                      <button onClick={onQuote} className="ml-auto px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors">Request quote</button>
                    </div>

                    {detail.specs.length > 0 && (
                      <p className="mt-4 pt-4 border-t border-[#f0f0f0] dark:border-white/10 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                        {detail.specs.slice(0, 2).map((s) => `${s.label}: ${s.value}`).join(" · ")}
                      </p>
                    )}

                    {detail.description && (
                      <div className="mt-4">
                        <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-1.5">Product Description</h4>
                        <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{detail.description}</p>
                      </div>
                    )}

                    {detail.specs.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-1.5">Technical Specs &amp; Features</h4>
                        <ul className="space-y-1.5">
                          {detail.specs.map((s) => (
                            <li key={s.label} className="flex gap-2 text-[12.5px] text-[#6b6b6b] dark:text-white/60"><span className="text-[#ffd716] mt-0.5 flex-shrink-0">•</span>{s.label}: {s.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {detail.images.length > 1 && (
                      <div className="mt-4">
                        <h4 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-1.5">Product Gallery</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {detail.images.slice(1).map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                          ))}
                        </div>
                      </div>
                    )}

                    <Link href={`/dashboard/products/${detail.id}`} className="mt-5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                      See full details
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Products({ saved = false, initialSaved = [], items = [], canRequestQuote = true }: {
  saved?: boolean; initialSaved?: string[]; items?: ProductCardX[]; canRequestQuote?: boolean;
}) {
  const products = items;
  const [quote, setQuote] = useState<ProductCardX | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved));
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [promoDismissed, setPromoDismissed] = useState(false);

  const openQuote = (p: ProductCardX) => setQuote(p);
  const previewProduct = products.find((p) => p.id === previewId) ?? null;

  const toggle = (label: string, o: string) =>
    setSel((s) => { const cur = s[label] ?? []; return { ...s, [label]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] }; });
  const clearAll = () => { setSel({}); setQuery(""); };
  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.delete(id); else n.add(id); return n; });
    toast(wasSaved ? "Removed from saved" : "Saved");
    try { await toggleSaved("product", id); }
    catch { setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.add(id); else n.delete(id); return n; }); toast.error("Could not update"); }
  }

  const q = query.trim().toLowerCase();
  const tagsF = sel["Product Tags"] ?? [];
  const availF = sel["Availability"] ?? [];
  const locF = sel["Location"] ?? [];
  const industryF = sel["Primary Industry"] ?? [];
  const list = products.filter((p) => {
    if (saved && !savedIds.has(p.id)) return false;
    const hay = `${p.name} ${p.supplier} ${p.location} ${p.tags.join(" ")}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (tagsF.length && !tagsF.some((o) => p.tags.includes(o))) return false;
    if (availF.length && !availF.includes(p.avail)) return false;
    if (locF.length && !locF.some((o) => p.location.toLowerCase().includes(o.toLowerCase()))) return false;
    if (industryF.length && !industryF.some((o) => p.tags.some((t) => o.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(o.toLowerCase().split(" ")[0])))) return false;
    return true;
  });
  const activeCount = Object.values(sel).reduce((n, a) => n + a.length, 0) + (q ? 1 : 0);

  if (saved && list.length === 0) {
    return (
      <div className="px-4 sm:px-6 md:px-8 py-6">
        <Heading saved={saved} />
        <EmptyState
          icon={Bookmark} tone="yellow" title="No saved products yet"
          description="Save materials and equipment to easily compare specs and request quotes later on."
          primary={{ label: "Browse products", href: "/dashboard/products", icon: Search }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6">
      <Heading saved={saved} />

      {/* search bar */}
      {!saved && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#1e1e1e] pl-10 pr-4 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors" placeholder="Search by product, category, or exhibitor…" />
        </div>
      )}

      {/* toolbar: filter + view toggle */}
      {!saved && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <button onClick={() => setFilterOpen(true)}
            className={cn("lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors",
              activeCount > 0 ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]")}>
            <SlidersHorizontal size={14} /> Filter
            {activeCount > 0 && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#1e1e1e] text-white text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
          </button>
          <p className="text-[13px] text-[#9a9a9a] hidden lg:block">{list.length} product{list.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-1 rounded-lg border border-[#e3e3e3] dark:border-white/15 p-0.5 ml-auto">
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-[#ffd716]/20 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]")}><List size={16} /></button>
            <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-md transition-colors", view === "grid" ? "bg-[#ffd716]/20 text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]")}><LayoutGrid size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* desktop sidebar filter */}
        {!saved && (
          <aside className="hidden lg:block w-[236px] flex-shrink-0">
            <div className="sticky top-6 space-y-2.5">
              <div className="flex items-center justify-between px-0.5 mb-0.5">
                <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Filters</p>
                {activeCount > 0 && <button onClick={clearAll} className="text-[11px] text-[#9a9a9a] hover:text-[#e5484d] transition-colors">Clear all</button>}
              </div>
              {filters.map((f) => <FilterGroup key={f.label} label={f.label} options={f.options} selected={sel[f.label] ?? []} onToggle={(o) => toggle(f.label, o)} />)}
              <AnimatePresence>{!promoDismissed && <ExhibitorPromo onDismiss={() => setPromoDismissed(true)} />}</AnimatePresence>
            </div>
          </aside>
        )}

        {/* products */}
        <div className="flex-1 min-w-0">
          {list.length === 0 ? (
            <EmptyState
              icon={PackageSearch} tone="grey" title="No products match"
              description="Try adjusting your filters or search."
              primary={activeCount > 0 ? { label: "Clear filters", onClick: clearAll } : undefined}
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence>
                {list.map((p) => <ProductGridCard key={p.id} p={p} isSaved={savedIds.has(p.id)} onSave={() => toggleSave(p.id)} onQuote={() => openQuote(p)} onOpen={() => setPreviewId(p.id)} />)}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((p) => <ProductListCard key={p.id} p={p} isSaved={savedIds.has(p.id)} onSave={() => toggleSave(p.id)} onQuote={() => openQuote(p)} onOpen={() => setPreviewId(p.id)} saved={saved} />)}
            </div>
          )}
        </div>
      </div>

      {/* mobile filter bottom sheet */}
      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} sel={sel} toggle={toggle} clearAll={clearAll} activeCount={activeCount} />

      {/* product overview drawer */}
      <ProductOverviewDrawer
        productId={previewId}
        onClose={() => setPreviewId(null)}
        isSaved={previewId ? savedIds.has(previewId) : false}
        onSave={() => previewId && toggleSave(previewId)}
        exhibitorId={previewProduct?.exhibitorId}
        onQuote={() => { if (previewProduct) { setQuote(previewProduct); setPreviewId(null); } }}
      />

      {/* quote request modal */}
      <RequestQuoteModal
        open={!!quote}
        onClose={() => setQuote(null)}
        canRequest={canRequestQuote}
        product={quote ? { id: quote.id, name: quote.name, vendor: quote.supplier } : null}
      />
    </div>
  );
}

/* ─── Filter bottom sheet (mobile) ────────────────────────────────── */
function FilterSheet({ open, onClose, filters: flist, sel, toggle, clearAll, activeCount }: {
  open: boolean; onClose: () => void; filters: typeof filters; sel: Record<string, string[]>;
  toggle: (label: string, o: string) => void; clearAll: () => void; activeCount: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-white dark:bg-[#1a1a1a] rounded-t-2xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">Filter</h3>
              <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {flist.map((f) => <FilterGroup key={f.label} label={f.label} options={f.options} selected={sel[f.label] ?? []} onToggle={(o) => toggle(f.label, o)} />)}
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex-shrink-0">
              <button onClick={clearAll} className="flex-1 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/60">Clear all{activeCount > 0 ? ` (${activeCount})` : ""}</button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Show results</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Heading({ saved }: { saved: boolean }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white">{saved ? "Saved Products" : "Browse Products"}</h1>
      <p className="text-[13px] text-[#9a9a9a] mt-0.5">{saved ? "Materials, equipment, and services you have bookmarked for upcoming projects." : "Discover materials, equipment, and services for your next project."}</p>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ProductsBrowseSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
    <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] lg:h-screen min-h-0 overflow-hidden">
      <div className="px-5 sm:px-8 pt-6 pb-3 flex-shrink-0 space-y-1.5">
        <S cls="h-7 w-40" />
        <S cls="h-3.5 w-72 max-w-[80vw]" />
      </div>
      <div className="px-5 sm:px-8 pb-3 flex items-center gap-2.5 flex-shrink-0 flex-wrap">
        <S cls="h-8 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1" />
        <S cls="h-8 w-28 rounded-full" />
        <S cls="h-8 w-20 rounded-full" />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden lg:flex flex-col w-[232px] flex-shrink-0 border-r border-[#f0f0f0] dark:border-white/10 px-5 py-4 space-y-4 overflow-y-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2"><S cls="h-3.5 w-24" /><div className="space-y-1.5">{Array.from({ length: 3 }).map((_, j) => <S key={j} cls="h-7 w-full rounded-lg" />)}</div></div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 flex gap-4">
              <S cls="w-24 h-20 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <S cls="h-4 w-48 max-w-full" />
                <S cls="h-3 w-64 max-w-full" />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex gap-1.5">{[56, 72, 64].map((w, j) => <S key={j} cls="h-6 rounded-full" style={{ width: w }} />)}</div>
                  <S cls="h-8 w-28 rounded-lg flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
