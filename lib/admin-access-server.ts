import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getHeldRoles } from "@/lib/roles-internal";

/**
 * Effective admin roles for the signed-in viewer, resolved on the server.
 *
 * The legacy `user.role` scalar is only one of them: ticket-62's nav also
 * unions the stackable roles in `user_role`. Reading them here (rather than
 * trusting a client store) means the Dashboard and the sidebar cannot disagree,
 * and a role change takes effect on the next request.
 *
 * `cache` keeps the layout and the page from each hitting the DB separately in
 * the same render. A DB hiccup degrades to the scalar role alone.
 */
export const getAdminRoles = cache(async (): Promise<string[]> => {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; role?: string } | undefined;
  const roles = new Set<string>();
  if (user?.role) roles.add(user.role);

  if (user?.id) {
    try {
      const held = await getHeldRoles(user.id);
      for (const role of held) {
        if (role?.role) roles.add(role.role);
      }
    } catch (error) {
      console.error("[admin] could not resolve held roles for dashboard:", error);
    }
  }

  return Array.from(roles);
});
