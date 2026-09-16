"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { verifyAndApply } from "@/lib/services/billing";

export default function BillingVerifyPage() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("tx_ref") || params.get("paymentReference") || "";
  const [state, setState] = useState<"checking" | "success" | "failed" | "pending">("checking");

  useEffect(() => {
    if (!reference) { setState("failed"); return; }
    let tries = 0;
    const run = () => verifyAndApply(reference).then((r) => {
      if (r.status === "success") { setState("success"); }
      else if (r.status === "failed") { setState("failed"); }
      else if (tries++ < 4) { setState("pending"); setTimeout(run, 2500); } // webhook may still be in flight
      else setState("pending");
    }).catch(() => setState("failed"));
    run();
  }, [reference]);

  const ui = {
    checking: { icon: <Loader2 className="animate-spin" size={28} />, title: "Confirming your payment…", body: "Hang tight while we verify the transaction." },
    success: { icon: <CheckCircle2 size={28} className="text-[#16803c]" />, title: "Payment confirmed 🎉", body: "Your plan is now active. Enjoy the new features!" },
    pending: { icon: <Clock size={28} className="text-[#caa400]" />, title: "Payment is processing", body: "This can take a moment. We'll activate your plan automatically once it clears." },
    failed: { icon: <XCircle size={28} className="text-[#e5484d]" />, title: "We couldn't confirm this payment", body: "If you were charged, it'll be reconciled automatically — or reach out to support." },
  }[state];

  return (
    <div className="px-6 md:px-8 py-20 flex flex-col items-center text-center max-w-[480px] mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center">{ui.icon}</div>
      <h1 className="mt-5 text-xl font-bold text-[#1e1e1e] dark:text-white">{ui.title}</h1>
      <p className="mt-2 text-sm text-[#9a9a9a]">{ui.body}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/plans" className="px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">View plans</Link>
        <Link href="/dashboard/billing" className="px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">Billing history</Link>
      </div>
    </div>
  );
}
