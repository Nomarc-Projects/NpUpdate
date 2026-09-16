"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signUp, signIn, authClient } from "@/lib/auth-client";
import { Logo } from "@/components/ui/logo";
import { BrandPanel, type Step } from "@/components/auth/brand-panel";
import { Field, inputClass } from "@/components/ui/modal";
import { ArrowLabel } from "@/components/ui/arrow-label";
import { PasswordConfirmInput } from "@/components/auth/password-confirm-input";
import { PasswordRules } from "@/components/auth/password-rules";
import { isDisposableEmail } from "@/lib/block-disposable-email";
import { stripEmailSpaces } from "@/lib/email-normalize";
import { validatePassword } from "@/lib/password-policy";
import { isEmailAvailable } from "@/lib/services/email-check";

/** Person-name rule: letters/spaces/hyphens/apostrophes only, no digits, ≤ 50. */
function validatePersonName(v: string, field: string): string | null {
  const s = v.trim();
  if (!s) return `${field} is required.`;
  if (s.length < 2) return `${field} must be at least 2 characters.`;
  if (s.length > 50) return `${field} must be 50 characters or fewer.`;
  if (/\d/.test(s)) return `${field} can't contain numbers.`;
  if (!/^[\p{L}\s'-]+$/u.test(s)) return `${field} contains invalid characters.`;
  return null;
}

/**
 * Shared submit-time email guard. One generic message for anything malformed or
 * disposable; a distinct message only for an already-registered address.
 */
async function validateEmailForSignup(email: string): Promise<string | null> {
  const s = email.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && !isDisposableEmail(s);
  if (!valid) return "Please enter a correct email address.";
  // Sign-up creates the account before the verification code is sent, so anyone
  // whose code never arrived already has a working account. Verification isn't
  // required to sign in, so point them at the login rather than dead-ending them.
  if (!(await isEmailAvailable(s))) return "An account with this email already exists — try logging in instead.";
  return null;
}

const BRAND_IMAGES = [
  "/media/sign-up-i.webp",
  "/media/sign-up-ii.webp",
  "/media/sign-up-iii.webp",
];

const steps: Step[] = [
  { title: "Create your account", desc: "Just the basics — no commitment yet." },
  { title: "Explore freely", desc: "Browse jobs, professionals, and the Exhibition Hub." },
  { title: "Unlock as you go", desc: "Apply for a job or list products whenever you're ready." },
];

function PrimaryWide({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="group w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 text-sm hover:bg-[#e6c114] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
function GoogleButton() {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    const { error } = await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (error) {
      setLoading(false);
      toast.error(error.message || "Google sign-up is not available yet.");
    }
  }
  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#1e1e1e] text-white py-3 text-sm font-medium hover:bg-[#2a2a2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <span className="w-4 h-4 rounded-full bg-white text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">G</span>}
      Sign up with Google
    </button>
  );
}
function PasswordInput({
  placeholder = "••••••••",
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const controlled = onChange !== undefined;
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={inputClass + " pr-10"}
        placeholder={placeholder}
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex min-h-screen">
        <BrandPanel images={BRAND_IMAGES} heading="Explore Nomarc Projects" steps={steps} />
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[400px]">
            <BackToSite />
            <div className="lg:hidden mb-8"><Link href="/" aria-label="Nomarc home"><Logo size="sm" /></Link></div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1e1e1e] dark:text-white">Create your account</h1>
            <p className="mt-1 text-sm text-[#898989] dark:text-white/60">
              Already have one? <Link href="/login" className="font-semibold text-[#1e1e1e] dark:text-white hover:underline">Log in</Link>
            </p>
            <Suspense fallback={<div className="mt-7 animate-pulse space-y-4"><div className="h-10 bg-[#f0f0f0] dark:bg-white/5 rounded" /><div className="h-10 bg-[#f0f0f0] dark:bg-white/5 rounded" /><div className="h-10 bg-[#f0f0f0] dark:bg-white/5 rounded" /></div>}>
              <SignupFields />
            </Suspense>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Always-visible link back to the marketing site, top of the form column. */
function BackToSite() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 mb-6 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
      ← Back to site
    </Link>
  );
}

function SignupFields() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const plan = searchParams.get("plan");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const firstErr = validatePersonName(firstName, "First name");
    if (firstErr) { toast.error(firstErr); return; }
    const surErr = validatePersonName(surname, "Surname");
    if (surErr) { toast.error(surErr); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match."); return; }
    const pwErr = validatePassword(pwd).error;
    if (pwErr) { toast.error(pwErr); return; }
    setLoading(true);
    const emailErr = await validateEmailForSignup(email);
    if (emailErr) { setLoading(false); toast.error(emailErr); return; }
    const name = `${firstName.trim()} ${surname.trim()}`;
    const em = email.trim();
    // Every account starts as a plain User — professional/exhibitor roles are
    // unlocked later, based on what they actually try to do in the dashboard.
    // The role is set server-side by the field's defaultValue and is deliberately
    // not accepted from the request body (see additionalFields.role in lib/auth.ts).
    const { error } = await signUp.email({ name, email: em, password: pwd });
    if (error) { setLoading(false); toast.error(error.message || "Could not create account."); return; }
    // Send the verification OTP and take them to the verify-email screen.
    const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({ email: em, type: "email-verification" });
    setLoading(false);
    if (otpError) {
      toast.error(otpError.message || "Couldn't send verification code. Please try again.");
      return;
    }
    const params = new URLSearchParams({ email: em });
    if (redirect) params.append("redirect", redirect);
    if (plan) params.append("plan", plan);
    window.location.href = `/verify-email?${params.toString()}`;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <input required maxLength={50} className={inputClass} placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Surname">
          <input required maxLength={50} className={inputClass} placeholder="Doe" value={surname} onChange={(e) => setSurname(e.target.value)} />
        </Field>
      </div>
      <Field label="Email address">
        <input required type="email" maxLength={100} className={inputClass} placeholder="johndoe@gmail.com" value={email} onChange={(e) => setEmail(stripEmailSpaces(e.target.value))} />
      </Field>
      <Field label="Password"><PasswordInput value={pwd} onChange={setPwd} /></Field>
      <PasswordRules password={pwd} />
      <Field label="Confirm Password">
        <PasswordConfirmInput passwordToMatch={pwd} value={confirm} onChange={setConfirm} />
      </Field>
      <PrimaryWide type="submit" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <ArrowLabel>Create Account</ArrowLabel>}</PrimaryWide>
      <div className="text-center text-xs text-[#b3b3b3]">Or</div>
      <GoogleButton />
      <p className="text-center text-[11px] text-[#b3b3b3]">By creating an account you agree to our <Link href="/terms" className="font-medium text-[#6b6b6b] dark:text-white/60 underline hover:text-[#1e1e1e] dark:hover:text-white">Terms</Link> and <Link href="/privacy" className="font-medium text-[#6b6b6b] dark:text-white/60 underline hover:text-[#1e1e1e] dark:hover:text-white">Privacy Policy</Link>.</p>
    </form>
  );
}
