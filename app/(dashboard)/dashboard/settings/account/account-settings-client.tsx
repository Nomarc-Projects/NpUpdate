"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccountSettings, type Tab } from "@/components/dashboard/settings/account-settings";
import type { StackableRole } from "@/lib/entitlements";

const VALID_TABS: Tab[] = ["profile", "qualifications", "company", "info", "verification", "billing", "notifications", "email", "password", "delete"];

function AccountInner({ heldRoles }: { heldRoles: StackableRole[] }) {
  const raw = useSearchParams().get("tab");
  const tab = (VALID_TABS as string[]).includes(raw ?? "") ? (raw as Tab) : "info";
  return <AccountSettings heldRoles={heldRoles} initialTab={tab} />;
}

export function AccountSettingsClient({ heldRoles }: { heldRoles: StackableRole[] }) {
  return (
    <Suspense fallback={null}>
      <AccountInner heldRoles={heldRoles} />
    </Suspense>
  );
}
