"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, PackageSearch, Scale, ShoppingCart, X } from "lucide-react";
import { naira } from "@/lib/sample-catalog";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { useCartUi } from "@/lib/store/cart-ui";
import { useCompare, type CompareItem } from "@/lib/store/compare";

/** One labelled row of the comparison table. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="sticky left-0 z-[2] bg-white dark:bg-[#111] py-3 pr-4 text-[12px] font-bold uppercase tracking-wide text-[#9a9a9a] border-t border-[#f0f0f0] dark:border-white/10 shadow-[6px_0_6px_-6px_rgba(0,0,0,0.10)]">
        {label}
      </div>
      {children}
    </>
  );
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("py-3 px-4 text-[13px] text-[#1e1e1e] dark:text-white border-t border-l border-[#f0f0f0] dark:border-white/10", className)}>
      {children}
    </div>
  );
}

/**
 * Side-by-side comparison of the shopper's shortlist (max 4, see
 * lib/store/compare.ts). Everything is rendered from the persisted client
 * store — no extra DB read — so it works for guests exactly like the cart does.
 */
export function CompareView() {
  const [mounted, setMounted] = useState(false);
  const items = useCompare((s) => s.items);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  const addItem = useCart((s) => s.addItem);
  const openCart = useCartUi((s) => s.setOpen);

  useEffect(() => setMounted(true), []);

  function addToCart(p: CompareItem) {
    addItem({
      productId: p.id, name: p.name, image: p.img, unit: p.unit || "unit",
      unitPrice: p.price, vendorCompanyId: p.vendorCompanyId, vendorName: p.supplier,
    });
    toast.success("Added to cart", { action: { label: "View cart", onClick: () => openCart(true) } });
  }

  const cols = `minmax(120px,150px) repeat(${Math.max(items.length, 1)}, minmax(200px, 1fr))`;

  return (
    <section className="px-6 md:px-10 lg:px-14 pt-10 pb-24">
      <div className="max-w-[1280px] mx-auto">
        <Link href="/exhibition-hub" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back to Exhibition Hub
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">Compare products</h1>
            <p className="mt-1.5 text-[14px] text-[#6b6b6b] dark:text-white/55">
              Price, supplier and availability, side by side.
            </p>
          </div>
          {mounted && items.length > 0 && (
            <button onClick={clear} className="text-[13px] font-semibold text-[#9a9a9a] hover:text-[#e5484d] transition-colors">
              Clear all
            </button>
          )}
        </div>

        {!mounted ? (
          <div className="mt-10 h-64 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 animate-pulse" />
        ) : items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"><Scale size={22} /></div>
            <p className="mt-4 text-[15px] font-bold text-[#1e1e1e] dark:text-white">Nothing to compare yet</p>
            <p className="mt-1 text-[13px] text-[#9a9a9a] max-w-sm">
              Hover any product in the Exhibition Hub and tap the compare icon to shortlist up to four.
            </p>
            <Link href="/exhibition-hub" className="mt-5 px-5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">
              Browse products
            </Link>
          </div>
        ) : (
          // No `-mx-6 px-6` bleed here, unlike the hub rails: `left-0` on a
          // sticky child resolves against the scrollport's padding edge, so the
          // bleed left a 24px strip to the left of the frozen label column that
          // the scrolling product columns showed through.
          <div className="mt-8 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
            <div className="grid min-w-[640px]" style={{ gridTemplateColumns: cols }}>
              {/* Header row — product identity */}
              <div className="sticky left-0 z-[2] bg-white dark:bg-[#111] shadow-[6px_0_6px_-6px_rgba(0,0,0,0.10)]" />
              {items.map((p) => (
                <div key={p.id} className="relative px-4 pb-4 border-l border-[#f0f0f0] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute top-2 right-5 z-[2] w-7 h-7 rounded-full bg-white/90 dark:bg-black/55 backdrop-blur flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <Link href={`/exhibition-hub/${p.id}`} className="block group">
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#f4f4f4] dark:bg-white/5">
                      {p.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.img} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[#c3c3c3]"><PackageSearch size={24} /></div>
                      )}
                    </div>
                    <h2 className="mt-3 text-[13.5px] font-bold leading-snug text-[#1e1e1e] dark:text-white line-clamp-2 group-hover:text-[#caa400] dark:group-hover:text-[#ffd716] transition-colors">
                      {p.name}
                    </h2>
                  </Link>
                </div>
              ))}

              <Row label="Price">
                {items.map((p) => (
                  <Cell key={p.id} className="font-black tabular-nums">
                    {p.price > 0 ? naira(p.price) : <span className="font-semibold text-[#9a9a9a]">Request price</span>}
                    {p.price > 0 && p.unit && <span className="ml-1 text-[11.5px] font-semibold text-[#9a9a9a]">/ {p.unit}</span>}
                  </Cell>
                ))}
              </Row>

              <Row label="Supplier">
                {items.map((p) => (
                  <Cell key={p.id}>
                    <span className="inline-flex items-center gap-1">
                      {p.supplier}
                      {p.verified && <BadgeCheck size={13} className="text-[#0369a1]" />}
                    </span>
                  </Cell>
                ))}
              </Row>

              <Row label="Location">
                {items.map((p) => (
                  <Cell key={p.id} className="text-[#6b6b6b] dark:text-white/60">{p.location || "—"}</Cell>
                ))}
              </Row>

              <Row label="Availability">
                {items.map((p) => (
                  <Cell key={p.id}>
                    <span className={cn(
                      "inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full",
                      /^in stock|rent/i.test(p.avail) ? "bg-[#dcfce7] text-[#16803c]" : "bg-[#fff7cc] text-[#8a6d00]",
                    )}>
                      {p.avail}
                    </span>
                  </Cell>
                ))}
              </Row>

              <Row label="Unit">
                {items.map((p) => (
                  <Cell key={p.id} className="text-[#6b6b6b] dark:text-white/60">{p.unit || "—"}</Cell>
                ))}
              </Row>

              <Row label="Tags">
                {items.map((p) => (
                  <Cell key={p.id}>
                    {p.tags.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {p.tags.slice(0, 4).map((t) => (
                          <span key={t} className="inline-flex items-center rounded-full bg-[#f3f3f3] dark:bg-white/5 px-2 py-0.5 text-[11px] font-medium text-[#6b6b6b] dark:text-white/70">{t}</span>
                        ))}
                      </span>
                    ) : <span className="text-[#9a9a9a]">—</span>}
                  </Cell>
                ))}
              </Row>

              <Row label="">
                {items.map((p) => {
                  // PARKED with checkout — "View details" leads to the seller.
                  const CART_ENABLED = false;
                  const canAdd = CART_ENABLED && /^in stock|rent/i.test(p.avail) && !!p.vendorCompanyId && p.price > 0;
                  return (
                    <Cell key={p.id}>
                      <div className="flex flex-col gap-2">
                        {canAdd ? (
                          <button
                            onClick={() => addToCart(p)}
                            className="h-10 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#e6c114] transition-colors"
                          >
                            <ShoppingCart size={14} /> Add to cart
                          </button>
                        ) : null}
                        <Link
                          href={`/exhibition-hub/${p.id}`}
                          className="h-10 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white inline-flex items-center justify-center hover:border-[#ffd716] transition-colors"
                        >
                          View details
                        </Link>
                      </div>
                    </Cell>
                  );
                })}
              </Row>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
