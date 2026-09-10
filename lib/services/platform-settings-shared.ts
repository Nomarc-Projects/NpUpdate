/* ── Maintenance mode: shared constants + types ─────────────────────────
 * Split out of ./platform-settings.ts because that file is "use server", where
 * every export must be an async function. Exporting a const from a "use server"
 * module doesn't just fail for that one export — the bundler emits "the module
 * has no exports at all" and every import of the file breaks. Type-checking
 * doesn't catch it; only a build does.
 */

export const MAINTENANCE_TAG = "platform-setting:maintenance";
export const MAIL_THROUGHPUT_TAG = "platform-setting:mail-throughput";
export const TICKER_SPEED_TAG = "platform-setting:ticker-speed";
export const EXHIBITION_HUB_TAG = "platform-setting:exhibition-hub";
export const TOOLS_TAG = "platform-setting:tools";
export const PAYMENT_PLANS_TAG = "platform-setting:payment-plans";
export const ABOUT_TEAM_TAG = "platform-setting:about-team";

/* ── News ticker speed ──────────────────────────────────────────────────
 * Seconds for one full marquee pass. Higher = slower. Adjustable without a
 * deploy because the right value depends on how many items are live and how
 * long they are, which changes every time the ticker is edited.
 */
export interface TickerSpeedSetting {
  /** Duration of one loop, in seconds. */
  seconds: number;
}

/** 90s reads comfortably at the current item count; 30s was too fast to follow. */
export const TICKER_SPEED_DEFAULT: TickerSpeedSetting = { seconds: 90 };

/** Clamped: 0 would freeze the animation and a huge value stalls it entirely. */
export function normalizeTickerSpeed(raw: unknown): TickerSpeedSetting {
  const v = (raw ?? {}) as Partial<TickerSpeedSetting>;
  const n = Number(v.seconds);
  return {
    seconds: Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 10), 600) : TICKER_SPEED_DEFAULT.seconds,
  };
}

/* ── Mail throughput ────────────────────────────────────────────────────
 * How fast a campaign is allowed to go out. Adjustable without a deploy
 * because the right number depends on what the email provider will tolerate,
 * which is discovered in production rather than known in advance.
 */
export interface MailThroughputSetting {
  /** Ceiling on messages sent per rolling hour, across the whole platform. */
  emailsPerHour: number;
  /** Messages the drain attempts per invocation. Derived from the hourly rate
   *  and the scheduler's interval, but pinnable for a slow first run. */
  batchSize: number;
}

/** 300/hour is the agreed default: safe for the current Resend plan, and with a
 *  five-minute scheduler that lands at 25 messages per invocation. */
export const MAIL_THROUGHPUT_DEFAULT: MailThroughputSetting = {
  emailsPerHour: 300,
  batchSize: 25,
};

/** Clamped hard: a typo of 300000 here would get the sending domain blocklisted. */
export function normalizeMailThroughput(raw: unknown): MailThroughputSetting {
  const v = (raw ?? {}) as Partial<MailThroughputSetting>;
  const perHour = Number(v.emailsPerHour);
  const batch = Number(v.batchSize);
  return {
    emailsPerHour: Number.isFinite(perHour) ? Math.min(Math.max(Math.round(perHour), 1), 5000) : MAIL_THROUGHPUT_DEFAULT.emailsPerHour,
    batchSize: Number.isFinite(batch) ? Math.min(Math.max(Math.round(batch), 1), 200) : MAIL_THROUGHPUT_DEFAULT.batchSize,
  };
}

export interface MaintenanceSetting {
  enabled: boolean;
  headline: string;
  message: string;
  /** Free text, e.g. "back by 6pm WAT". Empty string = show nothing. */
  etaText: string;
  /** Extra emails allowed straight through, beyond admins. Lowercased. */
  allowEmails: string[];
}

/** Defaults mirror the copy baked into app/maintenance/page.tsx, so an admin who
 *  never edits the text sees exactly the designed page. */
export const MAINTENANCE_DEFAULT: MaintenanceSetting = {
  enabled: false,
  headline: "We’ll be back shortly",
  message:
    "Nomarc Projects is offline for a short, planned update — we’re putting the finishing touches on some improvements. Your account and data are safe, and everything will be exactly where you left it.",
  etaText: "",
  allowEmails: [],
};

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeMaintenance(raw: unknown): MaintenanceSetting {
  const v = (raw ?? {}) as Partial<MaintenanceSetting>;
  return {
    enabled: v.enabled === true,
    headline: typeof v.headline === "string" && v.headline.trim() ? v.headline : MAINTENANCE_DEFAULT.headline,
    message: typeof v.message === "string" && v.message.trim() ? v.message : MAINTENANCE_DEFAULT.message,
    etaText: typeof v.etaText === "string" ? v.etaText : "",
    allowEmails: Array.isArray(v.allowEmails)
      ? v.allowEmails.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [],
  };
}

/* ── Exhibition Hub availability ────────────────────────────────────────
 * Decides whether the public marketplace (browse, product detail, compare,
 * cart and checkout) is open to everyone. When OFF, non-admin visitors land on
 * the Coming Soon screen; admins always get through. Admin-editable like the
 * other platform settings so the launch date isn't a deploy.
 */
export interface ExhibitionHubSetting {
  /** True = the hub is open to all visitors. False = non-admins see Coming Soon. */
  enabled: boolean;
}

/** Default: the hub starts locked (Coming Soon) until a super admin opens it. */
export const EXHIBITION_HUB_DEFAULT: ExhibitionHubSetting = { enabled: false };

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeExhibitionHub(raw: unknown): ExhibitionHubSetting {
  const v = (raw ?? {}) as Partial<ExhibitionHubSetting>;
  return {
    enabled: v.enabled === true,
  };
}

/* ── Tools page availability ───────────────────────────────────────────
 * Decides whether the public /tools page (the "Everything you need…" tool
 * directory) is live. When OFF, non-admin visitors land on the Coming Soon
 * screen; admins always get through. Super-admin-editable like the Exhibition
 * Hub switch.
 */
export interface ToolsSetting {
  /** True = the tools page is open to all visitors. False = non-admins see Coming Soon. */
  enabled: boolean;
}

/** Default: tools are open. Unlike the hub, /tools is a build-time-live page
 *  (not a launch-gated product), so the toggle starts on rather than locking it. */
export const TOOLS_DEFAULT: ToolsSetting = { enabled: true };

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeTools(raw: unknown): ToolsSetting {
  const v = (raw ?? {}) as Partial<ToolsSetting>;
  return {
    enabled: v.enabled !== false,
  };
}

/* ── Payment Plans (Plans & upgrades) availability ─────────────────────
 * Decides whether the "Plans & upgrades" / payment-plan surfaces are visible
 * in Account Settings and reachable in the dashboard. Paused for the current
 * phase of the project; super-admin-editable so relaunch is a toggle, not a
 * deploy.
 */
export interface PaymentPlansSetting {
  /** True = the Plans & upgrades entry and pricing page are available. False = hidden across the dashboard. */
  enabled: boolean;
}

/** Default: locked (hidden) — payment plans are paused until the next phase. */
export const PAYMENT_PLANS_DEFAULT: PaymentPlansSetting = { enabled: false };

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizePaymentPlans(raw: unknown): PaymentPlansSetting {
  const v = (raw ?? {}) as Partial<PaymentPlansSetting>;
  return {
    enabled: v.enabled === true,
  };
}

/* ── About page "The Minds Behind Nomarc" team section ─────────────────
 * Heading, subtitle, eyebrow and the four team cards, super-admin editable so
 * copy can be refined and photos replaced without a deploy. `enabled` is the
 * show/hide switch for the whole section on the public About page.
 */
export interface AboutTeamMember {
  name: string;
  role: string;
  /** Public image URL/path (e.g. /media/about/team-3.webp or an uploaded URL). */
  img: string;
}

export interface AboutTeamSetting {
  /** True = the section renders on the About page. */
  enabled: boolean;
  heading: string;
  subtitle: string;
  eyebrow: string;
  members: AboutTeamMember[];
}

/** Defaults mirror the copy baked into app/(marketing)/about/about-us.tsx, so a
 *  super admin who never edits anything sees exactly the designed section. The
 *  exported filenames are not in the order the team is listed — team-1 is Segun,
 *  team-3 is Adepero. Mapped explicitly rather than renaming the files, which
 *  would break the URLs of anything already pointing at them. */
export const ABOUT_TEAM_DEFAULT: AboutTeamSetting = {
  enabled: true,
  heading: "The Minds Behind Nomarc",
  subtitle:
    "Our platform is built by people who understand the industry's challenges firsthand. Meet the individuals working together to turn our vision for a connected infrastructure into reality.",
  eyebrow: "Meet the team",
  members: [
    { name: "Adepero Abraham", role: "Founder and CEO", img: "/media/about/team-3.webp" },
    { name: "Abiola Abraham", role: "Product Quality Engineer", img: "/media/about/team-4.webp" },
    { name: "Olude Peter", role: "Communications Manager", img: "/media/about/team-2.webp" },
    { name: "J. Segun Ajanlekoko", role: "Managing Partner at CEP Limited", img: "/media/about/team-1.webp" },
  ],
};

/** A member that survives normalizing: name is required, everything else fills
 *  in with safe fallbacks rather than dropping the row. */
export function normalizeAboutTeamMember(raw: unknown): AboutTeamMember {
  const m = (raw ?? {}) as Partial<AboutTeamMember>;
  return {
    name: typeof m.name === "string" && m.name.trim() ? m.name.trim() : (ABOUT_TEAM_DEFAULT.members[0]?.name ?? "Team member"),
    role: typeof m.role === "string" ? m.role.trim() : "",
    img: typeof m.img === "string" && m.img.trim() ? m.img.trim() : "",
  };
}

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeAboutTeam(raw: unknown): AboutTeamSetting {
  const v = (raw ?? {}) as Partial<AboutTeamSetting>;
  const members = Array.isArray(v.members)
    ? v.members.map(normalizeAboutTeamMember).filter((m) => m.name)
    : [];
  return {
    enabled: v.enabled === true,
    heading: typeof v.heading === "string" && v.heading.trim() ? v.heading.trim() : ABOUT_TEAM_DEFAULT.heading,
    subtitle: typeof v.subtitle === "string" && v.subtitle.trim() ? v.subtitle.trim() : ABOUT_TEAM_DEFAULT.subtitle,
    eyebrow: typeof v.eyebrow === "string" && v.eyebrow.trim() ? v.eyebrow.trim() : ABOUT_TEAM_DEFAULT.eyebrow,
    members: members.length ? members : ABOUT_TEAM_DEFAULT.members,
  };
}
