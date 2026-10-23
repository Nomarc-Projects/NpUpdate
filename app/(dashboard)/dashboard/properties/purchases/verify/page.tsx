import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { verifyPropertyFee } from "@/lib/services/property-payments";

export const metadata = { title: "Property fee payment" };
export const dynamic = "force-dynamic";

export default async function VerifyPropertyFeePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  let status: "success" | "failed" | "pending" | "error" = "error";
  let message = "We couldn't find that payment reference.";
  if (reference) {
    try {
      status = await verifyPropertyFee(reference);
      message =
        status === "success"
          ? "Payment confirmed. Your listing is now live."
          : status === "failed"
            ? "The gateway reported this payment as failed."
            : "The gateway has not confirmed this payment yet. Check again in a moment.";
    } catch (e) {
      message = e instanceof Error ? e.message : message;
    }
  }

  const Icon = status === "success" ? CheckCircle2 : status === "failed" ? XCircle : Clock;

  return (
    <div className="px-5 py-10 md:px-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#ececec] bg-white p-8 text-center dark:border-white/10 dark:bg-[#1e1e1e]">
        <Icon className={status === "success" ? "mx-auto text-[#1f7a3d]" : status === "failed" ? "mx-auto text-[#b4232a]" : "mx-auto text-[#9a9a9a]"} size={34} />
        <h1 className="mt-3 text-xl font-extrabold text-[#1e1e1e] dark:text-white">Property fee payment</h1>
        <p className="mt-2 text-[13px] text-[#6b6b6b] dark:text-white/60">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/dashboard/properties/listings" className="rounded-xl bg-[#1e1e1e] px-4 py-2.5 text-[12.5px] font-bold text-white dark:bg-white dark:text-[#1e1e1e]">My properties</Link>
          <Link href="/dashboard/properties/purchases" className="rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[12.5px] font-semibold dark:border-white/15">Fee payments</Link>
        </div>
      </div>
    </div>
  );
}
