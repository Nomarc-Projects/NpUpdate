"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useAuth } from "@/lib/store/auth";
import { getMyAvatar } from "@/lib/services/account";

/**
 * Bridges the Better Auth session into the lightweight zustand auth store so
 * existing consumers (navbar, user-menu) keep working off `useAuth`.
 * Mounted once in Providers.
 *
 * When the session carries no `image` (the avatar mirror onto user.image can
 * occasionally miss), we fall back to the profile/company avatar via
 * `getMyAvatar` so the navbar still shows the picture the user actually set.
 */
export function SessionSync() {
  const { data } = useSession();
  const signIn = useAuth((s) => s.signIn);
  const signOut = useAuth((s) => s.signOut);

  useEffect(() => {
    if (data?.user) {
      const name = data.user.name;
      const email = data.user.email;
      const image = data.user.image ?? undefined;
      signIn({ name, email, avatar: image });
      if (!image) {
        getMyAvatar().then((url) => { if (url) signIn({ name, email, avatar: url }); }).catch(() => {});
      }
    } else {
      signOut();
    }
  }, [data, signIn, signOut]);

  return null;
}
