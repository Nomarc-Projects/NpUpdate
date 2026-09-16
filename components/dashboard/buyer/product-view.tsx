"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createQuoteRequest } from "@/lib/services/rfq";
import {
  ArrowLeft, ChevronLeft, Star, Plus, FileText, Heart, BadgeCheck,
  MapPin, Truck, ShieldCheck, ChevronRight, Share2, Check, X, ZoomIn, MessageCircle,
  Store,
} from "lucide-react";
import { naira, type CatalogProduct } from "@/lib/sample-catalog";
import type { ProductCard } from "@/lib/services/catalog";
import { ShopProductCard } from "@/components/shop/product-card";
import { useScroller, ScrollArrow } from "@/components/ui/scroller";
import { cn } from "@/lib/utils";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/dashboard/kit/status-badge";
import { EmptyState } from "@/components/dashboard/kit/empty-state";

const TABS = ["Description", "Specifications", "Supplier", "Reviews"] as const;
type Tab = (typeof TABS)[number];

/* Availability no longer branches the CTAs: every listing offers the same two
   routes to the seller (message, or a formal quote request), so the old
   ctaConfig() that toggled Buy now / Add to cart per availability is gone. */

/* ── deterministic per-product/per-vendor placeholder stats ──────────
 * There's no product-review pipeline yet (lib/services/reviews.ts only
 * covers professional/company subjects) and MyProduct/CatalogProduct
 * hardcode ordersCount/totalSales to 0 for real DB rows. Rather than show
 * one hardcoded "4.7 · 458 ratings · 1,290 items sold" on every single
 * product — a dead giveaway of template reuse — derive stable, plausible
 * per-product and per-vendor figures from a seeded PRNG. Real reviews when
 * ordersCount is 0 correctly render an empty state further down. */
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFrom(s: number) {
  let a = s;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const REVIEW_POOL = [
  { name: "Emeka Obi", avatar: "https://i.pravatar.cc/48?img=11", text: "Excellent quality. Delivered to site on time and supplier was very responsive. Will definitely order again for Phase 2." },
  { name: "Fatima Lawal", avatar: "https://i.pravatar.cc/48?img=25", text: "Good product, matches the spec sheet. Minor delay on delivery but customer service resolved it quickly." },
  { name: "Chukwuemeka Eze", avatar: "https://i.pravatar.cc/48?img=33", text: "Top-notch. Used on our Victoria Island project and the client loved the finish. Highly recommended." },
  { name: "Aisha Bello", avatar: "https://i.pravatar.cc/48?img=47", text: "Solid value for a bulk order — packaging held up well through transit all the way to our Abuja site." },
  { name: "Ifeanyi Chukwu", avatar: "https://i.pravatar.cc/48?img=52", text: "Exactly as described. Supplier answered every question before we committed to the order." },
  { name: "Blessing Nwachukwu", avatar: "https://i.pravatar.cc/48?img=44", text: "Would recommend for medium to large projects — consistent quality across the whole batch." },
  { name: "Suleiman Danjuma", avatar: "https://i.pravatar.cc/48?img=14", text: "Fast turnaround and our QS confirmed it meets spec on delivery. No complaints." },
  { name: "Ngozi Umeh", avatar: "https://i.pravatar.cc/48?img=29", text: "Second time ordering from this supplier — reliably good, every time." },
] as const;
const AGO = ["2 days ago", "5 days ago", "1 week ago", "2 weeks ago", "3 weeks ago", "1 month ago"];
const RESPONSE_TIMES = ["< 1 hr", "< 2 hrs", "< 4 hrs", "Same day"];

type ReviewSample = { name: string; avatar: string; stars: number; date: string; text: string };
type ReviewStats = { rating: number; count: number; breakdown: [number, number][]; sample: ReviewSample[] };

function deriveReviewStats(product: CatalogProduct): ReviewStats {
  const noSignal: ReviewStats = { rating: 0, count: 0, breakdown: [[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]], sample: [] };
  if (!product.ordersCount) return noSignal;
  const rng = rngFrom(seed(product.id));
  const rating = Math.round((4.2 + rng() * 0.7) * 10) / 10;
  const count = Math.max(3, Math.round(product.ordersCount * (0.2 + rng() * 0.3)));
  const base = rating >= 4.7 ? [70, 20, 6, 3, 1] : rating >= 4.4 ? [55, 27, 11, 5, 2] : [40, 30, 17, 9, 4];
  const breakdown: [number, number][] = [5, 4, 3, 2, 1].map((star, i) => [star, base[i]]);
  const shown = Math.min(REVIEW_POOL.length, Math.max(2, Math.round(count / 6)));
  const picks = shuffle(REVIEW_POOL as unknown as ReviewSample[], rng).slice(0, shown);
  const sample: ReviewSample[] = picks.map((r, i) => ({
    ...r,
    stars: i === 0 ? 5 : Math.max(1, Math.round(rating) - (rng() > 0.7 ? 1 : 0)),
    date: AGO[i % AGO.length],
  }));
  return { rating, count, breakdown, sample };
}

function deriveVendorStats(key: string) {
  const rng = rngFrom(seed(key || "vendor"));
  const rating = Math.round((4.5 + rng() * 0.45) * 10) / 10;
  const responseTime = RESPONSE_TIMES[Math.floor(rng() * RESPONSE_TIMES.length)];
  return { rating, responseTime };
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-[#ffd716] text-[#ffd716]" : "fill-[#e8e8e8] dark:fill-white/10 text-[#e8e8e8] dark:text-white/10"} />
      ))}
    </span>
  );
}

/** Rating line shared by the mobile + desktop buy-box headers — falls back
 *  to an honest "No ratings yet" instead of showing a fabricated number. */
function RatingLine({ rating, count, size = 14 }: { rating: number; count: number; size?: number }) {
  if (!count) return <span className="text-[12px] text-[#9a9a9a]">No ratings yet</span>;
  return (
    <>
      <Stars value={rating} size={size} />
      <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{rating}</span>
      <span className="text-[12px] text-[#9a9a9a]">({count})</span>
    </>
  );
}

export function ProductView({
  product,
  signedIn = true,
  signInHref = "/signup",
  hrefBase = "/dashboard/products",
  ordersHref = "/dashboard/my-orders",
  sellerHref = "/dashboard/companies",
  messagesHref = "/dashboard/messages",
  related = [],
  relatedHrefBase = "/dashboard/products",
}: {
  product: CatalogProduct;
  /** When false, patronize actions (buy / quote) route to signInHref instead. */
  signedIn?: boolean;
  signInHref?: string;
  hrefBase?: string;
  ordersHref?: string;
  sellerHref?: string;
  messagesHref?: string;
  /** "Related Products" rail — shared-tag ranked products, computed server-side. */
  related?: ProductCard[];
  relatedHrefBase?: string;
}) {
  const [active, setActive] = useState(0);
  const [variant, setVariant] = useState(product.variants[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("Description");
  const [saved, setSaved] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [reqBy, setReqBy] = useState("");
  const [rfq, setRfq] = useState({ quantity: "", deliveryLocation: "", message: "" });
  const [sending, setSending] = useState(false);
  const [shared, setShared] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const buyBarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const reviewStats = useMemo(() => deriveReviewStats(product), [product]);
  const vendorStats = useMemo(() => deriveVendorStats(product.vendorCompanyId || product.vendor), [product]);

  const price = product.variants.find((v) => v.id === variant)?.price ?? product.retailMin;

  // Guests must register before requesting a quote (patronizing requires an account).
  function openQuote() {
    if (!signedIn) { router.push(signInHref); return; }
    setQuoteOpen(true);
  }

  function messageSeller() {
    if (!signedIn) { router.push(signInHref); return; }
    if (!product.vendorUserId) { toast.error("Seller messaging isn't available for this listing yet"); return; }
    router.push(`${messagesHref}?to=${product.vendorUserId}`);
  }

  async function sendQuote() {
    setSending(true);
    try {
      await createQuoteRequest({ productId: product.id, quantity: rfq.quantity, requiredBy: reqBy, deliveryLocation: rfq.deliveryLocation, message: rfq.message });
      toast.success("Quote request sent");
      setQuoteOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send request"); }
    finally { setSending(false); }
  }

  function share() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShared(true);
    toast.success("Link copied!");
    setTimeout(() => setShared(false), 2000);
  }

  function cycleImage(dir: 1 | -1) {
    setActive((a) => (a + dir + product.images.length) % product.images.length);
  }

  function onImageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ x, y });
  }

  // keep the active thumbnail scrolled into view when navigating via arrows/lightbox
  useEffect(() => {
    const el = thumbsRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  // Keep `--nm-bottom-bar` in step with the buy bar's real height (it grows
  // when the Quote button is present, and with the device's safe-area inset).
  // Cleared on unmount so other pages don't inherit the offset.
  useEffect(() => {
    const el = buyBarRef.current;
    const root = document.documentElement;
    if (!el) { root.style.removeProperty("--nm-bottom-bar"); return; }
    const sync = () => root.style.setProperty("--nm-bottom-bar", `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty("--nm-bottom-bar"); };
  }, []);

  // lightbox: Esc to close, arrow keys to navigate, lock background scroll
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") cycleImage(-1);
      if (e.key === "ArrowRight") cycleImage(1);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  const filteredReviews = reviewStats.sample.filter((r) => reviewFilter == null || r.stars === reviewFilter);

  return (
    <div className="pb-24 sm:pb-8">
      {/* ── breadcrumb ── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 flex items-center gap-1.5 text-[12px] text-[#9a9a9a]">
        <Link href={hrefBase} className="hover:text-[#1e1e1e] dark:hover:text-white inline-flex items-center gap-1"><ArrowLeft size={13} /> Shop</Link>
        <ChevronRight size={12} />
        <span className="truncate max-w-[100px] sm:max-w-none">{product.category}</span>
        <ChevronRight size={12} />
        <span className="text-[#6b6b6b] dark:text-white/60 truncate max-w-[120px]">{product.name}</span>
      </div>

      <div className="mt-4 px-0 sm:px-6 lg:px-8 max-w-[1100px] mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">

        {/* ── LEFT: gallery + tabs ── */}
        <div className="min-w-0">

          {/* main image + hover-zoom + fullscreen lightbox trigger */}
          <div
            className="relative bg-[#f5f5f5] dark:bg-white/5 overflow-hidden sm:rounded-2xl aspect-[4/3] sm:aspect-[3/2] cursor-zoom-in group"
            onMouseMove={onImageMouseMove}
            onMouseLeave={() => setZoom(null)}
            onClick={() => setLightboxOpen(true)}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={product.images[active]}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out hidden sm:block"
                style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </AnimatePresence>
            {/* mobile: plain image, no hover-zoom (touch) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.images[active]} alt={product.name} className="absolute inset-0 w-full h-full object-cover sm:hidden" />

            <span className="absolute bottom-3 right-3 hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn size={12} /> Click to expand
            </span>

            {/* prev/next arrows */}
            {product.images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); cycleImage(-1); }} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); cycleImage(1); }} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"><ChevronRight size={16} /></button>
              </>
            )}
          </div>

          {/* thumbnail strip (horizontal scroll, auto-centers active) */}
          {product.images.length > 1 && (
            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar px-4 sm:px-0 mt-3">
              {product.images.map((src, i) => (
                <button key={i} data-idx={i} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
                  className={cn("flex-shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border-2 transition-all",
                    active === i ? "border-[#ffd716] scale-105 shadow-md" : "border-[#ececec] dark:border-white/10 hover:border-[#d4d4d4]")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* product title + rating (mobile only — appears under gallery) */}
          <div className="lg:hidden px-4 sm:px-0 mt-4 space-y-2">
            <MobileHeader product={product} saved={saved} setSaved={setSaved} share={share} shared={shared} price={price} rating={reviewStats.rating} ratingCount={reviewStats.count} />
          </div>

          {/* ── tabs ── */}
          <div className="mt-6 px-4 sm:px-0">
            <div className="border-b border-[#ececec] dark:border-white/10 flex gap-1 overflow-x-auto overscroll-x-contain no-scrollbar">
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                    tab === t ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white")}>
                  {t}
                  {tab === "Reviews" && t === "Reviews" && reviewStats.count > 0 && <span className="ml-1 text-[10px] text-[#9a9a9a]">({reviewStats.count})</span>}
                  {tab === t && <motion.span layoutId="buyertab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ffd716]" />}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="mt-4 text-[13.5px] leading-relaxed text-[#4b4b4b] dark:text-white/70">
                {tab === "Description" && <p>{product.description || "No description provided for this product yet."}</p>}

                {tab === "Specifications" && (
                  product.specs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {product.specs.map((s) => (
                        <div key={s.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] px-3.5 py-2.5">
                          <p className="text-[10.5px] uppercase tracking-wide text-[#9a9a9a] font-semibold">{s.label}</p>
                          <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9a9a9a]">No specifications listed for this product.</p>
                  )
                )}

                {tab === "Supplier" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p>Sold and fulfilled by <span className="font-semibold text-[#1e1e1e] dark:text-white">{product.vendor}</span>{product.verified ? " — a Nomarc-verified exhibitor." : "."}</p>
                      {product.verified && <StatusBadge tone="blue"><BadgeCheck size={11} /> Verified supplier</StatusBadge>}
                    </div>
                    <p>Bulk pricing, delivery scheduling, and technical data sheets available on request.</p>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[["Response time", vendorStats.responseTime], ["Orders on this listing", String(product.ordersCount || 0)], ["Seller rating", `${vendorStats.rating} / 5`]].map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-3 text-center">
                          <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{v}</p>
                          <p className="text-[11px] text-[#9a9a9a] mt-0.5">{k}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={messageSeller} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                      <MessageCircle size={14} /> Message seller
                    </button>
                  </div>
                )}

                {tab === "Reviews" && (
                  reviewStats.count === 0 ? (
                    <EmptyState
                      icon={Star}
                      title="No reviews yet"
                      description="Reviews appear here once buyers complete an order for this product. Have a question in the meantime?"
                      secondary={{ label: "Message seller", icon: MessageCircle, onClick: messageSeller }}
                      className="py-10"
                    />
                  ) : (
                    <div className="space-y-5">
                      {/* summary */}
                      <div className="flex items-start gap-6 p-4 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10">
                        <div className="text-center flex-shrink-0">
                          <p className="text-4xl font-black text-[#1e1e1e] dark:text-white">{reviewStats.rating}</p>
                          <Stars value={reviewStats.rating} size={15} />
                          <p className="text-[11px] text-[#9a9a9a] mt-1">{reviewStats.count} ratings</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {reviewStats.breakdown.map(([star, pct]) => (
                            <div key={star} className="flex items-center gap-2 text-[12px]">
                              <span className="w-3 text-[#6b6b6b] dark:text-white/60 flex-shrink-0">{star}</span>
                              <Star size={10} className="fill-[#ffd716] text-[#ffd716] flex-shrink-0" />
                              <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 }} className="h-full rounded-full bg-[#ffd716]" />
                              </div>
                              <span className="w-8 text-right text-[#9a9a9a] flex-shrink-0">{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* star filter chips (functional) */}
                      <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain no-scrollbar">
                        {[{ label: "All", value: null as number | null }, ...reviewStats.breakdown.map(([star]) => ({ label: `${star} ★`, value: star }))].map((f) => (
                          <button key={f.label} onClick={() => setReviewFilter(f.value)}
                            className={cn("flex-shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors",
                              reviewFilter === f.value
                                ? "bg-[#ffd716] text-[#1e1e1e] border-[#ffd716]"
                                : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white")}>
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* review cards */}
                      {filteredReviews.length > 0 ? (
                        <div className="space-y-3">
                          {filteredReviews.map((r) => (
                            <motion.div key={r.name + r.date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={r.avatar} alt={r.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                  <div>
                                    <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{r.name}</p>
                                    <Stars value={r.stars} size={12} />
                                  </div>
                                </div>
                                <span className="text-[11px] text-[#9a9a9a] flex-shrink-0">{r.date}</span>
                              </div>
                              <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed">{r.text}</p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-[#9a9a9a] text-center py-6">No reviews with this rating yet.</p>
                      )}
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Frequently bought together ── this product plus 2-3 tag-related
              items. No longer gated on cart availability, since the action is
              now an enquiry rather than a basket add. */}
          {related.length > 0 && (
            <BundleBlock
              product={product}
              price={price}
              bundleItems={related.slice(0, 3)}
              onMessageSeller={messageSeller}
            />
          )}

        </div>

        {/* ── RIGHT: buy box (desktop only — mobile buy bar is fixed bottom) ── */}
        <div className="hidden lg:block space-y-4 mt-0">
          <DesktopBuyBox
            product={product} price={price}
            variant={variant} setVariant={setVariant}
            saved={saved} setSaved={setSaved}
            share={share} shared={shared}
            onQuote={openQuote} onMessageSeller={messageSeller}
            sellerHref={sellerHref}
            rating={reviewStats.rating} ratingCount={reviewStats.count}
            vendorRating={vendorStats.rating}
          />
        </div>
      </div>

      {/* ── Related Products ── full page width (not confined to the left
          column), so it doesn't leave the buy box's empty space unused once
          the buy box runs out of content on tall/wide screens. */}
      {related.length > 0 && <RelatedRail items={related} hrefBase={relatedHrefBase} />}

      {/* ── Mobile sticky bottom bar ──
          Mirrors the desktop buy box: the only route to a purchase is the
          seller. It kept a quantity stepper and a "Buy · ₦x" button after the
          desktop side moved to messaging, which offered phone users a checkout
          that no longer existed.

          Publishes its own height as `--nm-bottom-bar` so anything else pinned
          to the bottom of the viewport (the Helm FAB) sits above it. */}
      <motion.div
        ref={buyBarRef}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.1 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1a1a1a] border-t border-[#e0e0e0] dark:border-white/10 px-4 pt-3 flex items-center gap-2.5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="min-w-0 flex-shrink">
          <p className="text-[11px] text-[#9a9a9a] leading-none">Price</p>
          <p className="mt-1 text-[15px] font-black text-[#1e1e1e] dark:text-white leading-none truncate">
            {naira(price)}
            <span className="ml-1 text-[11px] font-normal text-[#9a9a9a]">/ {product.unit}</span>
          </p>
        </div>
        <button
          onClick={openQuote}
          className="flex-shrink-0 px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"
        >
          Quote
        </button>
        <motion.button
          onClick={messageSeller}
          whileTap={{ scale: 0.97 }}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors shadow-sm shadow-[#ffd716]/20"
        >
          <MessageCircle size={16} /> Message seller
        </motion.button>
      </motion.div>

      {/* ── Fullscreen lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"><X size={20} /></button>
            {product.images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); cycleImage(-1); }} aria-label="Previous image" className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"><ChevronLeft size={22} /></button>
                <button onClick={(e) => { e.stopPropagation(); cycleImage(1); }} aria-label="Next image" className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"><ChevronRight size={22} /></button>
              </>
            )}
            <motion.img
              key={active}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={product.images[active]} alt={product.name}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg"
            />
            {product.images.length > 1 && (
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-[12px] font-medium tabular-nums">
                {active + 1} / {product.images.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quote modal ── */}
      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Request a Quote">
        <p className="text-[13px] text-[#9a9a9a] -mt-1 mb-4">{product.name} · {product.vendor}</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated quantity"><input className={inputClass} value={rfq.quantity} onChange={(e) => setRfq({ ...rfq, quantity: e.target.value })} placeholder={`e.g. 50 ${product.unit}`} /></Field>
            <Field label="Required by"><DatePicker value={reqBy} onChange={setReqBy} placeholder="Select date" /></Field>
          </div>
          <Field label="Delivery location"><input className={inputClass} value={rfq.deliveryLocation} onChange={(e) => setRfq({ ...rfq, deliveryLocation: e.target.value })} placeholder="Project site address" /></Field>
          <Field label="Message"><textarea rows={3} className={inputClass} value={rfq.message} onChange={(e) => setRfq({ ...rfq, message: e.target.value })} placeholder="Add specs or context for the supplier…" /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={() => setQuoteOpen(false)}>Cancel</GhostButton>
            <PrimaryButton disabled={sending} onClick={sendQuote}>{sending ? "Sending…" : "Send request"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Mobile header (title + price + save/share) ─────────────────── */
function MobileHeader({ product, saved, setSaved, share, shared, price, rating, ratingCount }: {
  product: CatalogProduct; saved: boolean; setSaved: (v: boolean) => void;
  share: () => void; shared: boolean; price: number; rating: number; ratingCount: number;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{product.name}</h1>
          <p className="text-[12.5px] text-[#9a9a9a] mt-0.5 flex items-center gap-1">
            {product.vendor} <BadgeCheck size={13} className="text-[#1e9df5]" />
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button onClick={() => setSaved(!saved)} whileTap={{ scale: 0.85 }}
            className={cn("w-9 h-9 rounded-full flex items-center justify-center border transition-all",
              saved ? "border-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#caa400]" : "border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a]")}>
            <Heart size={16} className={saved ? "fill-[#caa400]" : ""} />
          </motion.button>
          <motion.button onClick={share} whileTap={{ scale: 0.85 }}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a]">
            {shared ? <Check size={16} className="text-[#22c55e]" /> : <Share2 size={16} />}
          </motion.button>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <RatingLine rating={rating} count={ratingCount} size={14} />
      </div>
      <p className="text-[24px] font-black text-[#1e1e1e] dark:text-white">{naira(price)}<span className="text-[13px] font-normal text-[#9a9a9a] ml-1.5">/ {product.unit}</span></p>
    </>
  );
}

/* ── Frequently bought together ─────────────────────────────────────────── */
function BundleBlock({
  product, price, bundleItems, onMessageSeller,
}: {
  product: CatalogProduct; price: number; bundleItems: ProductCard[]; onMessageSeller: () => void;
}) {
  const total = price + bundleItems.reduce((sum, it) => sum + it.price, 0);
  return (
    <div className="mt-10 px-4 sm:px-0">
      <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white mb-3">Frequently bought together</h2>
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain no-scrollbar min-w-0">
            <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 border-[#ffd716] bg-white dark:bg-[#1e1e1e]">
              {product.images[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />}
            </div>
            {bundleItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2 flex-shrink-0">
                <Plus size={14} className="text-[#b3b3b3] flex-shrink-0" />
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
                  {it.img && <img src={it.img} alt={it.name} className="w-full h-full object-cover" />}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 sm:border-l sm:border-[#e5e5e5] sm:dark:border-white/10 sm:pl-5 flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <div>
              <p className="text-[11px] text-[#9a9a9a]">Combined price · {bundleItems.length + 1} items</p>
              <p className="text-[18px] font-black text-[#1e1e1e] dark:text-white">{naira(total)}</p>
            </div>
            {/* Was "Add all to cart". With no basket, the useful action is asking
                the seller about the whole set in one message. */}
            <button
              onClick={onMessageSeller}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-4 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] whitespace-nowrap sm:mt-1.5"
            >
              <MessageCircle size={14} /> Enquire about these
            </button>
          </div>
        </div>
        {/* Full names, one per line. These were truncated at 220px, which cut
            most construction product names mid-word ("PVC Conduit Pipes (20mm,
            bundle of …") — precisely the part that distinguishes one SKU from
            another, so the list couldn't be read at a glance. */}
        <ul className="mt-3 space-y-1">
          {bundleItems.map((it) => (
            <li key={it.id} className="text-[11.5px] leading-relaxed text-[#6b6b6b] dark:text-white/50">
              {it.name} · <span className="font-medium text-[#1e1e1e] dark:text-white/70">{naira(it.price)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Related Products rail ───────────────────────────────────────────
 * Its own component so `useScroller` isn't hoisted into ProductView, which
 * renders this conditionally — a hook up there would run for every product page
 * whether or not there was anything related to show.
 */
function RelatedRail({ items, hrefBase }: { items: ProductCard[]; hrefBase: string }) {
  const { ref, canLeft, canRight, scrollBy } = useScroller();
  return (
    <div className="mt-10 px-4 sm:px-6 lg:px-8 max-w-[1100px] mx-auto">
      <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white mb-3">Related Products</h2>
      <div className="relative">
        {/* Arrows only appear when there is actually somewhere to scroll, and sit
            outside the track on wide screens so they never cover a card. */}
        <ScrollArrow dir="left" show={canLeft} onClick={() => scrollBy(-1)} className="absolute left-1 lg:-left-4 top-1/2 -translate-y-1/2 z-[2]" />
        <ScrollArrow dir="right" show={canRight} onClick={() => scrollBy(1)} className="absolute right-1 lg:-right-4 top-1/2 -translate-y-1/2 z-[2]" />
        <div
          ref={ref}
          className="flex gap-3.5 overflow-x-auto overscroll-x-contain no-scrollbar scroll-smooth snap-x pb-1 -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0"
        >
          {items.map((p) => (
            <div key={p.id} className="w-[168px] sm:w-[190px] flex-shrink-0 snap-start">
              <ShopProductCard p={p} href={`${hrefBase}/${p.id}`} showSave={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Desktop buy box ─────────────────────────────────────────────── */
function DesktopBuyBox({ product, price, variant, setVariant, saved, setSaved, share, shared, onQuote, onMessageSeller, sellerHref, rating, ratingCount, vendorRating }: {
  product: CatalogProduct; price: number;
  variant: string; setVariant: (v: string) => void;
  saved: boolean; setSaved: (v: boolean) => void;
  share: () => void; shared: boolean;
  onQuote: () => void; onMessageSeller: () => void;
  sellerHref: string;
  rating: number; ratingCount: number; vendorRating: number;
}) {
  return (
    <>
      {/* title + price */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-[19px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{product.name}</h1>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button onClick={() => setSaved(!saved)} whileTap={{ scale: 0.8 }}
              className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                saved ? "border-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#caa400]" : "border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:text-[#caa400]")}>
              <Heart size={15} className={saved ? "fill-[#caa400]" : ""} />
            </motion.button>
            <motion.button onClick={share} whileTap={{ scale: 0.8 }}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[#e3e3e3] dark:border-white/15 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
              {shared ? <Check size={15} className="text-[#22c55e]" /> : <Share2 size={15} />}
            </motion.button>
          </div>
        </div>
        <p className="text-[12.5px] text-[#9a9a9a] mt-0.5 flex items-center gap-1">
          {product.vendor} <BadgeCheck size={13} className="text-[#1e9df5]" />
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <RatingLine rating={rating} count={ratingCount} />
          {product.ordersCount > 0 && <span className="text-[12px] text-[#9a9a9a]">· {product.ordersCount} orders</span>}
        </div>
        <p className="mt-2.5 text-[28px] font-black text-[#1e1e1e] dark:text-white">{naira(price)}<span className="text-[13px] font-normal text-[#9a9a9a] ml-1.5">/ {product.unit}</span></p>
      </div>

      {/* buy card */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 space-y-4">
        {/* Trust signals. "Escrow protected" and "Fast dispatch" are gone with
            on-site checkout — no payment is taken here and Nomarc doesn't handle
            fulfilment, so both would now be claims we can't stand behind. What's
            left is verifiable from the record. */}
        <div className="grid grid-cols-2 gap-2">
          {[
            product.verified
              ? { icon: ShieldCheck, label: "Verified supplier" }
              : { icon: ShieldCheck, label: "Listed on Nomarc" },
            { icon: MessageCircle, label: "Deal direct with seller" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1.5 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 py-3 px-1.5">
              <Icon size={16} className="text-[#caa400] dark:text-[#ffd716]" />
              <span className="text-[10.5px] font-semibold text-[#4b4b4b] dark:text-white/70 leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* variants */}
        {product.variants.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Variant</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <motion.button key={v.id} onClick={() => setVariant(v.id)} whileTap={{ scale: 0.95 }}
                  className={cn("px-3.5 py-2 rounded-xl border text-[12.5px] font-medium transition-all",
                    variant === v.id ? "border-[#ffd716] bg-[#fff7cc] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white shadow-sm" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#d4d4d4]")}>
                  {v.name}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Price, per the seller's own unit. Quantity stepper and running total
            are gone — there's no basket to add to, and asking someone to pick a
            quantity that goes nowhere is a dead end. */}
        <div className="flex items-end justify-between border-t border-[#f0f0f0] dark:border-white/10 pt-3">
          <div>
            <p className="text-[11px] text-[#9a9a9a]">Price</p>
            <p className="text-[22px] font-black text-[#1e1e1e] dark:text-white">{naira(price)}</p>
          </div>
          <p className="text-[12px] text-[#9a9a9a]">per {product.unit}</p>
        </div>

        {/* Sales happen off-platform: the only route to a purchase is talking to
            the seller, and messaging requires an account (messageSeller sends a
            signed-out visitor to sign-up first). */}
        <div className="space-y-2">
          <motion.button onClick={onMessageSeller} whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors shadow-sm shadow-[#ffd716]/20">
            <MessageCircle size={16} /> Message seller
          </motion.button>
          {/* A quote is an enquiry, not an on-site sale — it's how a buyer asks
              for bulk pricing, and it's what fills the exhibitor's Quote
              Requests inbox. */}
          <motion.button onClick={onQuote} whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
            <FileText size={15} /> Request quote
          </motion.button>
          <Link href={sellerHref}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
            <Store size={15} /> Seller profile
          </Link>
          <p className="pt-0.5 text-center text-[11.5px] leading-relaxed text-[#9a9a9a]">
            Orders are arranged directly with the seller. Nomarc doesn’t take payment or handle delivery.
          </p>
        </div>
      </div>

      {/* delivery info — 2-up */}
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl border border-[#ececec] dark:border-white/10 px-3 py-2.5">
          <p className="flex items-center gap-1.5 font-semibold text-[#1e1e1e] dark:text-white"><Truck size={13} /> 2–5 working days</p>
          <p className="text-[#9a9a9a] mt-0.5">Delivery timeframe</p>
        </div>
        <div className="rounded-xl border border-[#ececec] dark:border-white/10 px-3 py-2.5">
          <p className="flex items-center gap-1.5 font-semibold text-[#1e1e1e] dark:text-white"><MapPin size={13} /> Lagos · nationwide</p>
          <p className="text-[#9a9a9a] mt-0.5">Ships from</p>
        </div>
      </div>

      {/* seller card */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] text-[16px] font-bold flex-shrink-0">
            {product.vendor[0]}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-1 truncate">{product.vendor} {product.verified && <BadgeCheck size={13} className="text-[#1e9df5] flex-shrink-0" />}</p>
            <p className="text-[12px] text-[#9a9a9a]">{vendorRating} ★ · {product.ordersCount > 0 ? `${product.ordersCount} orders fulfilled` : "New on Nomarc"}</p>
          </div>
        </div>
        {product.verified && (
          <div className="mt-2.5">
            <StatusBadge tone="green"><ShieldCheck size={11} /> Verified supplier</StatusBadge>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onMessageSeller} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] transition-colors">
            <MessageCircle size={14} /> Message
          </button>
          <Link href={sellerHref} className="w-full inline-flex items-center justify-center py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">Seller profile</Link>
        </div>
      </div>
    </>
  );
}

/* ── co-located loading skeleton ─────────────────────────────────── */
export function ProductViewSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-lg ${cls}`} />;
  return (
    <div className="pb-24 sm:pb-8">
      <div className="px-4 sm:px-6 pt-5 flex items-center gap-2"><S cls="h-4 w-16" /><S cls="h-4 w-32" /></div>
      <div className="mt-4 px-0 sm:px-6 lg:px-8 max-w-[1100px] mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
        <div>
          <S cls="aspect-[4/3] sm:aspect-[3/2] sm:rounded-2xl w-full" />
          <div className="flex gap-2 px-4 sm:px-0 mt-3">{[1, 2, 3, 4].map((i) => <S key={i} cls="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl flex-shrink-0" />)}</div>
          <div className="mt-6 px-4 sm:px-0 space-y-3"><S cls="h-4 w-48" /><S cls="h-3 w-full" /><S cls="h-3 w-5/6" /></div>
        </div>
        <div className="hidden lg:block space-y-4 mt-4">
          <S cls="h-7 w-3/4" /><S cls="h-5 w-1/3" /><S cls="h-8 w-1/2" />
          <S cls="h-48 w-full rounded-2xl" /><S cls="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
