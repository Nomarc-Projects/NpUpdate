"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";
import { validatePassword } from "@/lib/password-policy";
import { PasswordRules } from "@/components/auth/password-rules";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  // Better Auth emails link to /reset-password/{token}?callbackURL=… — the
  // token lives in the path, not the query string. Accept both so old links
  // (?token=) and the canonical email format both work.
  const token =
    params.get("token") || pathname.split("/").filter(Boolean).slice(-1)[0] || "";
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { toast.error("This reset link is invalid or has expired."); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match."); return; }
    const pwErr = validatePassword(pwd).error;
    if (pwErr) { toast.error(pwErr); return; }
    setLoading(true);
    // The reset token is bound to the account it was issued for — the server
    // resets that account's password and no other. The email is never needed
    // here, which is why this form asks only for the new password.
    const { error } = await resetPassword({ newPassword: pwd, token });
    setLoading(false);
    if (error) { toast.error(error.message || "Could not reset password. Request a new link."); return; }
    toast.success("Password updated — you can sign in now.");
    router.push("/login");
  }

  const inputClass = "w-full bg-white dark:bg-transparent border border-[#e3e3e3] dark:border-[#333] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] rounded-[4px] px-4 py-3 pr-10 text-sm focus:outline-none focus:border-[#ffd716] transition-colors";

  return (
    <div className="w-full max-w-[420px]" role="alert" aria-live="polite">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-[#898989] hover:text-[#1e1e1e] dark:hover:text-white transition-colors mb-8">
        <ChevronLeft size={16} /> Back to login
      </Link>
      <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white mb-2">Set a new password</h1>
      <p className="text-[#898989] dark:text-white/60 text-sm mb-6">Choose a strong password for your Nomarc account.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className="text-xs font-semibold text-[#1e1e1e] dark:text-white block mb-1.5">New password</label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <PasswordRules password={pwd} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-xs font-semibold text-[#1e1e1e] dark:text-white block mb-1.5">Confirm new password</label>
          <input
            id="confirm-password"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={`${inputClass} ${confirm && pwd === confirm ? "border-emerald-500" : "border-[#e3e3e3] dark:border-[#333] focus:border-[#ffd716]"}`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 rounded-[4px] hover:bg-[#e6c114] transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Suspense fallback={<div className="w-full max-w-[420px] animate-pulse"><div className="h-8 bg-[#f0f0f0] dark:bg-white/5 rounded mb-4 w-52" /></div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
