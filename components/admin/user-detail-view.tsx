"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, KeyRound, LogIn, Ban, Trash2 } from "lucide-react";
import { DashboardTabs, StatusBadge, KpiTileRow, ActivityFeed, KebabMenu, type TabItem, type Stat, type ActivityItem } from "@/components/dashboard/kit";
import { DocViewer } from "@/components/admin/verification-view";
import { NomarcAvatar } from "@/components/ui/avatar";
import { startImpersonation } from "@/lib/services/impersonation";
import { setUserBanned, adminDeleteUser, getUserTransactions, getUserBillingSummary, getUserSupportTicketsAdmin, getUserKyc, markTransactionPaid, markTransactionFailed, verifyTransactionWithProvider, recordManualPayment, extendUserPlanExpiry, type AdminUserDetail, type AdminTxRow, type KycItem } from "@/lib/services/admin";
import { PLAN_LABEL, planPrice, type Plan, type BillingCycle } from "@/lib/entitlements";

type Tab = "overview" | "verification" | "billing" | "support";
const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "verification", label: "Verification" },
  { key: "billing", label: "Billing History" },
  { key: "support", label: "Support Logs" },
];

/** Plans a super admin can record a manual payment for (paid tiers only). */
const MANUAL_PLANS: Plan[] = ["sme", "exhibitor", "key_player", "plus", "pro", "premium"];
const CYCLES: BillingCycle[] = ["monthly", "biannual", "annual"];
const PROVIDERS = ["paystack", "flutterwave", "seerbit", "transfer"];

export function UserDetailView({ user, backHref, canManageBilling = false }: { user: AdminUserDetail; backHref: string; canManageBilling?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "overview");
  const [kyc, setKyc] = useState<KycItem | null>(null);
  const [tx, setTx] = useState<AdminTxRow[] | null>(null);
  const [billing, setBilling] = useState<Awaited<ReturnType<typeof getUserBillingSummary>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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
      getUserBillingSummary(user.id).then(setBilling).catch(() => setBilling(null));
    }
    if (tab === "support" && !tickets) {
      getUserSupportTicketsAdmin(user.id).then(setTickets).catch(() => setTickets([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function refreshBilling() {
    getUserTransactions(user.id).then(setTx).catch(() => setTx([]));
    getUserBillingSummary(user.id).then(setBilling).catch(() => setBilling(null));
    router.refresh();
  }

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

  /** Run a billing repair action, toast its own message, refresh on success. */
  function runBilling(key: string, fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(key);
    fn()
      .then((r) => { toast[r.ok ? "success" : "error"](r.message, { id: key }); if (r.ok) refreshBilling(); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Action failed", { id: key }))
      .finally(() => setBusy(null));
  }
  function verifyTx(t: AdminTxRow) {
    runBilling(t.id, () => verifyTransactionWithProvider(t.id));
  }
  function markPaid(t: AdminTxRow) {
    if (!window.confirm(`Record ${t.planLabel} · ₦${t.amount.toLocaleString()} as PAID and grant the plan to ${user.name || user.email}?\n\nUse this only when you have the payment proof.`)) return;
    runBilling(t.id, () => markTransactionPaid(t.id));
  }
  function voidTx(t: AdminTxRow) {
    if (!window.confirm("Mark this attempt as failed? It will no longer grant anything, even if the provider later reports it settled.")) return;
    runBilling(t.id, () => markTransactionFailed(t.id));
  }
  function submitManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const plan = String(f.get("plan")) as Plan;
    const cycle = String(f.get("cycle")) as BillingCycle;
    const rawAmount = String(f.get("amount") ?? "").trim();
    const amount = rawAmount ? Number(rawAmount) : planPrice(plan, cycle);
    const provider = String(f.get("provider") ?? "").trim();
    const reference = String(f.get("reference") ?? "").trim();
    const bonusDays = Number(f.get("bonusDays") ?? 0);
    const label = `${PLAN_LABEL[plan] ?? plan} · ₦${amount.toLocaleString()}${bonusDays ? ` + ${bonusDays} days` : ""} → ${user.name || user.email}`;
    if (!window.confirm(`Record this payment and grant the plan?\n\n${label}\nRef: ${reference || "(none)"} · ${provider}`)) return;
    runBilling("manual", () => recordManualPayment({ userId: user.id, plan, cycle, amount, provider, reference, bonusDays }));
    form.reset();
  }
  function extend(days: number) {
    if (!window.confirm(`Add ${days} days to this account's current plan?`)) return;
    runBilling("extend", () => extendUserPlanExpiry(user.id, days));
  }

  const stats: Stat[] = [
    { label: "Current Plan", value: PLAN_LABEL[user.plan as Plan] ?? user.plan },
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
                      <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{w.title}{w.company ? ` · ${w.company}` : ""}</p>
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
            <div className="space-y-4">
              {/* Current entitlement — reads the role row, not the legacy scalar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ececec] p-4 dark:border-white/10">
                <div>
                  <p className="text-[15px] font-semibold">{billing?.planLabel ?? "—"}</p>
                  <p className="mt-0.5 text-[12px] text-[#9a9a9a]">
                    {billing?.active
                      ? `${billing?.trialEndsAt ? "Trial" : "Active"}${billing?.periodEnd ? ` until ${billing.periodEnd}` : ""}`
                      : "No active paid plan"}
                    {billing?.role ? ` · ${billing.role} role` : ""}
                  </p>
                </div>
                <div className="text-right text-[12px] text-[#9a9a9a]">
                  {billing?.amount != null && <p>Last paid ₦{billing.amount.toLocaleString()} · {billing.provider}{billing.lastPaid ? ` · ${billing.lastPaid}` : ""}</p>}
                  {canManageBilling && billing?.active && (
                    <button onClick={() => extend(14)} disabled={busy === "extend"} className="mt-1 text-[12px] font-semibold text-[#1e1e1e] underline disabled:opacity-50 dark:text-white">+14 days</button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#ececec] dark:border-white/10">
                <table className="w-full text-left text-[13px]">
                  <thead><tr className="border-b border-[#ececec] bg-[#fafafa] text-[11.5px] font-semibold uppercase tracking-wide text-[#9a9a9a] dark:border-white/10 dark:bg-white/[0.03]">
                    <th className="px-4 py-3">Description</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reference</th>
                    {canManageBilling && <th className="px-4 py-3 text-right">Fix</th>}
                  </tr></thead>
                  <tbody>
                    {(tx ?? []).map((t) => (
                      <tr key={t.id} className="border-b border-[#f0f0f0] last:border-0 dark:border-white/5">
                        <td className="px-4 py-3">{t.planLabel} · {t.cycle}</td>
                        <td className="px-4 py-3 text-[#9a9a9a]">{t.date}</td>
                        <td className="px-4 py-3">₦{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge tone={t.status === "success" ? "green" : t.status === "failed" ? "red" : "amber"}>{t.status}</StatusBadge></td>
                        <td className="px-4 py-3 text-[11.5px] text-[#9a9a9a]">{t.provider} · {t.reference}</td>
                        {canManageBilling && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {t.status === "success" ? <span className="text-[12px] text-[#b5b5b5]">—</span> : (
                              <span className="inline-flex gap-2">
                                <button onClick={() => verifyTx(t)} disabled={busy === t.id} className="rounded-lg border border-[#e2e2e2] px-2.5 py-1 text-[12px] font-semibold hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5">Verify</button>
                                <button onClick={() => markPaid(t)} disabled={busy === t.id} className="rounded-lg bg-[#1e1e1e] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-[#161616]">Mark paid</button>
                                {t.status === "pending" && <button onClick={() => voidTx(t)} disabled={busy === t.id} className="rounded-lg px-2 py-1 text-[12px] text-[#b02020] hover:underline disabled:opacity-50">Void</button>}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {tx?.length === 0 && <tr><td colSpan={canManageBilling ? 6 : 5} className="px-4 py-8 text-center text-[#9a9a9a]">No billing history.</td></tr>}
                  </tbody>
                </table>
              </div>

              {canManageBilling && (
                <details className="rounded-2xl border border-[#ececec] p-4 dark:border-white/10">
                  <summary className="cursor-pointer text-[13px] font-semibold">Record a payment the system missed</summary>
                  <p className="mt-1 text-[12px] text-[#9a9a9a]">For a payment provably made (bank transfer, or a provider webhook that never landed) with no successful transaction row. This writes the row <em>and</em> grants the plan.</p>
                  <form onSubmit={submitManual} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Plan
                      <select name="plan" defaultValue="exhibitor" className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]">
                        {MANUAL_PLANS.map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                      </select>
                    </label>
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Cycle
                      <select name="cycle" defaultValue="monthly" className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]">
                        {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Amount (₦)
                      <input name="amount" type="number" min="0" placeholder="list price" className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]" />
                    </label>
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Provider
                      <input name="provider" list="providers" defaultValue="transfer" className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]" />
                      <datalist id="providers">{PROVIDERS.map((p) => <option key={p} value={p} />)}</datalist>
                    </label>
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Reference
                      <input name="reference" required className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]" />
                    </label>
                    <label className="text-[12px] text-[#6b6b6b] dark:text-white/60">Bonus days
                      <input name="bonusDays" type="number" min="0" max="365" defaultValue="0" className="mt-1 w-full rounded-lg border border-[#e2e2e2] bg-white px-2.5 py-1.5 text-[13px] dark:border-white/15 dark:bg-[#1e1e1e]" />
                    </label>
                    <div className="col-span-2 md:col-span-3">
                      <button type="submit" disabled={busy === "manual"} className="rounded-lg bg-[#1e1e1e] px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-[#161616]">Record &amp; grant</button>
                    </div>
                  </form>
                </details>
              )}
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
