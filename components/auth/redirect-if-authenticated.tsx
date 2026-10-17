"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Sends already-authenticated visitors away from the sign-up / login pages to
 * their dashboard. This is what makes "back" from an external redirect (e.g.
 * the WhatsApp handoff) show the dashboard instead of the sign-up form again.
 *
 * The redirect only fires for a session that was already live when the page
 * mounted. A visitor who signs in through the form is handled by that form's
 * own navigation, so we must not race it by bouncing them to /dashboard.
 */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const initialSessionRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (initialSessionRef.current === null) {
      initialSessionRef.current = Boolean(data?.user);
      if (data?.user) router.replace("/dashboard");
    }
  }, [data, isPending, router]);

  return null;
}
