"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { COMMUNITY_WHATSAPP_URL, communitySignupHref } from "@/lib/community";

/**
 * "Join Community" entry point that routes by auth state: signed-in visitors go
 * straight to the WhatsApp group (new tab, so they keep the site), while
 * everyone else is sent to sign-up with the community handoff remembered.
 */
export function JoinCommunityLink({ className }: { className?: string }) {
  const isSignedIn = useAuth((s) => s.isSignedIn);

  if (isSignedIn) {
    return (
      <a href={COMMUNITY_WHATSAPP_URL} target="_blank" rel="noreferrer" className={className}>
        Join Community
      </a>
    );
  }
  return (
    <Link href={communitySignupHref()} className={className}>
      Join Community
    </Link>
  );
}
