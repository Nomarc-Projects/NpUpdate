import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { BadgeCheck, Building2, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { pageMetadata } from "@/lib/og";
import { getProperties } from "@/lib/services/platform-settings-read";
import { getSowrStatusFor } from "@/lib/services/sowr-status";
import { SowrEnrollButton } from "@/components/properties/sowr-enroll-button";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "SOWR Real Estate Program",
    description: "Join the SOWR real estate program and get a structured route into property ownership and investment with Nomarc Projects.",
    path: "/properties/sowr",
  });
}

const BENEFITS = [
  { icon: Building2, title: "Curated property access", body: "See vetted sale, lease and bulk-land opportunities from verified listers." },
  { icon: ShieldCheck, title: "Document-first listings", body: "Ownership documents are reviewed before a listing goes live." },
  { icon: TrendingUp, title: "Investment pathways", body: "Move from browsing to structured ownership with SOWR guidance." },
  { icon: BadgeCheck, title: "Member recognition", body: "Your SOWR membership is attached to your Nomarc account." },
];

export default async function SowrPage() {
  const settings = await getProperties();
  const admin = await isAdmin().catch(() => false);
  if (!settings.sowr.enabled && !admin) notFound();

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const signedIn = !!session?.user;
  const status = signedIn ? await getSowrStatusFor(session.user.id).catch(() => null) : null;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#111]">
      <section className="bg-[#1e1e1e] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr] md:px-8 md:py-16">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#4ade80]">
              <ShieldCheck size={12} /> SOWR
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl">{settings.sowr.heading}</h1>
            <p className="mt-3 max-w-xl whitespace-pre-line text-[13.5px] leading-relaxed text-white/65">{settings.sowr.body}</p>

            <div className="mt-6">
              {!signedIn ? (
                <div className="flex flex-wrap gap-2">
                  <Link href="/login?redirect=/properties/sowr" className="rounded-xl bg-white px-5 py-2.5 text-[12.5px] font-bold text-[#1e1e1e]">Sign in to join</Link>
                  <Link href="/signup" className="rounded-xl border border-white/25 px-5 py-2.5 text-[12.5px] font-semibold text-white">Create an account</Link>
                </div>
              ) : status?.enrolled ? (
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e]/15 px-4 py-2.5 text-[12.5px] font-semibold text-[#4ade80]">
                    <CheckCircle2 size={15} /> You are an active SOWR member
                  </p>
                  <SowrEnrollButton enrolled />
                </div>
              ) : (
                <SowrEnrollButton enrolled={false} />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Membership</p>
            <p className="mt-2 text-2xl font-extrabold">{status?.enrolled ? "Active" : "Not enrolled"}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              {status?.enrolled
                ? `Joined ${new Date(status.joinedAt ?? Date.now()).toLocaleDateString("en-NG")}. Browse listings any time from your dashboard.`
                : "Enrollment is free. Sign in, join, and explore properties from your dashboard."}
            </p>
            <Link href="/properties" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#4ade80] hover:underline">
              Browse properties <Building2 size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <h2 className="text-xl font-extrabold tracking-tight text-[#1e1e1e] dark:text-white">What membership gives you</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <b.icon size={18} className="text-[#1f7a3d] dark:text-[#4ade80]" />
              <p className="mt-3 text-[13px] font-bold text-[#1e1e1e] dark:text-white">{b.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
          <p className="text-[12.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
            SOWR membership does not replace title verification or legal due diligence. Always review a property&apos;s ownership documents and get independent legal advice before completing a transaction.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/properties" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1f7a3d] hover:underline dark:text-[#4ade80]">
              View available properties <Building2 size={13} />
            </Link>
            <Link href="/properties/certificates" className="text-[12px] font-semibold text-[#6b6b6b] hover:underline dark:text-white/60">Verify a certificate</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
