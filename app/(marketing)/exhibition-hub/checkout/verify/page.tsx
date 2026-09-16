"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { verifyCartCheckout } from "@/lib/services/checkout";
import { useCart } from "@/lib/store/cart";

/** Post-checkout callback for real payment gateways (Paystack/Flutterwave/
 *  Seerbit) — mirrors /dashboard/billing/verify. Demo-mode checkouts never
 *  land here (they resolve instantly on the checkout page itself). */
export default function CartCheckoutVerifyPage() {
  return (
    <Suspense fallback={<div className="px-6 md:px-8 py-20" />}>
      <CartCheckoutVerifyInner />
    </Suspense>
  );
}

function CartCheckoutVerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);
  const reference = params.get("reference") || params.get("tx_ref") || params.get("paymentReference") || "";
  const [state, setState] = useState<"checking" | "success" | "failed" | "pending">("checking");

  useEffect(() => {
    if (!reference) { setState("failed"); return; }
    let tries = 0;
    const run = () =>
      verifyCartCheckout(reference)
        .then((r) => {
          if (r.status === "success") {
            setState("success");
            clearCart();
            setTimeout(() => router.push(`/exhibition-hub/checkout/thank-you?ref=${reference}`), 900);
          } else if (r.status === "failed") {
            setState("failed");
          } else if (tries++ < 4) {
            setState("pending");
            setTimeout(run, 2500); // webhook may still be in flight
          } else {
            setState("pending");
          }
        })
        .catch(() => setState("failed"));
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const ui = {
    checking: { icon: <Loader2 className="animate-spin" size={28} />, title: "Confirming your payment…", body: "Hang tight while we verify the transaction." },
    success: { icon: <CheckCircle2 size={28} className="text-[#16803c]" />, title: "Payment confirmed", body: "Redirecting to your order confirmation…" },
    pending: { icon: <Clock size={28} className="text-[#caa400]" />, title: "Payment is processing", body: "This can take a moment — your order will appear in My Orders automatically once it clears." },
    failed: { icon: <XCircle size={28} className="text-[#e5484d]" />, title: "We couldn't confirm this payment", body: "If you were charged, it'll be reconciled automatically — or reach out to support." },
  }[state];

  return (
    <div className="px-6 md:px-8 py-20 flex flex-col items-center text-center max-w-[480px] mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">{ui.icon}</div>
      <h1 className="mt-5 text-xl font-bold text-[#1e1e1e] dark:text-white">{ui.title}</h1>
      <p className="mt-2 text-sm text-[#9a9a9a]">{ui.body}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/my-orders" className="px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">My orders</Link>
        <Link href="/exhibition-hub" className="px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">Exhibition Hub</Link>
      </div>
    </div>
  );
}
