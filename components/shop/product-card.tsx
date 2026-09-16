"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BadgeCheck, Eye, Heart, PackageSearch, Scale, ShoppingCart } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { useCartUi } from "@/lib/store/cart-ui";
import { useCompare, COMPARE_LIMIT } from "@/lib/store/compare";
import type { AvailabilityKey } from "@/lib/services/catalog";

export type ShopCardData = {
  id: string;
  name: string;
  supplier: string;
  location: string;
  avail: string;
  availabilityKey?: AvailabilityKey;
  tags: string[];
  img: string;
  verified: boolean;
  price: number;
  /** Present when this card was hydrated from a real catalog product —
   *  needed to attribute the cart line to the right vendor for the
   *  multi-vendor checkout split. Absent → quick-add is hidden (sample data). */
  vendorCompanyId?: string;
  unit?: string;
  /** True when the product has variants — quick view is skipped in favour of the
   *  full PDP (variant selection needs the real detail page). */
  hasVariants?: boolean;
  createdAt?: string;
};

/** One circular hover action in the card's right-hand action rail. */
function ActionButton({
  label,
  active = false,
  accent = false,
  onClick,
  delay = 0,
  children,
}: {
  label: string;
  active?: boolean;
  /** Brand-yellow resting state — marks the one primary action in the rail. */
  accent?: boolean;
  onClick: (e: React.MouseEvent) => void;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm",
        "transition-all duration-200 ease-out hover:scale-110",
        // always reachable on touch, hover-reveal (slide in from the right) on desktop
        "md:opacity-0 md:translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 focus-visible:!opacity-100 focus-visible:!translate-x-0",
        active
          ? "bg-[#ffd716] text-[#1e1e1e] md:!opacity-100 md:!translate-x-0"
          : accent
            ? "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]"
            : "bg-white/90 dark:bg-black/55 text-[#6b6b6b] dark:text-white/70 hover:bg-white dark:hover:bg-black/75",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Shared e-commerce product card (grid variant) — used by the public Exhibition
 * Hub storefront (`HubBrowse`), the dashboard `Products` grid and PDP "related".
 * e.mox/Aurora-style: image hover-lift + zoom, availability pill, price, and a
 * hover action rail (quick view / compare / wishlist) plus a slide-up add-to-cart.
 * Brand: yellow #ffd716 accents, ink #1e1e1e text.
 *
 * All action props are optional and additive — call sites that don't pass them
 * (dashboard grid, PDP related rail) keep exactly their previous behaviour.
 */
export function ShopProductCard({
  p,
  href,
  isSaved = false,
  onSave,
  showSave = true,
  onClick,
  onQuickView,
  showCompare = false,
}: {
  p: ShopCardData;
  href?: string;
  isSaved?: boolean;
  onSave?: (id: string) => void;
  showSave?: boolean;
  onClick?: () => void;
  /** Enables the "Quick view" action. Products with variants bypass this and go
   *  straight to `href` (the full PDP) because variants must be picked there. */
  onQuickView?: (p: ShopCardData) => void;
  /** Enables the "Compare" action (Exhibition Hub storefront). */
  showCompare?: boolean;
}) {
  const router = useRouter();
  const live = /^in stock|rent/i.test(p.avail);
  const addItem = useCart((s) => s.addItem);
  const openCart = useCartUi((s) => s.setOpen);
  const toggleCompare = useCompare((s) => s.toggle);
  const inCompare = useCompare((s) => s.items.some((i) => i.id === p.id));
  // The compare shortlist is localStorage-persisted, so only trust it post-mount
  // (keeps SSR and the first client render identical).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const compared = mounted && inCompare;
  // Quick-add is PARKED: there's no cart to add to now that buyers arrange
  // purchases with the seller. The handler and hover action below are left in
  // place behind this flag so re-enabling is a one-line change.
  const CART_ENABLED = false;
  const canQuickAdd = CART_ENABLED && live && !!p.vendorCompanyId && p.price > 0;
  const detailHref = href ?? `/exhibition-hub/${p.id}`;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function quickAdd(e: React.MouseEvent) {
    stop(e);
    addItem({
      productId: p.id, name: p.name, image: p.img, unit: p.unit || "unit",
      unitPrice: p.price, vendorCompanyId: p.vendorCompanyId, vendorName: p.supplier,
    });
    toast.success("Added to cart", { action: { label: "View cart", onClick: () => openCart(true) } });
  }

  function handleQuickView(e: React.MouseEvent) {
    stop(e);
    // Variants can only be chosen on the real PDP — never fake them in a modal.
    if (p.hasVariants) { router.push(detailHref); return; }
    onQuickView?.(p);
  }

  function handleCompare(e: React.MouseEvent) {
    stop(e);
    const result = toggleCompare({
      id: p.id, name: p.name, img: p.img, supplier: p.supplier, location: p.location,
      avail: p.avail, price: p.price, unit: p.unit, verified: p.verified,
      tags: p.tags, vendorCompanyId: p.vendorCompanyId,
    });
    if (result === "full") toast.error(`You can compare up to ${COMPARE_LIMIT} products`);
    else if (result === "added") toast("Added to compare");
  }

  const body = (
    <>
      <div className="relative aspect-square bg-[#f4f4f4] dark:bg-white/5 overflow-hidden">
        {p.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.img}
            alt={p.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#c3c3c3]"><PackageSearch size={26} /></div>
        )}

        {/* availability pill */}
        <span
          className={cn(
            "absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm",
            live ? "bg-[#dcfce7]/95 text-[#16803c]" : "bg-[#fff7cc]/95 text-[#8a6d00]",
          )}
        >
          {p.avail}
        </span>

        {/* Verified reads as a mark alone — the word doubled the badge's width
            on a 2-up mobile grid for no extra meaning. */}
        {p.verified && (
          <span
            title="Verified supplier"
            aria-label="Verified supplier"
            className="absolute top-2.5 left-2.5 translate-y-[26px] inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur text-[#0369a1]"
          >
            <BadgeCheck size={14} />
          </span>
        )}

        {/* Action rail — quick view / compare / wishlist / add to cart. Cart
            joined the rail as a fourth icon rather than the full-width
            slide-up bar it used to be, which ate a third of the image on a
            phone and never revealed itself on touch. */}
        {(onQuickView || showCompare || showSave || canQuickAdd) && (
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-[2]">
            {onQuickView && (
              <ActionButton label={p.hasVariants ? "View details" : "Quick view"} onClick={handleQuickView}>
                <Eye size={15} />
              </ActionButton>
            )}
            {showCompare && (
              <ActionButton label={compared ? "Remove from compare" : "Compare"} active={compared} onClick={handleCompare} delay={40}>
                <Scale size={15} />
              </ActionButton>
            )}
            {showSave && (
              <ActionButton
                label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                onClick={(e) => { stop(e); onSave?.(p.id); }}
                delay={80}
              >
                <Heart size={15} className={isSaved ? "fill-[#e5484d] text-[#e5484d]" : undefined} />
              </ActionButton>
            )}
            {canQuickAdd && (
              <ActionButton label="Add to cart" accent onClick={quickAdd} delay={120}>
                <ShoppingCart size={15} />
              </ActionButton>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white leading-snug line-clamp-2 min-h-[2.6em]">{p.name}</h3>
        <p className="mt-1 text-[11.5px] text-[#8c8c8c] dark:text-white/50 truncate">{p.supplier}</p>
        <div className="mt-2.5 pt-2.5 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-2">
          <span className="text-[14.5px] font-black text-[#1e1e1e] dark:text-white tabular-nums">
            {p.price > 0 ? naira(p.price) : "Request price"}
          </span>
          {/* Touch devices never get the hover state, so the affordance that
              tells you the card opens a full product page has to be visible by
              default there; pointer devices keep the reveal-on-hover. */}
          <span className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-[#1e1e1e] text-white dark:bg-white dark:text-[#1e1e1e] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">View</span>
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden hover:border-[#ffd716] hover:shadow-[0_14px_40px_rgba(0,0,0,0.09)] dark:hover:shadow-[0_14px_40px_rgba(255,215,22,0.06)] transition-all duration-300"
    >
      {href ? (
        <Link href={href} className="flex flex-col h-full cursor-pointer">{body}</Link>
      ) : (
        <div
          onClick={onClick}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
          className={cn("flex flex-col h-full", onClick && "cursor-pointer")}
        >
          {body}
        </div>
      )}
    </motion.div>
  );
}
