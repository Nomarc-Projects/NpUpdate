"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/** Only internal paths may be used as a destination (open-redirect guard). */
function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * Sends already-authenticated visitors away from the sign-up / login pages.
 * This is what makes "back" from an external redirect (e.g. the WhatsApp
 * handoff) show the app instead of the sign-up form again.
 *
 * Honours `?redirect=` so a visitor who followed a shared link, was prompted to
 * sign in, and already has a session lands back on the page they were reading
 * rather than the dashboard.
 *
 * The redirect only fires for a session that was already live when the page
 * mounted. A visitor who signs in through the form is handled by that form's
 * own navigation, so we must not race it by bouncing them away.
 */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const initialSessionRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (initialSessionRef.current === null) {
      initialSessionRef.current = Boolean(data?.user);
      if (data?.user) {
        // Read the query directly rather than via useSearchParams: this renders
        // outside the login/signup <Suspense> boundary, and reading
        // window.location.search only ever happens client-side in this effect.
        const dest = safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
        router.replace(dest);
      }
    }
  }, [data, isPending, router]);

  return null;
}
