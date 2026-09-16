"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewer } from "@/lib/use-viewer";

/**
 * SEO-safe gate: the full article is always rendered in the DOM (so crawlers/AI
 * index it), but signed-OUT humans see a clipped preview with a "sign in to keep
 * reading" card. Gating is client-side only (crawlers don't run this effect), so
 * bots always receive the full article for indexing.
 */
export function NewsGate({ children }: { children: React.ReactNode }) {
  const { signedIn } = useViewer();
  const pathname = usePathname();
  const [gated, setGated] = useState(false);

  useEffect(() => {
    // News feed articles are gated for anyone who isn't signed in.
    setGated(!signedIn);
  }, [signedIn, pathname]);

  if (!gated) return <>{children}</>;

  return (
    <div className="relative">
      <div className="max-h-[460px] overflow-hidden">{children}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-white dark:to-[#111]" />
      <div className="relative -mt-12 rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 md:p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#caa400]">Keep reading</p>
        <h3 className="mt-2 text-xl font-bold text-[#1e1e1e] dark:text-white">Create a free account to continue</h3>
        <p className="mt-1.5 text-sm text-[#9a9a9a] max-w-md mx-auto">Sign in to keep reading Nomarc&apos;s construction insights — it&apos;s free.</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Create free account</Link>
          <Link href="/login" className="px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
