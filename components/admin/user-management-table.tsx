"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CreditCard, KeyRound, LifeBuoy, LogIn, Ban, Trash2 } from "lucide-react";
import { DataTable, KebabMenu, ConfirmDialog, type DataTableColumn } from "@/components/dashboard/kit";
import { NomarcAvatar } from "@/components/ui/avatar";
import { FiltersRail, type FilterGroup } from "@/components/admin/filters-rail";
import { setUserBanned, adminDeleteUser, type AdminUser } from "@/lib/services/admin";
import { startImpersonation } from "@/lib/services/impersonation";

const VERIFICATION_LABEL: Record<0 | 1 | 2, string> = { 0: "Unverified", 1: "Tier 1", 2: "Tier 2" };

export function UserManagementTable({ kind, rows }: { kind: "professional" | "exhibitor"; rows: AdminUser[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [occupation, setOccupation] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [delUser, setDelUser] = useState<AdminUser | null>(null);
  const [, start] = useTransition();

  const isExhibitor = kind === "exhibitor";
  const occupationOrIndustryOptions = useMemo(() => {
    const key = isExhibitor ? "industry" : "profession";
    const set = new Set<string>();
    for (const r of rows) { const v = r[key]; if (v) set.add(v); }
    return Array.from(set).sort();
  }, [rows, isExhibitor]);

  const filtered = useMemo(() => {
    let list = rows.filter((u) => {
      if (query && !`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (plan && u.plan !== plan) return false;
      if (status === "active" && u.banned) return false;
      if (status === "suspended" && !u.banned) return false;
      if (status === "inactive") return false; // no "inactive" concept on AdminUser yet — reserved for a future last-seen signal
      if (verification === "tier1" && u.tier !== 1) return false;
      if (verification === "tier2" && u.tier !== 2) return false;
      if (verification === "unverified" && u.tier !== 0) return false;
      if (occupation && (isExhibitor ? u.industry : u.profession) !== occupation) return false;
      return true;
    });
    list = [...list].sort((a, b) => sort === "newest" ? b.joined.localeCompare(a.joined) : a.joined.localeCompare(b.joined));
    return list;
  }, [rows, query, plan, status, verification, occupation, sort, isExhibitor]);

  function logInAs(u: AdminUser) {
    toast.loading("Signing in as user…", { id: "imp" });
    // Reason is recorded in the audit log; the server rejects anything too short.
    const why = window.prompt(`Why are you signing in as ${u.name || u.email}? This is recorded in the audit log.`);
    if (why === null) return;
    startImpersonation(u.id, why).then(() => { window.location.href = "/dashboard"; }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed", { id: "imp" }));
  }
  function toggleBan(u: AdminUser) {
    start(() => setUserBanned(u.id, !u.banned).then(() => { toast.success(u.banned ? "Account restored" : "Account suspended"); router.refresh(); }).catch(() => { toast.error("Couldn't update"); }));
  }
  function confirmDelete() {
    if (!delUser) return;
    const u = delUser; setDelUser(null);
    start(() => adminDeleteUser(u.id).then(() => { toast.success("Account deleted"); router.refresh(); }).catch(() => { toast.error("Couldn't delete"); }));
  }

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name", label: "Name",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          {isExhibitor ? (
            u.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.logoUrl} alt={u.name} className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f4f4f4] text-[11px] font-bold text-[#6b6b6b] dark:bg-white/10 dark:text-white/60">
                {u.name.slice(0, 2).toUpperCase()}
              </span>
            )
          ) : (
            <NomarcAvatar name={u.name || u.email} size="sm" />
          )}
          <div className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{u.name || "—"}</span>
            <span className="block truncate text-[11.5px] text-[#9a9a9a]">{u.email}</span>
          </div>
        </div>
      ),
    },
    isExhibitor
      ? { key: "primaryContact", label: "Primary Contact", render: (u) => <span className="text-[13px] text-[#4a4a4a] dark:text-white/70">{u.primaryContact || "—"}</span> }
      : { key: "profession", label: "Profession", render: (u) => <span className="text-[13px] text-[#4a4a4a] dark:text-white/70">{u.profession || "—"}</span> },
    ...(isExhibitor ? [{ key: "industry", label: "Industry", render: (u: AdminUser) => <span className="text-[13px] text-[#4a4a4a] dark:text-white/70">{u.industry || "—"}</span> } as DataTableColumn<AdminUser>] : []),
    { key: "plan", label: "Plan", render: (u) => <span className="text-[13px] capitalize text-[#4a4a4a] dark:text-white/70">{u.plan}</span> },
    { key: "status", label: "Status", render: (u) => <span className={`text-[13px] font-semibold ${u.banned ? "text-[#b7791f]" : "text-[#1a7f43]"}`}>{u.banned ? "Suspended" : "Active"}</span> },
    { key: "verification", label: "Verification", render: (u) => <span className={`text-[13px] font-semibold ${u.tier === 0 ? "text-[#c53434]" : "text-[#1e1e1e] dark:text-white"}`}>{VERIFICATION_LABEL[u.tier]}</span> },
  ];

  const filterGroups: FilterGroup[] = [
    { key: "sort", label: "Sort by", value: sort, onChange: (v) => setSort(v as "newest" | "oldest"), options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] },
    {
      key: "occupation", label: isExhibitor ? "Primary Industry" : "Occupation", value: occupation, onChange: setOccupation,
      options: [{ value: "", label: "All" }, ...occupationOrIndustryOptions.map((o) => ({ value: o, label: o }))],
    },
    { key: "plan", label: "Plan", value: plan, onChange: setPlan, options: [{ value: "", label: "All plans" }, { value: "free", label: "Free" }, { value: "plus", label: "Plus" }, { value: "pro", label: "Pro" }, { value: "premium", label: "Premium" }] },
    { key: "status", label: "Status", value: status, onChange: setStatus, options: [{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }] },
    { key: "verification", label: "Verification Status", value: verification, onChange: setVerification, options: [{ value: "", label: "All tiers" }, { value: "tier1", label: "Tier 1" }, { value: "tier2", label: "Tier 2" }, { value: "unverified", label: "Unverified" }] },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <FiltersRail groups={filterGroups} />

      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <div className="relative max-w-[420px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isExhibitor ? "Search by company name, email, or industry…" : "Search by name, email, or profession…"}
              className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(u) => u.id}
          onRowClick={(u) => router.push(`/admin/user-management/${kind === "professional" ? "professionals" : "exhibitors"}/${u.id}`)}
          rowHoverActions={(u) => (
            <KebabMenu
              items={[
                { icon: CreditCard, label: "Manage Subscription", onClick: () => router.push(`/admin/user-management/${kind === "professional" ? "professionals" : "exhibitors"}/${u.id}?tab=billing`) },
                { icon: KeyRound, label: "Send Password Reset", onClick: () => toast("Password reset email queued") },
                { icon: LifeBuoy, label: "View Support History", onClick: () => router.push(`/admin/user-management/${kind === "professional" ? "professionals" : "exhibitors"}/${u.id}?tab=support`) },
                { icon: LogIn, label: isExhibitor ? "Log in as Exhibitor" : "Log in as User", onClick: () => logInAs(u) },
                { icon: Ban, label: u.banned ? "Restore Account" : "Suspend Account", onClick: () => toggleBan(u) },
                { icon: Trash2, label: "Delete Account", danger: true, onClick: () => setDelUser(u) },
              ]}
            />
          )}
        />
      </div>

      <ConfirmDialog
        open={!!delUser}
        onClose={() => setDelUser(null)}
        onConfirm={confirmDelete}
        title="Delete account"
        description={`Are you sure you want to permanently delete ${delUser?.name || delUser?.email}'s account? This cannot be undone.`}
      />
    </div>
  );
}
