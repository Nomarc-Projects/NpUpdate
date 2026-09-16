import { betterAuth, APIError } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { verifyPassword as legacyScryptVerify } from "better-auth/crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { attachDbRetry } from "./db/retry";
import { sendEmail, emailLayout, escapeHtml } from "./email/mailer";
import { validatePassword } from "./password-policy";
import { resolveSiteUrl, PRODUCTION_ORIGIN, stripTrailingSlash } from "@/lib/site-url";

/**
 * Better Auth server instance (Next.js, same-origin httpOnly cookies).
 * Database: CockroachDB (Postgres wire-compatible) via node-postgres Pool.
 *
 * TLS: CockroachDB Cloud certs chain to ISRG Root X1 (publicly trusted), so
 * Node's system CAs already validate them. We still load the cluster CA when
 * available (per the "always use cert" rule), falling back gracefully.
 */
function resolveSSL() {
  // Doppler stores the cluster CA PEM as COCKROACH_CERT; COCKROACH_CA_CERT is
  // an alternate name. Either works; otherwise fall back to the committed file.
  const envCert = process.env.COCKROACH_CA_CERT || process.env.COCKROACH_CERT;
  if (envCert && envCert.includes("BEGIN CERTIFICATE")) {
    return { ca: envCert, rejectUnauthorized: true as const };
  }
  const certPath = path.join(process.cwd(), "certs", "cockroach-ca.crt");
  try {
    return { ca: fs.readFileSync(certPath, "utf8"), rejectUnauthorized: true as const };
  } catch {
    // CA still validates against Node's built-in trust store (ISRG Root X1).
    return { rejectUnauthorized: true as const };
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSSL(),
  max: 5,
});
// The auth pool is the one in the /admin crash trace (`auth.api.getSession` →
// DNS EAI_AGAIN). Retry the connect so a proxy-hostname blip doesn't error out
// a session lookup — the gate every admin page and mutation goes through.
attachDbRetry(pool, "auth");

/**
 * Append an auth event to `audit_log`. Deliberately fire-and-forget: an audit
 * write must never be able to fail a sign-in, and the table may not exist on a
 * database that has not had the migration applied yet.
 *
 * Uses the pool directly rather than the Drizzle client to avoid a circular
 * import (lib/db/client → … → lib/auth).
 */
async function writeAuthAudit(userId: string, action: string, detail: Record<string, unknown>) {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail) VALUES ($1, $2, 'user', $3, $4)`,
      [userId, action, userId, JSON.stringify(detail)],
    );
  } catch { /* audit is best-effort — never break the auth flow */ }
}

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleId && googleSecret);

export const auth = betterAuth({
  database: pool,
  // Reuse the existing Doppler keys (AUTH_SECRET / AUTH_URL) so prod needs no
  // new secrets; BETTER_AUTH_* take precedence if set.
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  // resolveSiteUrl(), not the raw env: AUTH_URL on Vercel is the deployment URL,
  // so every reset and verification link was sent pointing at nomarc-gigs.vercel.app.
  baseURL: resolveSiteUrl(),
  // Accept requests from every domain the app is served on, so logging in from
  // the custom domain or a Vercel preview URL isn't rejected as "Invalid origin".
  trustedOrigins: [
    "http://localhost:3000",
    "https://nomarc-gigs.vercel.app",
    "https://nomarcdatagig.com",
    "https://www.nomarcdatagig.com",
    // The eventual production domain. Listed ahead of the cutover so sign-in
    // doesn't fail with "Invalid origin" the moment DNS is repointed; harmless
    // until then, since nothing is served from it by this app yet.
    "https://nomarcprojects.com",
    "https://www.nomarcprojects.com",
    // Preview deployments trust only their OWN Vercel-injected URL. This list is
    // a security boundary — Better Auth validates the Origin header and every
    // callbackURL/redirectTo against it — and a "https://*.vercel.app" wildcard
    // trusted any deployment on a domain anyone can publish to.
    ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter((h): h is string => Boolean(h))
      .map((h) => `https://${h.replace(/^https?:\/\//, "").replace(/\/$/, "")}`),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // The real policy — uppercase, lowercase, digit, symbol, no whitespace, not
    // on the breached-password blocklist — lives in lib/password-policy.ts and
    // was only ever run in the browser, by the signup form. A direct POST to
    // /api/auth/sign-up/email accepted "aaaaaaaa". Better Auth has no
    // `validate` hook, but `password.hash` receives the plaintext and is on
    // every path that sets a password (sign-up, reset, change), so the check
    // goes here.
    //
    // Hashing: bcrypt (cost 10), replacing Better Auth's default scrypt hasher
    // for every NEW or RESET password. `verify` detects the format per account:
    // bcrypt hashes start "$2", everything older is the legacy scrypt string,
    // which still verifies through better-auth/crypto — so existing members are
    // migrated opportunistically (their hash becomes bcrypt the next time they
    // reset/change their password) instead of being locked out on deploy day.
    password: {
      hash: async (password) => {
        const { ok, error } = validatePassword(password);
        if (!ok) throw new APIError("BAD_REQUEST", { message: error ?? "Password is too weak." });
        return bcrypt.hash(password, 10);
      },
      verify: async ({ password, hash }) => {
        if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
          return bcrypt.compare(password, hash);
        }
        return legacyScryptVerify({ password, hash });
      },
    },
    // Sign-in is not blocked on verification (imported users have temp
    // passwords and haven't verified) — but password reset emails are live.
    requireEmailVerification: false,
    // Kill every existing session for the account when its password is reset,
    // so a stolen session cookie cannot outlive the credential change (the
    // "old sessions still work after reset" account-takeover pattern).
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // `url` is built by better-auth from the request's own origin, which on
      // Vercel is the deployment URL (e.g. nomarc-gigs.vercel.app). Rebase it
      // onto the canonical site URL so the link in the email never points at a
      // deployment host; in dev/preview the canonical URL *is* the request
      // origin, so the link is unchanged there.
      const canonicalUrl = url.replace(/^https?:\/\/[^/]+/, stripTrailingSlash(resolveSiteUrl()));
      await sendEmail({
        to: user.email,
        subject: "Reset your Nomarc Projects password",
        html: emailLayout({
          eyebrow: "Password reset",
          preheader: "Reset your Nomarc Projects password",
          heading: "Reset your password",
          subheading: "Choose a new password for your Nomarc Projects account",
          body: `<p style="margin:0 0 10px;">Hi ${escapeHtml(user.name || "there")},</p><p style="margin:0;">We received a request to reset the password for your Nomarc Projects account. Click the button below to choose a new one.</p>`,
          ctaLabel: "Reset password",
          ctaUrl: canonicalUrl,
          notice: {
            title: "Security notice",
            text: "This reset link expires shortly. For your security, please do not share this email with anyone.",
          },
          footnote: "If you didn't request this, you can safely ignore this email; your password will not change.",
        }),
      });
    },
  },
  emailVerification: {
    // OTP-based verification drives sign-up (see the emailOTP plugin below), so
    // we don't auto-send a verification LINK on sign-up. Kept for completeness.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Nomarc email",
        html: emailLayout({
          heading: "Verify your email address",
          subheading: "Thank you for joining Nomarc Projects",
          body: `<p style="margin:0 0 10px;">Hi ${escapeHtml(user.name || "there")},</p><p style="margin:0;">Welcome to Nomarc Projects. Please confirm your email address to finish securing your account.</p>`,
          ctaLabel: "Verify email address",
          ctaUrl: url,
          notice: {
            title: "Security notice",
            text: "This verification link expires shortly. For your security, please do not share this email with anyone.",
          },
        }),
      });
    },
  },
  socialProviders: googleEnabled
    ? { google: { clientId: googleId!, clientSecret: googleSecret! } }
    : {},
  /**
   * Let Google sign-in attach to an account that already exists.
   *
   * Account linking is OFF by default, and almost every account here predates
   * Google sign-in: 1795 `credential` rows against 7 `google` ones. So Google
   * worked for brand-new users and failed for everyone else — Better Auth
   * matched the email to an existing user, had no permission to add a second
   * provider to it, and returned the visitor signed-out. That reads exactly
   * like "I signed in with Google and I'm still not signed in", which is why it
   * survived a round of host and credential fixes: neither was the cause.
   *
   * `trustedProviders` is what makes the link automatic. Google asserts the
   * email address it hands back, so that assertion is what the match is made
   * on — a stronger claim than an unverified local signup, which is the case
   * this has to cover (most of these accounts never verified their address).
   * Only Google is trusted here; nothing else may auto-link.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      /**
       * Required, and the reason `trustedProviders` alone did not fix this.
       * Better Auth checks local verification SEPARATELY from provider trust
       * (oauth2/link-account.mjs):
       *
       *   const requireLocalEmailVerified = accountLinking?.requireLocalEmailVerified ?? true;
       *   if (!isTrustedProvider && !userInfo.emailVerified
       *       || requireLocalEmailVerified && !dbUser.user.emailVerified
       *       || ...) -> redirect ?error=account_not_linked
       *
       * It defaults to true, so a trusted provider still cannot link to an
       * account whose own email was never verified — which is 1766 of 1804
       * users here, 98% of them. Google sign-in therefore failed for almost
       * everyone with an existing account and worked only for brand-new users.
       *
       * TRADE-OFF, deliberately taken: this guard exists because an unverified
       * local account has never proven it owns its address. Sign-up does not
       * currently enforce verification (569 of the last 30 days' sign-ups are
       * unverified), so someone could register an address they do not own and
       * later have the real owner's Google sign-in link into it — leaving the
       * planted password valid on the victim's account.
       *
       * The durable fix is to enforce verification at sign-up; until then this
       * is knowingly open. Do not treat emailVerified as a security boundary
       * anywhere else without re-reading this note.
       */
      requireLocalEmailVerified: false,
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Changing the address on an account is an account-takeover step, and it
      // also lets someone claim an address they don't own. This was `true` with
      // the note "email is not yet live" — email is wired now via Resend.
      updateEmailWithoutVerification: false,
    },
    additionalFields: {
      // Base role for every new account. Accounts start as `client` (no intent);
      // professional/exhibitor/employer are unlocked later via onboarding + the
      // multi-role model. The defaultValue covers every signup path, including
      // OAuth (Google), which is what this field is here for.
      //
      // input MUST stay false: `user.role` is the sole authorization gate for the
      // admin console and impersonation. With input:true, Better Auth accepted
      // `role` straight off the sign-up body, so an unauthenticated POST to
      // /api/auth/sign-up/email with role:"super_admin" minted a full admin.
      role: {
        type: "string",
        required: false,
        defaultValue: "client",
        input: false,
      },
      // free | plus | pro | premium — subscription tier (professional plans).
      // Not user-settable at signup; changed via subscribe action / admin.
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
      // admin moderation — when true the dashboard layout bounces them out.
      banned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      // Admin-managed partnership flag. Grants promotion rights to accounts
      // not on the Key players exhibitor plan — the "partnerships only" half
      // of the promotions gate (see lib/services/promotions.ts). Not
      // user-settable; toggled from the admin User Management console.
      isPartner: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  // Brute-force protection. Better Auth enables rate limiting in production by
  // default, but with in-memory storage — useless on Vercel, where each
  // serverless instance keeps its own counter, so the effective limit is the
  // configured one multiplied by however many lambdas are warm. Database
  // storage makes the limit real and shared. The 6-digit email OTP is the
  // reason this matters most: 10-minute validity and a million-value space is
  // brute-forceable without it.
  //
  // REQUIRES drizzle/0032_auth_rate_limit.sql to have been applied.
  rateLimit: {
    enabled: true,
    storage: "database",
    // These count per IP. Nigerian mobile carriers put very large numbers of
    // subscribers behind a handful of NAT addresses, so a limit tuned for one
    // person is really a limit shared by a whole cell. The migration blast makes
    // this concrete: it asks the entire member list to reset a password, and at
    // max:3 the fourth genuine person on a shared carrier IP within the same
    // minute is refused the one action the email told them to take.
    //
    // The reset flows are therefore sized for a crowd, while the guessing
    // surfaces (OTP verification, sign-in) stay tight, since those are the ones
    // where a high ceiling actually buys an attacker something. The 6-digit OTP
    // is the reason database-backed limiting matters at all: 10-minute validity
    // over a million-value space is brute-forceable without it.
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      // Requesting a reset only ever mails the address's own owner, so a loose
      // ceiling costs little; the tight one locked real users out instead.
      "/forget-password": { window: 60, max: 20 },
      "/reset-password": { window: 60, max: 20 },
      "/email-otp/send-verification-otp": { window: 60, max: 5 },
      // Kept low deliberately: this is the endpoint where a wrong guess is a
      // guess at a 6-digit code.
      "/email-otp/verify-email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: "nomarc",
    // Secure cookies are otherwise inferred from baseURL, so an AUTH_URL that
    // slipped to http:// in production would silently drop the Secure flag.
    useSecureCookies: process.env.NODE_ENV === "production",
    /*
     * Cookies are deliberately HOST-ONLY. Do not reintroduce
     * `crossSubDomainCookies` with a hardcoded domain.
     *
     * It was set here to `.nomarcprojects.com` to let a session survive a hop
     * between apex and www. That broke sign-in outright on the other domain
     * this same deployment serves:
     *
     *   www.nomarcdatagig.com  →  200, sign-in succeeds, session row written
     *   Set-Cookie: ... Domain=.nomarcprojects.com
     *
     * A browser rejects a cookie whose Domain is neither the request host nor a
     * parent of it, so that cookie was silently discarded. Sign-in "worked" —
     * the POST returned 200 and the session landed in the database — and the
     * visitor came back signed-out, which read as a Google/OAuth fault and
     * survived several rounds of fixes aimed at the wrong domain. One user
     * accumulated six sessions in six minutes retrying.
     *
     * Nothing needs the shared scope: both apexes redirect to their www host
     * (nomarcprojects.com 308, nomarcdatagig.com 307), so every request is
     * already served from a single host per domain, and a host-only cookie is
     * correct on all four. If a genuine subdomain ever needs the session, derive
     * the domain from the request host — never pin one domain while the
     * deployment answers for another.
     */
    // Rate limiting counts per IP, and behind Vercel the socket address is the
    // proxy's — without this every visitor shares one bucket.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  // Audit trail for the account events that matter in an incident: who signed
  // in from where, and every email change. Writes to the same `audit_log` table
  // the admin console already uses, and never fails the request it observes.
  databaseHooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          await writeAuthAudit(session.userId, "session_created", {
            ip: ctx?.request?.headers.get("x-forwarded-for") ?? null,
            userAgent: ctx?.request?.headers.get("user-agent") ?? null,
          });
        },
      },
    },
    user: {
      update: {
        // `before` rather than `after`: the after-hook receives only the updated
        // row, so there is no previous value to compare against. The partial
        // update is the signal — an `email` key means the address is changing.
        before: async (user) => {
          if (user.email && user.id) await writeAuthAudit(user.id, "email_changed", { to: user.email });
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          await writeAuthAudit(account.userId, "account_linked", { provider: account.providerId });
        },
      },
      update: {
        /**
         * Confirm a password change by email.
         *
         * Hooked here rather than at either call site because the password lives
         * on the `account` row, so this one place covers BOTH routes that can
         * change it: the reset-link flow and Change Password in account
         * settings. better-auth 1.6 has no `onPasswordReset` hook.
         *
         * Filtered to `credential` accounts — an OAuth row also updates when its
         * tokens refresh, and nobody wants "your password changed" mail every
         * time Google hands back a new access token.
         *
         * An unexpected one of these is how someone finds out their account has
         * been taken, so it is worth sending even though the user just did it
         * themselves.
         */
        after: async (account) => {
          if (account.providerId !== "credential" || !account.userId) return;
          await writeAuthAudit(account.userId, "password_changed", {});
          try {
            const res = await pool.query(
              `SELECT name, email FROM "user" WHERE id = $1 LIMIT 1`,
              [account.userId],
            );
            const u = res.rows[0] as { name: string | null; email: string | null } | undefined;
            if (!u?.email) return;
            await sendEmail({
              to: u.email,
              subject: "Your Nomarc Projects password was changed",
              html: emailLayout({
                eyebrow: "Security",
                preheader: "Your password was changed",
                heading: "Your password was changed",
                subheading: "Confirming a change to your Nomarc Projects account",
                body: `<p style="margin:0 0 10px;">Hi ${escapeHtml(u.name || "there")},</p><p style="margin:0;">The password for your Nomarc Projects account was just changed. You can sign in with your new password straight away.</p>`,
                ctaLabel: "Sign in",
                ctaUrl: `${resolveSiteUrl()}/login`,
                notice: {
                  title: "Didn't do this?",
                  text: "Reset your password immediately and reply to this email so we can secure the account.",
                },
              }),
            });
          } catch {
            /* Best-effort: a mail failure must never break signing in with the
               password that was just set. */
          }
        },
      },
    },
  },
  plugins: [
    // 6-digit email OTP — powers the "verify your email" step after sign-up.
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60, // 10 minutes
      sendVerificationOTP: async ({ email, otp }) => {
        await sendEmail({
          to: email,
          subject: `${otp} is your Nomarc Projects verification code`,
          html: emailLayout({
            eyebrow: "Verify your email",
            preheader: `Your Nomarc Projects code is ${otp}`,
            heading: "Confirm your email address",
            body: `<p style="margin:0 0 8px;">Enter this code to verify your email and finish setting up your Nomarc Projects account. It expires in <strong>10 minutes</strong>.</p>
              <div style="margin:22px 0;padding:18px;border:1px solid #ececec;border-radius:12px;background:#faf9f4;text-align:center;">
                <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#1e1e1e;">${otp}</span>
              </div>`,
            footnote: "Didn't try to sign up? You can safely ignore this email; no account will be created without this code.",
          }),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
