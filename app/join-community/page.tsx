"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { COMMUNITY_WHATSAPP_URL, communitySignupHref } from "@/lib/community";

/**
 * Post-auth handoff for the "Join Community" flow. It is only ever reached
 * once an account exists (sign-up → verify → here): if the session is live we
 * forward straight to the WhatsApp group, otherwise we bounce back through
 * sign-up with the handoff still remembered.
 *
 * `location.replace` (not assign) keeps this intermediate URL out of history,
 * so pressing back from WhatsApp lands on the previous platform page rather
 * than re-triggering the handoff.
 */
export default function JoinCommunityPage() {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (data?.user) {
      window.location.replace(COMMUNITY_WHATSAPP_URL);
    } else {
      router.replace(communitySignupHref());
    }
  }, [data, isPending, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#111]">
      <Loader2 className="h-6 w-6 animate-spin text-[#caa400]" />
    </div>
  );
}
