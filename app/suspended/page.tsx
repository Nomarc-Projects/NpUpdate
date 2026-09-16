"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Ban } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export default function SuspendedPage() {
  useEffect(() => { signOut().catch(() => {}); }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-white dark:bg-[#111]">
      <div className="w-14 h-14 rounded-2xl bg-[#fde8e8] dark:bg-[#e5484d]/20 flex items-center justify-center text-[#c0392b] dark:text-[#f87171]"><Ban size={26} /></div>
      <h1 className="mt-5 text-2xl font-bold text-[#1e1e1e] dark:text-white">Account suspended</h1>
      <p className="mt-2 max-w-md text-sm text-[#9a9a9a]">Your Nomarc account has been suspended. If you think this is a mistake, please reach out and we&apos;ll review it.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/contact" className="px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Contact support</Link>
        <Link href="/" className="px-5 py-2.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">Back home</Link>
      </div>
    </div>
  );
}
