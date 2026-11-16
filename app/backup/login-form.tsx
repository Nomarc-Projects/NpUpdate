"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The backup console's own sign-in screen. Posts to Better Auth's standard
 * endpoint — the same session the rest of the app uses — so there is no second
 * password system to leak, reset or forget. Only a `super_admin` session gets
 * past the server page; this form is just how it starts.
 */
export function BackupLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message ?? "Sign-in failed. Check the email and password.");
        return;
      }
      // Session cookie is set; let the server page re-evaluate the role.
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffd716] text-xl" aria-hidden>🗄️</span>
        <div>
          <h1 className="text-[26px] font-bold text-white leading-tight">Backup console</h1>
          <p className="text-[13px] text-white/50">Super admin access only</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="backup-email" className="mb-1.5 block text-[13px] font-medium text-white/70">Email</label>
          <input
            id="backup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-white/30 outline-none transition focus:border-[#ffd716]/70 focus:bg-white/[0.07]"
            placeholder="you@nomarcprojects.com"
          />
        </div>
        <div>
          <label htmlFor="backup-password" className="mb-1.5 block text-[13px] font-medium text-white/70">Password</label>
          <input
            id="backup-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-white/30 outline-none transition focus:border-[#ffd716]/70 focus:bg-white/[0.07]"
            placeholder="••••••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#ffd716] px-4 py-3 text-[15px] font-bold text-[#1e1e1e] transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-[12.5px] leading-relaxed text-white/40">
        This screen signs you in with your existing Nomarc account. The database
        download opens only when that account holds the{" "}
        <code className="text-white/60">super_admin</code> role.
      </p>
    </div>
  );
}
