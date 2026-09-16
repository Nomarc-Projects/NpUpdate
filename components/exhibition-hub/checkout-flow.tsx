"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, PackageSearch, ShieldCheck, Loader2, Star } from "lucide-react";
import { Stepper, useMultiStep } from "@/components/ui/stepper";
import { useCart, groupByVendor } from "@/lib/store/cart";
import { cartTotals } from "@/lib/cart-totals";
import { naira } from "@/lib/sample-catalog";
import { AddressFields, addressIsComplete, BLANK_ADDRESS, type AddressFormValue } from "@/components/exhibition-hub/address-fields";
import { PaymentMethodCards } from "@/components/exhibition-hub/payment-method-cards";
import { saveAddress, type SavedAddress } from "@/lib/services/addresses";
import { startCartCheckout } from "@/lib/services/checkout";
import type { CartCheckoutGroup } from "@/lib/services/orders";
import type { ProviderName } from "@/lib/payments";
import { cn } from "@/lib/utils";

const STEPS = [{ label: "Cart" }, { label: "Details" }, { label: "Payment" }];

function fromSaved(a: SavedAddress): AddressFormValue {
  return { address: a.address, city: a.city, state: a.state, country: a.country || "Nigeria", countryIso: a.country === "Nigeria" || !a.country ? "NG" : "", stateIso: "", phone: a.phone };
}

export function CheckoutFlow({ savedAddresses }: { savedAddresses: SavedAddress[] }) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const { step, next, prev, goTo } = useMultiStep(3);

  const [billing, setBilling] = useState<AddressFormValue>(() => {
    const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    return def ? fromSaved(def) : BLANK_ADDRESS;
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shipping, setShipping] = useState<AddressFormValue>(billing);
  const [saveBilling, setSaveBilling] = useState(savedAddresses.length === 0);
  const [provider, setProvider] = useState<ProviderName>("paystack");
  const [placing, setPlacing] = useState(false);

  const groups = groupByVendor(items);
  const { subtotal, shipping: shippingFee, vat, total } = cartTotals(items);
  const effectiveShipping = sameAsBilling ? billing : shipping;

  // Cart emptied mid-flow (e.g. all items removed in another tab) → bounce back.
  useEffect(() => {
    if (items.length === 0 && step !== 0) goTo(0);
  }, [items.length, step, goTo]);

  function pickSaved(a: SavedAddress) {
    const v = fromSaved(a);
    setBilling(v);
    if (sameAsBilling) setShipping(v);
  }

  function goDetails() {
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    next();
  }

  async function goPayment() {
    if (!addressIsComplete(billing)) { toast.error("Fill in your billing address"); return; }
    if (!sameAsBilling && !addressIsComplete(shipping)) { toast.error("Fill in your shipping address"); return; }
    if (saveBilling) {
      await saveAddress({ label: "Billing", ...billing, isDefault: savedAddresses.length === 0 }).catch(() => {});
    }
    next();
  }

  async function placeOrder() {
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    setPlacing(true);
    try {
      const checkoutGroups: CartCheckoutGroup[] = groups.map((g) => ({
        vendorCompanyId: g.vendorCompanyId,
        vendorName: g.vendorName,
        items: g.items.map((i) => ({ productId: i.productId, variantId: i.variantId, name: i.name, qty: i.qty, unitPrice: i.unitPrice, image: i.image })),
      }));
      const result = await startCartCheckout({
        groups: checkoutGroups,
        shipping: { address: effectiveShipping.address, city: effectiveShipping.city, state: effectiveShipping.state, country: effectiveShipping.country, phone: effectiveShipping.phone },
        deliveryMethod: "Courier delivery",
        provider,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      clearCart();
      toast.success("Order placed!");
      router.push(`/exhibition-hub/checkout/thank-you?ref=${result.reference}`);
    } catch (e) {
      setPlacing(false);
      toast.error(e instanceof Error ? e.message : "Couldn't place your order");
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-12 max-w-[1000px] mx-auto">
      <Link href="/exhibition-hub/cart" className="inline-flex items-center gap-1.5 text-[13px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors mb-8">
        <ArrowLeft size={14} /> Back to cart
      </Link>

      <Stepper steps={STEPS} current={step} onStepClick={goTo} className="max-w-[420px] mx-auto mb-10 sm:mb-12" />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {/* ── Step 0: Cart recap ── */}
          {step === 0 && (
            <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.key} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/10 text-[12px] font-bold text-[#1e1e1e] dark:text-white">{g.vendorName}</div>
                    <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                      {g.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-11 h-11 rounded-lg bg-[#f5f5f5] dark:bg-white/5 overflow-hidden flex-shrink-0">
                            {it.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                            ) : <div className="w-full h-full flex items-center justify-center text-[#c9c9c9]"><PackageSearch size={15} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-medium text-[#1e1e1e] dark:text-white truncate">{it.name}</p>
                            <p className="text-[11.5px] text-[#9a9a9a]">×{it.qty} · {naira(it.unitPrice)}</p>
                          </div>
                          <span className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">{naira(it.unitPrice * it.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 lg:mt-0"><SummaryCard subtotal={subtotal} shipping={shippingFee} vat={vat} total={total} /></div>
              <div className="mt-6 lg:col-span-2 flex justify-end">
                <button onClick={goDetails} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors">
                  Continue to details <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Billing + Shipping details ── */}
          {step === 1 && (
            <div className="max-w-[560px] mx-auto space-y-6">
              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a] mb-2">Use a saved address</p>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((a) => (
                      <button key={a.id} onClick={() => pickSaved(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                        <MapPin size={12} className="text-[#9a9a9a]" /> {a.label || "Address"} {a.isDefault && <Star size={10} className="fill-[#ffd716] text-[#ffd716]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-3">Billing address <span className="text-[#e5484d]">*</span></h2>
                <AddressFields value={billing} onChange={(v) => { setBilling(v); if (sameAsBilling) setShipping(v); }} idPrefix="billing" />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={saveBilling} onChange={(e) => setSaveBilling(e.target.checked)} className="w-3.5 h-3.5 accent-[#ffd716]" />
                  <span className="text-[12px] text-[#6b6b6b] dark:text-white/60">Save this address for next time</span>
                </label>
              </div>

              <div className="pt-2 border-t border-[#ececec] dark:border-white/10">
                <label className="flex items-center gap-2.5 py-3 cursor-pointer">
                  <input type="checkbox" checked={sameAsBilling} onChange={(e) => { setSameAsBilling(e.target.checked); if (e.target.checked) setShipping(billing); }} className="w-4 h-4 accent-[#ffd716]" />
                  <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">Shipping address is the same as billing</span>
                </label>
                {!sameAsBilling && (
                  <div className="mt-2">
                    <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-3">Shipping address</h2>
                    <AddressFields value={shipping} onChange={setShipping} idPrefix="shipping" />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={prev} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={goPayment} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold hover:bg-[#e6c114] transition-colors">
                  Continue to payment <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Payment method + review ── */}
          {step === 2 && (
            <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start max-w-[900px] mx-auto">
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-3">Payment method</h2>
                  <PaymentMethodCards value={provider} onChange={setProvider} />
                </div>

                <div>
                  <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white mb-2">Deliver to</h2>
                  <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60">
                    {effectiveShipping.address}, {effectiveShipping.city}, {effectiveShipping.state}, {effectiveShipping.country} · {effectiveShipping.phone}
                    <button onClick={() => goTo(1)} className="ml-2 text-[#caa400] dark:text-[#ffd716] font-semibold hover:underline">Edit</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 lg:mt-0">
                <SummaryCard subtotal={subtotal} shipping={shippingFee} vat={vat} total={total} />
                <button onClick={placeOrder} disabled={placing}
                  className="w-full mt-3 py-3.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[14px] font-bold hover:bg-[#e6c114] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                  {placing ? <><Loader2 size={16} className="animate-spin" /> Placing order…</> : `Place order · ${naira(total)}`}
                </button>
                <button onClick={prev} className="w-full mt-2 py-2 text-[12.5px] font-medium text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">Back</button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ subtotal, shipping, vat, total }: { subtotal: number; shipping: number; vat: number; total: number }) {
  return (
    <div className={cn("rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-2.5")}>
      <h2 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-1">Order summary</h2>
      <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Subtotal</span><span className="font-medium text-[#1e1e1e] dark:text-white">{naira(subtotal)}</span></div>
      <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>Shipping</span><span className="font-medium text-[#16a34a]">{shipping === 0 ? "Free" : naira(shipping)}</span></div>
      <div className="flex items-center justify-between text-[13px] text-[#6b6b6b] dark:text-white/60"><span>VAT (7.5%)</span><span className="font-medium text-[#1e1e1e] dark:text-white">{naira(vat)}</span></div>
      <div className="flex items-center justify-between pt-2.5 border-t border-[#ececec] dark:border-white/10 text-[15px] font-black text-[#1e1e1e] dark:text-white"><span>Total</span><span>{naira(total)}</span></div>
      <p className="flex items-center gap-1.5 text-[11px] text-[#9a9a9a] pt-1"><ShieldCheck size={13} className="flex-shrink-0" /> Held in escrow until delivery is confirmed.</p>
    </div>
  );
}
