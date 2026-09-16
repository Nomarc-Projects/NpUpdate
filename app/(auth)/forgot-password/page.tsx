"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Loader2, MailCheck } from "lucide-react";
import { forgetPassword } from "@/lib/auth-client";
import { stripEmailSpaces } from "@/lib/email-normalize";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a correct email address.");
      return;
    }
    setLoading(true);
    const { error } = await forgetPassword({ email: email.trim(), redirectTo: "/reset-password" });
    setLoading(false);
    // Always show success (don't reveal whether an account exists).
    if (error && !/not found|no user|exist/i.test(error.message || "")) {
      toast.error(error.message || "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-[420px]">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[#898989] hover:text-[#1e1e1e] dark:hover:text-white transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          Back to login
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-[#ffd716]/15 flex items-center justify-center">
              <MailCheck size={26} className="text-[#caa400]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white mb-2">Check your inbox</h1>
            <p className="text-[#898989] dark:text-white/60 text-sm">
              If an account exists for <span className="font-semibold text-[#1e1e1e] dark:text-white">{email}</span>,
              we&apos;ve sent a link to reset your password. It may take a minute to arrive — check your spam folder too.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm font-semibold text-[#1e1e1e] dark:text-white hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white mb-2">Forgot your password?</h1>
            <p className="text-[#898989] dark:text-white/60 text-sm mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-[#1e1e1e] dark:text-white block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(stripEmailSpaces(e.target.value))}
                  placeholder="johndoe@gmail.com"
                  className="w-full bg-white dark:bg-transparent border border-[#e3e3e3] dark:border-[#333] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#898989] rounded-[4px] px-4 py-3 text-sm focus:outline-none focus:border-[#ffd716] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 rounded-[4px] hover:bg-[#e6c114] transition-colors disabled:opacity-60"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
