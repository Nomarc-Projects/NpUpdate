"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Heart, MapPin, PackageSearch, ShoppingCart, X } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { useCartUi } from "@/lib/store/cart-ui";
import type { ShopCardData } from "@/components/shop/product-card";

/**
 * Lightweight product preview raised from a card's "Quick view" action.
 * Centered dialog (same pattern as kit/confirm-dialog — the app's `Modal` is a
 * right slide-over meant for long forms). Deliberately shallow: image, name,
 * price, supplier, availability, add-to-cart + a link through to the real PDP.
 * Products WITH variants never reach here — the card routes those to the PDP,
 * because variant selection only exists on the full detail page.
 */
export function QuickViewModal({
  product,
  onClose,
  href,
  isSaved = false,
  onSave,
}: {
  product: ShopCardData | null;
  onClose: () => void;
  /** PDP link; defaults to the public Exhibition Hub detail route. */
  href?: string;
  isSaved?: boolean;
  onSave?: (id: string) => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCartUi((s) => s.setOpen);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  const p = product;
  const live = p ? /^in stock|rent/i.test(p.avail) : false;
  // PARKED with the rest of checkout — buyers reach the seller from the product
  // page instead. "View full details" below remains the route onward.
  const CART_ENABLED = false;
  const canAdd = CART_ENABLED && !!p && live && !!p.vendorCompanyId && p.price > 0;
  const detailHref = p ? href ?? `/exhibition-hub/${p.id}` : "#";

  return (
    <AnimatePresence>
      {p && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Quick view — ${p.name}`}
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full sm:max-w-[720px] max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-black/55 backdrop-blur flex items-center justify-center text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
            >
              <X size={17} />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[340px] bg-[#f4f4f4] dark:bg-white/5">
                {p.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.img} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#c3c3c3]"><PackageSearch size={28} /></div>
                )}
                <span
                  className={cn(
                    "absolute top-3 left-3 inline-flex items-center text-[10.5px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm",
                    live ? "bg-[#dcfce7]/95 text-[#16803c]" : "bg-[#fff7cc]/95 text-[#8a6d00]",
                  )}
                >
                  {p.avail}
                </span>
              </div>

              {/* Details */}
              <div className="p-5 sm:p-6 flex flex-col">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#caa400] dark:text-[#ffd716]">Quick view</p>
                <h3 className="mt-2 text-[18px] sm:text-[20px] font-bold leading-snug text-[#1e1e1e] dark:text-white">{p.name}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#8c8c8c] dark:text-white/55">
                  <span className="inline-flex items-center gap-1 font-medium text-[#6b6b6b] dark:text-white/70">
                    {p.supplier}
                    {p.verified && <BadgeCheck size={13} className="text-[#0369a1]" />}
                  </span>
                  {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>}
                </div>

                <p className="mt-4 text-[22px] font-black tabular-nums text-[#1e1e1e] dark:text-white">
                  {p.price > 0 ? naira(p.price) : "Request price"}
                  {p.price > 0 && p.unit && <span className="ml-1 text-[12px] font-semibold text-[#9a9a9a]">/ {p.unit}</span>}
                </p>

                {p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((t) => (
                      <span key={t} className="inline-flex items-center rounded-full bg-[#f3f3f3] dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b] dark:text-white/70">{t}</span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-5 flex flex-col gap-2.5">
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        addItem({
                          productId: p.id, name: p.name, image: p.img, unit: p.unit || "unit",
                          unitPrice: p.price, vendorCompanyId: p.vendorCompanyId, vendorName: p.supplier,
                        });
                        toast.success("Added to cart", { action: { label: "View cart", onClick: () => openCart(true) } });
                      }}
                      className="h-11 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#e6c114] transition-colors"
                    >
                      <ShoppingCart size={15} /> Add to cart
                    </button>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={detailHref}
                      onClick={onClose}
                      className="flex-1 h-11 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white inline-flex items-center justify-center gap-1.5 hover:border-[#ffd716] transition-colors"
                    >
                      View full details <ArrowRight size={14} />
                    </Link>
                    {onSave && (
                      <button
                        type="button"
                        onClick={() => onSave(p.id)}
                        aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                        className="w-11 h-11 flex-shrink-0 rounded-xl border border-[#e3e3e3] dark:border-white/15 flex items-center justify-center text-[#9a9a9a] hover:border-[#e5484d] hover:text-[#e5484d] transition-colors"
                      >
                        <Heart size={16} className={isSaved ? "fill-[#e5484d] text-[#e5484d]" : undefined} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
