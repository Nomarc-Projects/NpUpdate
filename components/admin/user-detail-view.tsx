"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, KeyRound, LogIn, Ban, Trash2 } from "lucide-react";
import { DashboardTabs, StatusBadge, KpiTileRow, ActivityFeed, KebabMenu, type TabItem, type Stat, type ActivityItem } from "@/components/dashboard/kit";
import { DocViewer } from "@/components/admin/verification-view";
import { NomarcAvatar } from "@/components/ui/avatar";
import { startImpersonation } from "@/lib/services/impersonation";
import { setUserBanned, adminDeleteUser, getUserTransactions, getUserSupportTicketsAdmin, getUserKyc, type AdminUserDetail, type AdminTxRow, type KycItem } from "@/lib/services/admin";

type Tab = "overview" | "verification" | "billing" | "support";
const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "verification", label: "Verification" },
  { key: "billing", label: "Billing History" },
  { key: "support", label: "Support Logs" },
];

const PLAN_LABEL: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro", premium: "Premium" };

export function UserDetailView({ user, backHref }: { user: AdminUserDetail; backHref: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "overview");
  const [kyc, setKyc] = useState<KycItem | null>(null);
  const [tx, setTx] = useState<AdminTxRow[] | null>(null);
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof getUserSupportTicketsAdmin>> | null>(null);

  useEffect(() => {
    if (tab === "verification" && !kyc) {
      // getUserKyc looks up this user directly (their docs + current status),
      // unlike the old getKycQueue().find() which only ever searched the
      // pending queue — so an already-approved user always showed "not
      // verified" since approved rows never appear in that queue.
      getUserKyc(user.id).then(setKyc).catch(() => setKyc(null));
    }
    if (tab === "billing" && !tx) {
      getUserTransactions(user.id).then(setTx).catch(() => setTx([]));
    }
    if (tab === "support" && !tickets) {
      getUserSupportTicketsAdmin(user.id).then(setTickets).catch(() => setTickets([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function logInAs() {
    toast.loading("Signing in as user…", { id: "imp" });
    // Reason is recorded in the audit log; the server rejects anything too short.
    const why = window.prompt(`Why are you signing in as ${user.name || user.email}? This is recorded in the audit log.`);
    if (why === null) return;
    startImpersonation(user.id, why).then(() => { window.location.href = "/dashboard"; }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed", { id: "imp" }));
  }
  function toggleBan() {
    setUserBanned(user.id, !user.banned).then(() => { toast.success(user.banned ? "Account restored" : "Account suspended"); router.refresh(); }).catch(() => toast.error("Couldn't update"));
  }
  function del() {
    if (!window.confirm(`Permanently delete ${user.name || user.email}'s account?`)) return;
    adminDeleteUser(user.id).then(() => { toast.success("Account deleted"); router.push(backHref); }).catch(() => toast.error("Couldn't delete"));
  }

  const stats: Stat[] = [
    { label: "Current Plan", value: PLAN_LABEL[user.plan] ?? user.plan },
    { label: "Verification Tier", value: `Tier ${user.tier}` },
    { label: "Open Support Tickets", value: user.openTickets },
    { label: "Profile Views", value: user.profileViews },
  ];
  const activity: ActivityItem[] = [
    { icon: CheckCircle2, text: <>Account joined {user.joined}</>, meta: user.joined },
  ];

  return (
    <div className="px-6 py-6 md:px-8">
      <button onClick={() => router.push(backHref)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white"><ArrowLeft size={14} /> Back</button>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full flex-shrink-0 lg:w-[300px]">
          <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex items-center justify-between">
              <NomarcAvatar name={user.name || user.email} src={user.avatarUrl ?? undefined} size="lg" />
              <KebabMenu items={[
                { icon: KeyRound, label: "Send Password Reset", onClick: () => toast("Password reset email queued") },
                { icon: LogIn, label: "Log in as User", onClick: logInAs },
                { icon: Ban, label: user.banned ? "Restore Account" : "Suspend Account", onClick: toggleBan },
                { icon: Trash2, label: "Delete Account", danger: true, onClick: del },
              ]} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{user.name || "—"}</h2>
              {user.verified && <StatusBadge tone="green">Verified</StatusBadge>}
            </div>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{user.headline || user.industry || user.email}</p>
            {user.location && <p className="mt-1 text-[12px] text-[#9a9a9a]">{user.location}</p>}
            <p className="mt-3 text-[12px] text-[#9a9a9a]">User status <StatusBadge tone={user.banned ? "red" : "green"} className="ml-1.5">{user.banned ? "Suspended" : "Active"}</StatusBadge></p>

            {user.about && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">About</h3>
                <p className="text-[12.5px] leading-relaxed text-[#4a4a4a] dark:text-white/60 line-clamp-4">{user.about}</p>
              </div>
            )}

            {user.workExperience.length > 0 && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Work Experience</h3>
                <div className="space-y-3">
                  {user.workExperience.slice(0, 3).map((w, i) => (
                    <div key={i}>
                      <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{w.title} · {w.company}</p>
                      <p className="text-[11px] text-[#9a9a9a]">{w.period}{w.location ? ` · ${w.location}` : ""}</p>
                      {w.description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6b6b6b] dark:text-white/50 line-clamp-2">{w.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user.skills.length > 0 && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.slice(0, 8).map((s) => (
                    <span key={s} className="rounded-full bg-[#fff7cc] px-2.5 py-1 text-[11px] font-semibold text-[#8a6d00] dark:bg-[#ffd716]/10 dark:text-[#ffd716]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {user.specializations.length > 0 && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Specializations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.specializations.map((s) => (
                    <span key={s} className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[11px] font-semibold text-[#4a4a4a] dark:bg-white/5 dark:text-white/70">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {user.categories.length > 0 && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Categories</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.categories.map((c) => (
                    <span key={c} className="rounded-full bg-[#fff7cc] px-2.5 py-1 text-[11px] font-semibold text-[#8a6d00] dark:bg-[#ffd716]/10 dark:text-[#ffd716]">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {user.companyDetails && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Company Details</h3>
                <div className="space-y-1 text-[12px] text-[#6b6b6b] dark:text-white/60">
                  {user.companyDetails.headquarters && <p>Headquarters · {user.companyDetails.headquarters}</p>}
                  {user.companyDetails.yearFounded && <p>Year Founded · {user.companyDetails.yearFounded}</p>}
                  {user.companyDetails.companySize && <p>Company Size · {user.companyDetails.companySize}</p>}
                </div>
              </div>
            )}

            {user.certifications.length > 0 && (
              <div className="mt-4 border-t border-[#f0f0f0] pt-4 dark:border-white/10">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9a9a9a]">Certifications</h3>
                <div className="space-y-1.5">
                  {user.certifications.map((c, i) => (
                    <div key={i}>
                      <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{c.name}</p>
                      {(c.issuer || c.year) && <p className="text-[11px] text-[#9a9a9a]">{[c.issuer, c.year].filter(Boolean).join(" · ")}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <DashboardTabs tabs={TABS} active={tab} onChange={(k) => setTab(k as Tab)} className="mb-5" />

          {tab === "overview" && (
            <div className="space-y-5">
              <KpiTileRow stats={stats} />
              <ActivityFeed recent={activity} title="Activity" />
            </div>
          )}

          {tab === "verification" && (
            kyc ? (
              <div className="rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
                <h3 className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Submitted documents</h3>
                <div className="mt-3 space-y-4">
                  {kyc.docs.map((d) => (
                    <div key={d.id}>
                      <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-[#9a9a9a]">{d.docType} <StatusBadge tone={d.status === "approved" ? "green" : d.status === "rejected" ? "red" : "amber"}>{d.status}</StatusBadge></p>
                      <DocViewer url={d.docUrl} />
                    </div>
                  ))}
                  {kyc.docs.length === 0 && <p className="text-[13px] text-[#9a9a9a]">No documents submitted.</p>}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[#9a9a9a]">{user.verified ? "This account is fully verified." : "No pending verification submission."}</p>
            )
          )}

          {tab === "billing" && (
            <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
              <table className="w-full text-left text-[13px]">
                <thead><tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
                  <th className="px-4 py-3">Description</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th>
                </tr></thead>
                <tbody>
                  {(tx ?? []).map((t) => (
                    <tr key={t.id} className="border-b border-[#f0f0f0] last:border-0 dark:border-white/5">
                      <td className="px-4 py-3">{t.planLabel} · {t.cycle}</td>
                      <td className="px-4 py-3 text-[#9a9a9a]">{t.date}</td>
                      <td className="px-4 py-3">₦{t.amount.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge tone={t.status === "success" ? "green" : t.status === "failed" ? "red" : "amber"}>{t.status}</StatusBadge></td>
                    </tr>
                  ))}
                  {tx?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#9a9a9a]">No billing history.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "support" && (
            <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
              <table className="w-full text-left text-[13px]">
                <thead><tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Status</th>
                </tr></thead>
                <tbody>
                  {(tickets ?? []).map((t) => (
                    <tr key={t.id} className="border-b border-[#f0f0f0] last:border-0 dark:border-white/5">
                      <td className="px-4 py-3 text-[#9a9a9a]">{t.date}</td>
                      <td className="px-4 py-3">{t.subject}</td>
                      <td className="px-4 py-3"><StatusBadge tone={t.status === "resolved" || t.status === "closed" ? "green" : "amber"}>{t.status}</StatusBadge></td>
                    </tr>
                  ))}
                  {tickets?.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-[#9a9a9a]">No support tickets.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
