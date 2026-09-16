"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck, Loader2, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/ui/logo";

const LEN = 6;

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: LEN }, (_, i) => value[i] ?? "");

  function setAt(i: number, c: string) {
    const next = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, LEN);
    onChange(next.replace(/\D/g, ""));
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={c}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < LEN - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
            if (d) { onChange(d); refs.current[Math.min(d.length, LEN - 1)]?.focus(); }
          }}
          className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent text-center text-xl font-bold text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716] focus:ring-2 focus:ring-[#ffd716]/30 transition-colors"
        />
      ))}
    </div>
  );
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const redirect = params.get("redirect");
  const plan = params.get("plan");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function verify(code: string) {
    if (code.length !== LEN) { toast.error("Enter the 6-digit code."); return; }
    setLoading(true);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp: code });
    setLoading(false);
    if (error) { toast.error(error.message || "That code is invalid or has expired."); setOtp(""); return; }
    toast.success("Email verified — you can sign in now.");
    const loginParams = new URLSearchParams();
    if (redirect) loginParams.append("redirect", redirect);
    if (plan) loginParams.append("plan", plan);
    router.push(`/login${loginParams.size > 0 ? "?" + loginParams.toString() : ""}`);
  }

  async function resend() {
    if (seconds > 0) return;
    setSeconds(60);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error) toast.error(error.message || "Couldn't resend the code.");
    else toast.success("A new code is on its way.");
  }

  return (
    <div className="w-full max-w-[420px] text-center">
      <div className="lg:hidden mb-8 flex justify-center"><Link href="/" aria-label="Nomarc Projects home"><Logo size="sm" /></Link></div>

      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-[#ffd716]/15 flex items-center justify-center">
        <MailCheck size={30} className="text-[#caa400]" />
      </div>

      <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1e1e1e] dark:text-white">Please check your email</h1>
      <p className="mt-2 text-sm text-[#898989] dark:text-white/60">
        We&apos;ve sent a 6-digit code to{" "}
        <span className="font-semibold text-[#1e1e1e] dark:text-white">{email || "your email"}</span>.
        Enter it below to verify your account.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); verify(otp); }} className="mt-8">
        <OtpInput value={otp} onChange={(v) => { setOtp(v); if (v.length === LEN) verify(v); }} disabled={loading} />

        <button
          type="submit"
          disabled={loading || otp.length !== LEN}
          className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 text-sm hover:bg-[#e6c114] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify email"}
        </button>
      </form>

      <p className="mt-5 text-[13px] text-[#9a9a9a] dark:text-white/50">
        Didn&apos;t get it?{" "}
        {seconds > 0 ? (
          <span>Resend in {seconds}s</span>
        ) : (
          <button onClick={resend} className="font-semibold text-[#1e1e1e] dark:text-white hover:underline">Resend code</button>
        )}
      </p>
      <p className="mt-1.5 text-[11px] text-[#b3b3b3] dark:text-white/30">Check your spam or junk folder if you can&apos;t find it.</p>

      <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
        <ArrowLeft size={15} /> Back to login
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white dark:bg-[#111]">
      <Suspense fallback={<div className="w-full max-w-[420px] animate-pulse"><div className="h-8 bg-[#f0f0f0] dark:bg-white/5 rounded mb-4 w-56 mx-auto" /></div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
