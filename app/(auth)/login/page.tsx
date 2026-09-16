"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BrandPanel, type Testimonial } from "@/components/auth/brand-panel";
import { Field, inputClass } from "@/components/ui/modal";
import { ArrowLabel } from "@/components/ui/arrow-label";
import { signIn } from "@/lib/auth-client";
import { stripEmailSpaces } from "@/lib/email-normalize";

const IMAGES = [
  "/media/login-i.webp",
  "/media/login-ii.webp",
  "/media/login-iii.webp",
];

const testimonials: Testimonial[] = [
  { quote: "Collaborating with engineers on Nomarc's platform reduced RFIs by 60%. Fewer emails, more actual design innovation.", name: "Frank Martins" },
  { quote: "I used to waste hours chasing paperwork. Now with Nomarc's tracker, my team's compliance is 100% audit ready.", name: "Adetigba Blessing" },
  { quote: "Nomarc's project tools cut our bidding time by 40%. We landed two commercial contracts in months, not years.", name: "Adegoke Micheal" },
];

function safeRedirect(raw: string | null, fallback = "/dashboard"): string {
  // Only allow internal paths to prevent open redirect attacks
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error, data } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Invalid email or password.");
      return;
    }
    toast.success("Welcome back!");
    // Admins land in the console unless an explicit redirect was requested.
    const role = (data?.user as { role?: string } | undefined)?.role;
    const dest = redirectTo !== "/dashboard" ? redirectTo
      : role === "admin" || role === "super_admin" ? "/admin"
      : "/dashboard";
    // Hard navigation: bypasses Next.js router cache so the session cookie is
    // guaranteed to be included in the first request to the destination page.
    // router.push() can race with the Set-Cookie and the middleware sees no session.
    window.location.href = dest;
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signIn.social({ provider: "google", callbackURL: redirectTo });
    if (error) {
      setGoogleLoading(false);
      toast.error(error.message || "Google sign-in is not available yet.");
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <Link href="/" className="inline-flex items-center gap-1.5 mb-6 text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
        <ArrowLeft size={15} /> Back to site
      </Link>
      <div className="lg:hidden mb-8"><Link href="/" aria-label="Nomarc home"><Logo size="sm" /></Link></div>
      <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1e1e1e] dark:text-white">Welcome back.</h1>
      <p className="mt-1 text-sm text-[#898989] dark:text-white/60">
        Pick up where you left off?{" "}
        <Link href="/signup" className="font-semibold text-[#1e1e1e] dark:text-white hover:underline">Create an account</Link>
      </p>

      <form onSubmit={handleLogin} className="mt-7 space-y-4">
        <Field label="Email address">
          <input type="email" required value={email} onChange={(e) => setEmail(stripEmailSpaces(e.target.value))} className={inputClass} placeholder="johndoe@gmail.com" />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + " pr-10"} placeholder="Enter Password" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-[#6b6b6b] dark:text-white/60">
            <input type="checkbox" className="accent-[#ffd716]" /> Remember me
          </label>
          <Link href="/forgot-password" className="text-[#1e1e1e] dark:text-white font-medium hover:underline">Forgot Password?</Link>
        </div>

        <button type="submit" disabled={loading} className="group w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 text-sm hover:bg-[#e6c114] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Logging in…</> : <ArrowLabel>Login</ArrowLabel>}
        </button>
        <div className="text-center text-xs text-[#b3b3b3]">Or</div>
        <button type="button" onClick={handleGoogle} disabled={googleLoading} className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#1e1e1e] text-white py-3 text-sm font-medium hover:bg-[#2a2a2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <span className="w-4 h-4 rounded-full bg-white text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">G</span>}
          Login with Google
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-[#111]">
      <BrandPanel images={IMAGES} heading="" testimonials={testimonials} />
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <Suspense fallback={<div className="w-full max-w-[400px] animate-pulse"><div className="h-8 bg-[#f0f0f0] dark:bg-white/5 rounded mb-4 w-48" /><div className="h-4 bg-[#f0f0f0] dark:bg-white/5 rounded w-64" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
