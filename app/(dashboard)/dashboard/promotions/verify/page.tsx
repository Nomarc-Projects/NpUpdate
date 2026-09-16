import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { verifyPromotionPayment } from "@/lib/services/promotion-checkout";

/**
 * Where the gateway returns a promotion buyer. The webhook is the primary
 * settlement path; this re-verifies on arrival so someone who lands here before
 * the webhook does still sees the right outcome.
 */
export default async function PromotionVerifyPage({
  searchParams,
}: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  if (!reference) redirect("/dashboard");

  let status: string;
  try {
    ({ status } = await verifyPromotionPayment(reference));
  } catch {
    status = "failed";
  }

  const copy =
    status === "success"
      ? {
          Icon: CheckCircle2,
          tone: "text-[#16a34a]",
          title: "Payment Successful!",
          body: "Your payment has been received, and your ad has been submitted for review. You will be notified within 24-48 hours once it is approved and live.",
        }
      : status === "pending"
        ? {
            Icon: Clock,
            tone: "text-[#caa400]",
            title: "Payment is still processing",
            body: "We haven't had final confirmation from your bank yet. This page updates once it settles — your ad is submitted as soon as it does.",
          }
        : {
            Icon: XCircle,
            tone: "text-[#e5484d]",
            title: "Payment didn't go through",
            body: "Nothing was charged. Your ad is saved as a draft — you can try again from the Ads Board.",
          };

  return (
    <div className="mx-auto max-w-[520px] px-6 py-20 text-center">
      <copy.Icon size={44} className={`mx-auto ${copy.tone}`} />
      <h1 className="mt-5 text-[22px] font-bold text-[#1e1e1e] dark:text-white">{copy.title}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/70">{copy.body}</p>
      <Link
        href="/dashboard?tab=ads"
        className="mt-6 inline-flex rounded-lg bg-[#ffd716] px-5 py-2.5 text-[13.5px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
      >
        Go to Ads Board
      </Link>
    </div>
  );
}
