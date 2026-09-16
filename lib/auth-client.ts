"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, emailOTPClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

/**
 * Browser auth client. Same-origin, so baseURL is inferred from the page.
 * Usage:
 *   authClient.signUp.email({ email, password, name, role })
 *   authClient.signIn.email({ email, password })
 *   authClient.signIn.social({ provider: "google" })
 *   authClient.signOut()
 *   const { data: session } = authClient.useSession()
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/** Password-reset helpers (Better Auth client actions from the /*-password routes). */
export const forgetPassword: (args: { email: string; redirectTo?: string }) => Promise<{ error?: { message?: string } | null }> =
  (args) => authClient.requestPasswordReset(args);
export const resetPassword: (args: { newPassword: string; token: string }) => Promise<{ error?: { message?: string } | null }> =
  (args) => authClient.resetPassword(args);
