"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Search, TrendingUp, X, PackageSearch, Package,
  Grid3x3, Zap, TreePine, Wrench, Warehouse, Truck, ShieldCheck, type LucideIcon,
} from "lucide-react";
import type { ProductCard } from "@/lib/services/catalog";
import { ShopProductCard, type ShopCardData } from "@/components/shop/product-card";
import { QuickViewModal } from "@/components/shop/quick-view-modal";
import { PromotedListings } from "@/components/ui/promoted-listings";
import { toggleSaved } from "@/lib/services/saved";
import { getProductCategories } from "@/lib/services/taxonomy";
import {
  CategoryCardRail, CategoryTiles, FilterPill, HubPromoBanner, ProductRail, SectionHeader,
  SupplierGrid, deriveSuppliers, type CategoryCardData, type CategoryTile,
} from "@/components/exhibition-hub/hub-sections";
import { CompareTray } from "@/components/exhibition-hub/compare-tray";

/** The six canonical category groups. Used as the fallback while the
 *  admin-managed product-category taxonomy is empty — either way every group
 *  appears in the category dropdown/filter; a group the hub has no products
 *  for simply renders a zero count. Names match exhibitor onboarding, so a
 *  listing filed under one of them always lands under its group. */
const CURATED = [
  "Building Materials",
  "Construction Equipment & Machinery",
  "Tools & Hardware",
  "Safety (PPE)",
  "Building Services (Electrical, Plumbing, HVAC, Fire Protection)",
  "Interior, Exterior & Landscaping",
];

/** One icon per curated category — the chip row reads more like a real
 *  storefront category rail this way, not just plain-text pills. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Building Materials": Warehouse,
  "Construction Equipment & Machinery": Truck,
  "Tools & Hardware": Wrench,
  "Safety (PPE)": ShieldCheck,
  "Building Services (Electrical, Plumbing, HVAC, Fire Protection)": Zap,
  "Interior, Exterior & Landscaping": TreePine,
};

/** Flat, muted "jewel-tone" colors (no gradients) — one per curated category.
 *  Keeps the card carousel colorful without the neon/pastel-gradient look of
 *  the reference; stays fixed per category name regardless of which subset
 *  is actually visible. */
const CATEGORY_COLOR: Record<string, string> = {
  "Building Materials": "#3730a3",
  "Construction Equipment & Machinery": "#c2410c",
  "Tools & Hardware": "#7f1d1d",
  "Safety (PPE)": "#065f46",
  "Building Services (Electrical, Plumbing, HVAC, Fire Protection)": "#7c2d12",
  "Interior, Exterior & Landscaping": "#1e3a5f",
};

const AVAIL_FILTERS = ["All availability", "In Stock", "Made to Order", "Available for Rent"];
const DEFAULT_AVAIL = AVAIL_FILTERS[0];

const PRICE_BUCKETS = ["All prices", "Under ₦50k", "₦50k – ₦200k", "₦200k – ₦500k", "₦500k+"];
const DEFAULT_PRICE = PRICE_BUCKETS[0];
function matchesPrice(p: ProductCard, bucket: string) {
  if (bucket === DEFAULT_PRICE) return true;
  if (bucket === PRICE_BUCKETS[1]) return p.price < 50_000;
  if (bucket === PRICE_BUCKETS[2]) return p.price >= 50_000 && p.price < 200_000;
  if (bucket === PRICE_BUCKETS[3]) return p.price >= 200_000 && p.price < 500_000;
  return p.price >= 500_000; // ₦500k+
}

const SORT_OPTIONS = ["Newest", "Price: Low to High", "Price: High to Low"];
const DEFAULT_SORT = SORT_OPTIONS[0];

/** A product belongs to a category when the exhibitor filed it under that
 *  category outright; tags are the looser fallback for listings that predate
 *  the category field, matched on the full category name ("Building Materials"
 *  matches a tag that contains those words). */
function matchesCategory(p: ProductCard, cat: string) {
  if (p.category && p.category.toLowerCase() === cat.toLowerCase()) return true;
  const c = cat.toLowerCase();
  return p.tags.some((t) => t.toLowerCase().includes(c));
}

/** Verification belongs to the selling COMPANY (catalog maps `company.verified`
 *  onto every card), so a listing with no company behind it — sample content,
 *  or a card built without vendor attribution — can't be presented as coming
 *  from a verified supplier no matter how its flag reads. */
function fromVerifiedSupplier(p: ProductCard) {
  return p.verified && !!p.vendorCompanyId;
}

/**
 * The public Exhibition Hub storefront.
 *
 * Two modes off one product list:
 *  - **Discover** (nothing filtered) — curated rails, supplier stores, category
 *    tiles, a promo banner, then the full "All products" grid.
 *  - **Browse** (search / category / availability active) — just the results grid.
 *
 * Every curated section is derived from fields that actually exist on
 * `ProductCard` (availability, company verification, createdAt, category, tags)
 * — no invented discounts, ratings or "bestseller" signals — and a section with
 * nothing real behind it renders nothing at all rather than a placeholder.
 */
export function HubBrowse({
  products,
  signedIn = false,
  initialSaved = [],
}: {
  products: ProductCard[];
  signedIn?: boolean;
  initialSaved?: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [avail, setAvail] = useState(DEFAULT_AVAIL);
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved));
  const [quickView, setQuickView] = useState<ShopCardData | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /** Signed-out visitors can browse everything, but the dashboard shop and
   *  exhibitor stores are behind auth — same convention as `handleSave`. */
  const gated = (path: string) => (signedIn ? path : `/signup?redirect=${path}`);
  const shopHref = gated("/dashboard/products");
  const sellHref = gated("/dashboard/add-product");

  /** Category names and their card images are admin-managed (Admin → Taxonomy →
   *  Product categories). Read from the client so the hub keeps its one server
   *  payload, the same way the promoted row loads its adverts. */
  const [managed, setManaged] = useState<{ name: string; imageUrl: string }[] | null>(null);
  useEffect(() => {
    getProductCategories().then(setManaged).catch(() => setManaged([]));
  }, []);

  /** The categories this hub supports. Every group in the taxonomy shows in
   *  the dropdown/filter even at zero listings (new shops start empty); `img`
   *  prefers the admin's artwork and falls back to a photo from a product
   *  inside the category. */
  const present = useMemo(() => {
    const source = managed?.length ? managed : CURATED.map((name) => ({ name, imageUrl: "" }));
    return source.map(({ name, imageUrl }) => {
      const matches = products.filter((p) => matchesCategory(p, name));
      return { name, count: matches.length, img: imageUrl || matches.find((p) => p.img)?.img || "" };
    });
  }, [managed, products]);

  const chips = useMemo(() => ["All", ...present.map((c) => c.name)], [present]);

  // Same categories, presented as cards (~6 visible, carousel arrows) — the
  // primary category filter row under the hero. Categories with no image fall
  // back to a solid CATEGORY_COLOR + icon, so none are ever left blank.
  const categoryCards = useMemo<CategoryCardData[]>(() => [
    { name: "All", color: "#1e1e1e", icon: Grid3x3, count: products.length },
    ...present.map((c) => ({
      name: c.name,
      color: CATEGORY_COLOR[c.name] ?? "#3730a3",
      icon: CATEGORY_ICON[c.name],
      count: c.count,
      img: c.img,
    })),
  ], [present, products.length]);

  /** The category carrying the most listings — the hero's shortcut names it.
   *  It used to read "Popular", which claimed browse/purchase interest the hub
   *  has no data for; how much is listed is something it can actually measure.
   *  Only a category with at least one listing qualifies — otherwise the hero
   *  pill would claim "Most listed" for an empty group. */
  const topCategory = useMemo(
    () => present.reduce<(typeof present)[number] | null>((best, c) => (c.count > 0 && (!best || c.count > best.count) ? c : best), null),
    [present],
  );

  const filtering = q.trim() !== "" || cat !== "All" || avail !== DEFAULT_AVAIL || price !== DEFAULT_PRICE || verifiedOnly;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCat = cat === "All" || matchesCategory(p, cat);
      const matchesQ = !s || p.name.toLowerCase().includes(s) || p.supplier.toLowerCase().includes(s) || p.tags.some((t) => t.toLowerCase().includes(s));
      const matchesAvail = avail === DEFAULT_AVAIL || p.avail === avail;
      const matchesVerified = !verifiedOnly || fromVerifiedSupplier(p);
      return matchesCat && matchesQ && matchesAvail && matchesPrice(p, price) && matchesVerified;
    });
    if (sort === SORT_OPTIONS[1]) return [...list].sort((a, b) => a.price - b.price);
    if (sort === SORT_OPTIONS[2]) return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, q, cat, avail, price, sort, verifiedOnly]);

  /* ── Curated rails, all derived from real fields ───────────────────────── */
  const rails = useMemo(() => {
    const byKey = (k: ProductCard["availabilityKey"]) => products.filter((p) => p.availabilityKey === k);
    // "Recently added" has to be able to say when — listings with no timestamp
    // sort to the bottom of a date sort and would ride in on the claim.
    const recent = products
      .filter((p) => p.createdAt)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 10);

    const candidates = [
      { key: "recent", title: "Recently added", subtitle: "The newest listings on the hub.", items: recent },
      { key: "in_stock", title: "In stock now", subtitle: "Ready to ship from the supplier.", items: byKey("in_stock") },
      { key: "verified", title: "From verified suppliers", subtitle: "Companies Nomarc has verified.", items: products.filter(fromVerifiedSupplier) },
      { key: "made_to_order", title: "Made to order", subtitle: "Produced to your specification.", items: byKey("made_to_order") },
      { key: "rentable", title: "Available for rent", subtitle: "Equipment you can hire by the job.", items: byKey("rentable") },
    ];
    return candidates.filter((c) => c.items.length > 0).slice(0, 4).map((c) => ({ ...c, items: c.items.slice(0, 10) }));
  }, [products]);

  const suppliers = useMemo(() => deriveSuppliers(products), [products]);

  /** The five biggest categories, same source (and same admin-set imagery) as
   *  the card rail. Tiles are a "shop by what we stock" surface, so they only
   *  include groups that actually have listings — an empty group showing "0
   *  products" on a storefront tile is a dead end, not an invitation. */
  const tiles = useMemo<CategoryTile[]>(
    () => [...present].filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 5),
    [present],
  );

  async function handleSave(id: string) {
    if (!signedIn) {
      router.push(`/signup?redirect=/exhibition-hub`);
      return;
    }
    const wasSaved = savedIds.has(id);
    setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.delete(id); else n.add(id); return n; });
    toast(wasSaved ? "Removed from saved" : "Saved");
    try { await toggleSaved("product", id); }
    catch { setSavedIds((s) => { const n = new Set(s); if (wasSaved) n.add(id); else n.delete(id); return n; }); toast.error("Could not update"); }
  }

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pickCategory(c: string) {
    setCat(c);
    if (c !== "All") requestAnimationFrame(scrollToGrid);
  }

  const card = (p: ProductCard) => (
    <ShopProductCard
      key={p.id}
      p={p}
      href={`/exhibition-hub/${p.id}`}
      isSaved={savedIds.has(p.id)}
      onSave={handleSave}
      onQuickView={setQuickView}
      showCompare
    />
  );

  return (
    <section className="px-4 md:px-10 lg:px-14 pb-24">
      <div className="max-w-[1280px] mx-auto">
        {/* Hero — image banner carrying the marketplace intro copy + the
            page's one search bar. Always visible (search needs to stay
            reachable even while filtering), unlike the discover-only
            sections further down. */}
        {/* Full-bleed and square-cornered on mobile — the same treatment the
            homepage hero uses (_sections/hero.tsx) — so the two heroes read as
            one product. Height is content-driven below md instead of a fixed
            340px, which was squeezing the copy, pill and search bar together. */}
        <div className="-mx-4 md:mx-0 pt-0 md:pt-6 mb-8 md:mb-10">
          <div className="relative rounded-none md:rounded-[24px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/exhibitors.webp" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f]/92 via-[#0f0f0f]/65 to-[#0f0f0f]/30 md:from-[#0f0f0f]/88 md:via-[#0f0f0f]/50 md:to-[#0f0f0f]/20" />
            {/* The height lives on the content box, not the wrapper: with an
                auto-height parent `h-full` resolves to the content's own
                height, so the wrapper's extra min-height piled up as dead
                space below the search bar instead of centring around it. */}
            <div className="relative min-h-[440px] md:min-h-0 md:h-[460px] flex flex-col items-center justify-center text-center px-5 md:px-10 py-14 md:py-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ffd716] mb-3">Exhibition Hub</p>
              <h1 className="text-[clamp(1.5rem,6.4vw,2.5rem)] font-bold leading-[1.12] tracking-tight text-white max-w-[720px] [text-wrap:balance]">
                The marketplace for everything you build with.
              </h1>
              <p className="mt-3 text-[13.5px] sm:text-[15px] leading-relaxed text-white/70 max-w-[540px]">
                Browse verified materials, equipment and products from suppliers across Nigeria.
                {/* Second sentence is the first thing to go on a phone — it took the
                    paragraph to five lines and pushed the search bar off-balance. */}
                <span className="hidden sm:inline">
                  {" "}Compare, request a quote, or order — with the back-and-forth a construction deal actually needs.
                </span>
              </p>
              {topCategory && (
                <button
                  type="button"
                  onClick={() => pickCategory(topCategory.name)}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/90 hover:bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1e1e1e] shadow-sm transition-colors"
                >
                  <TrendingUp size={12} className="text-[#caa400]" /> Most listed: {topCategory.name}
                </button>
              )}
              <div className="relative mt-4 w-full sm:max-w-[520px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search materials, products or suppliers…"
                  className="w-full pl-11 pr-4 h-11 md:h-12 rounded-xl border-none bg-white text-[14px] text-[#1e1e1e] placeholder:text-[#9a9a9a] shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ffd716] transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promotion cards — admin-managed Ad Board, right after the hero */}
        <div className="mb-8 md:mb-10">
          <PromotedListings variant="row" />
        </div>

        {/* Filters — category / availability / price / sort dropdowns + a
            verified-only toggle, all backed by real ProductCard fields. */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <FilterPill label="Category" value={cat} options={chips} onChange={pickCategory} />
          <FilterPill label="Availability" value={avail} options={AVAIL_FILTERS} onChange={setAvail} />
          <FilterPill label="Price" value={price} options={PRICE_BUCKETS} onChange={setPrice} />
          <FilterPill label="Sort by" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          <button
            type="button"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-lg border text-[13px] font-semibold transition-colors ${
              verifiedOnly ? "border-[#1e1e1e] dark:border-white text-[#1e1e1e] dark:text-white" : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
            }`}
          >
            <span className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${verifiedOnly ? "bg-[#ffd716]" : "bg-[#d4d4d4] dark:bg-white/15"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${verifiedOnly ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
            Verified only
          </button>
        </div>

        {/* Category cards — image carousel, ~6 visible with prev/next arrows.
            Hidden entirely when nothing is categorised: a rail holding only
            "All" is a category surface with no categories in it. */}
        {present.length > 0 && (
          <div className="mb-10">
            <CategoryCardRail cards={categoryCards} active={cat} onPick={pickCategory} />
          </div>
        )}

        {/* ── Discover mode: curated storefront sections ─────────────────── */}
        {!filtering && (
          <>
            {rails.map((r) => (
              <ProductRail
                key={r.key}
                title={r.title}
                subtitle={r.subtitle}
                viewAllHref={shopHref}
                products={r.items}
                renderCard={card}
              />
            ))}

            <SupplierGrid
              suppliers={suppliers}
              viewAllHref={gated("/dashboard/companies")}
              hrefFor={(s) => (s.companyId ? gated(`/dashboard/products/exhibitor/${s.companyId}`) : shopHref)}
            />

            <CategoryTiles tiles={tiles} onPick={pickCategory} />

            <HubPromoBanner exhibitorHref={gated("/dashboard/add-product")} onBrowse={scrollToGrid} />
          </>
        )}

        {/* ── Full grid ─────────────────────────────────────────────────── */}
        <div ref={gridRef} className="scroll-mt-24">
          {filtering ? (
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[13px] text-[#9a9a9a]">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                {cat !== "All" && <> in <span className="font-semibold text-[#1e1e1e] dark:text-white">{cat}</span></>}
              </p>
              <button
                onClick={() => { setQ(""); setCat("All"); setAvail(DEFAULT_AVAIL); setPrice(DEFAULT_PRICE); setVerifiedOnly(false); }}
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#9a9a9a] hover:text-[#e5484d] transition-colors"
              >
                <X size={13} /> Clear filters
              </button>
            </div>
          ) : (
            <SectionHeader
              title="All products"
              subtitle={`${filtered.length} listing${filtered.length !== 1 ? "s" : ""} from suppliers across Nigeria.`}
              viewAllHref={shopHref}
            />
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><PackageSearch size={22} /></div>
              {products.length === 0 ? (
                <>
                  <p className="mt-4 text-[15px] font-bold text-[#1e1e1e] dark:text-white">No products listed yet</p>
                  <p className="mt-1 text-[13px] text-[#9a9a9a]">The marketplace opens as soon as the first exhibitor lists a product.</p>
                  <Link
                    href={sellHref}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] px-5 py-3 text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors"
                  >
                    Become an exhibitor
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[15px] font-bold text-[#1e1e1e] dark:text-white">No products found</p>
                  <p className="mt-1 text-[13px] text-[#9a9a9a]">Try a different search or category.</p>
                </>
              )}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {filtered.map((p) => card(p))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick view + compare surfaces */}
      <QuickViewModal
        product={quickView}
        onClose={() => setQuickView(null)}
        href={quickView ? `/exhibition-hub/${quickView.id}` : undefined}
        isSaved={quickView ? savedIds.has(quickView.id) : false}
        onSave={handleSave}
      />
      <CompareTray />
    </section>
  );
}
