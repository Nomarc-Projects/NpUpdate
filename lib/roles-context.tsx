"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { switchActiveRole } from "@/lib/services/roles";
import type { Plan, Role, StackableRole } from "@/lib/entitlements";

/**
 * Client mirror of the server viewer's multi-role state. Fed once by the
 * dashboard layout (a server component that has already run `getViewer()`), so
 * the whole client tree can read held roles + the active role and switch between
 * them without an extra round-trip. `switchRole` optimistically flips the active
 * role, persists it, then `router.refresh()`es so server components re-render.
 */
type RolesState = {
  heldRoles: StackableRole[];
  activeRole: Role;
  plans: Partial<Record<StackableRole, Plan>>;
  switching: boolean;
  switchRole: (role: StackableRole) => void;
};

const RolesCtx = createContext<RolesState | null>(null);

export function RoleProvider({
  heldRoles,
  activeRole,
  plans,
  children,
}: {
  heldRoles: StackableRole[];
  activeRole: Role;
  plans: Partial<Record<StackableRole, Plan>>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Role | null>(null);

  const switchRole = useCallback(
    (role: StackableRole) => {
      if (role === activeRole || !heldRoles.includes(role)) return;
      setOptimistic(role);
      startTransition(async () => {
        await switchActiveRole(role);
        router.refresh();
        setOptimistic(null);
      });
    },
    [activeRole, heldRoles, router],
  );

  return (
    <RolesCtx.Provider value={{ heldRoles, activeRole: optimistic ?? activeRole, plans, switching: pending, switchRole }}>
      {children}
    </RolesCtx.Provider>
  );
}

/** Multi-role state for the current viewer. Null outside the dashboard tree. */
export function useRoles(): RolesState | null {
  return useContext(RolesCtx);
}
