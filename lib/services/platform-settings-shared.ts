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
export const PWA_TAG = "platform-setting:pwa";
export const KEY_PLAYERS_TAG = "platform-setting:key-players";
export const TRUSTED_CLIENTS_TAG = "platform-setting:trusted-clients";

/* ── News ticker speed ──────────────────────────────────────────────────
 * Scroll rate in pixels per second. Higher = faster.
 *
 * This was "seconds per loop", which turned out to be an unstable unit: the
 * marquee keyframe translates -50% of a track that is the item set repeated 12x,
 * so the distance covered in one "loop" grows every time an item is added. A
 * fixed duration therefore meant a different speed for a different item count —
 * and the admin preview (2x repeat) never matched the live strip (12x repeat) at
 * all, so the control read as broken. Pixels per second is independent of both,
 * so what the admin sets is what every visitor sees, and adding an item no
 * longer silently speeds the ticker up.
 *
 * The stored value is the rate; the animation duration is derived per render
 * from the measured track width (see TickerRow in components/ui/news-ticker).
 *
 * Legacy rows holding `{ "seconds": N }` are ignored rather than converted:
 * turning seconds into a rate needs a track width, and guessing one would bake
 * in a wrong speed. They fall through to the default and are overwritten on the
 * next save.
 */
export interface TickerSpeedSetting {
  /** Scroll rate in pixels per second. */
  pxPerSecond: number;
}

/** ~35px/s is a comfortable reading pace and matches what the old 90s default
 *  looked like on a two-item track. */
/** Roughly the rate the previous `{ "seconds": 300 }` setting produced on a
 *  typical track. Chosen to match the old perceived speed rather than to look
 *  tidy in isolation: a lap is `trackWidth / 2 / pxPerSecond`, so a low rate on a
 *  long track reads as a frozen strip rather than a slow one. */
export const TICKER_SPEED_DEFAULT: TickerSpeedSetting = { pxPerSecond: 75 };

/** Clamped: 0 would freeze the strip and a very high rate is unreadable. */
export function normalizeTickerSpeed(raw: unknown): TickerSpeedSetting {
  const v = (raw ?? {}) as Partial<TickerSpeedSetting>;
  const n = Number(v.pxPerSecond);
  return {
    pxPerSecond: Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 10), 200) : TICKER_SPEED_DEFAULT.pxPerSecond,
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

/* ── Progressive Web App (PWA) availability ───────────────────────────
 * Decides whether the app installs as a PWA: the /sw.js service worker is only
 * registered and the install prompt is only shown when this is on. Super-admin
 * editable like the other feature switches so turning PWA on/off is a toggle,
 * not a deploy.
 */
export interface PwaSetting {
  /** True = PWA behaviour (service worker + install prompt) is enabled. */
  enabled: boolean;
}

/** Default: on. PWA ships live at launch, so the out-of-the-box state stays on. */
export const PWA_DEFAULT: PwaSetting = { enabled: true };

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizePwa(raw: unknown): PwaSetting {
  const v = (raw ?? {}) as Partial<PwaSetting>;
  return {
    enabled: v.enabled === true,
  };
}

/* ── Homepage "Key Players" strip ──────────────────────────────────────
 * "Key Players and Fastest Growing Companies in the Industry" — the glass-card
 * marquee on the homepage. Super-admin editable so the showcased companies
 * (name, mark image, external link) can be curated without a deploy and the
 * strip can be hidden entirely. `enabled` is the show/hide switch.
 */
export interface KeyPlayer {
  name: string;
  /** Path or uploaded URL for the mark (e.g. /logos/partners/mct.png). */
  src: string;
  /** Where the card links. Empty = non-clickable card. */
  href: string;
}

export type KeyPlayersSetting = LogoStripSetting;

/** Defaults mirror the companies baked into trusted-by.tsx, so a super admin
 *  who never edits anything sees exactly the designed strip. */
export const KEY_PLAYERS_DEFAULT: KeyPlayersSetting = {
  enabled: true,
  heading: "Key Players and Fastest Growing Companies in the Industry",
  logos: [
    { name: "MC&T — Migliore Construzione & Tecniche", src: "/logos/partners/mct.png", href: "https://mcandt.com.ng/" },
    { name: "The Building Practice", src: "/logos/partners/building-practice.png", href: "https://www.buildingpractice.biz/" },
    { name: "CEP — Construction Economists Partnership Limited", src: "/logos/partners/cep.png", href: "http://cepeconomists.com" },
    { name: "DanBran Projects Limited", src: "/logos/partners/danbran-projects.png", href: "https://danbranprojectsltd.com/danbran12dx/" },
    { name: "14Eter Limited", src: "/logos/partners/14eter.svg", href: "https://14eter.org" },
    { name: "Tivisto", src: "/logos/partners/tivisto.png", href: "https://drive.google.com/file/d/19crZRwag_msXnClaN8VGW8q71iMOjKy1/view" },
  ],
};

/** A logo that survives normalizing keeps its name; a blank-name row is dropped
 *  rather than filled in, because deleting a company is a legitimate CRUD act. */
export function normalizeKeyPlayer(raw: unknown): KeyPlayer | null {
  const l = (raw ?? {}) as Partial<KeyPlayer>;
  const name = typeof l.name === "string" ? l.name.trim() : "";
  if (!name) return null;
  return {
    name,
    src: typeof l.src === "string" && l.src.trim() ? l.src.trim() : "",
    href: typeof l.href === "string" ? l.href.trim() : "",
  };
}

/** Coerce whatever is in the jsonb column into a complete, safe object. An
 *  explicit empty list stays empty (the strip then hides itself); only a
 *  missing row resolves to the default. */
export function normalizeKeyPlayers(raw: unknown): KeyPlayersSetting {
  return normalizeLogoStrip(raw, KEY_PLAYERS_DEFAULT.heading);
}

/** The shape both homepage logo strips share. Kept as one interface because
 *  Key Players and Trusted Clients are curated the same way — heading, on/off
 *  switch, ordered company cards — and only their copy differs. */
export interface LogoStripSetting {
  /** True = the strip renders on the homepage. */
  enabled: boolean;
  /** The strip's headline, shown above the marquee. */
  heading: string;
  logos: KeyPlayer[];
}

/** `fallbackHeading` is the designed default for the calling strip, so a row
 *  that predates an admin renaming the heading keeps rendering the old copy
 *  rather than an empty line. */
export function normalizeLogoStrip(raw: unknown, fallbackHeading: string): LogoStripSetting {
  const v = (raw ?? {}) as Partial<LogoStripSetting>;
  const logos = Array.isArray(v.logos) ? v.logos.map(normalizeKeyPlayer).filter((l): l is KeyPlayer => l !== null) : [];
  return {
    enabled: v.enabled === true,
    heading: typeof v.heading === "string" && v.heading.trim() ? v.heading.trim() : fallbackHeading,
    logos,
  };
}

/* ── Homepage "Trusted Clients" strip ─────────────────────────────────────
 * The second logo marquee, last section before the footer. It used to be a
 * hardcoded array in logo-marquee.tsx merged with the Key Players list at
 * render time, which meant editing it needed a deploy and a company could not
 * be delisted without a code change. It is now curated the same way as Key
 * Players, from the `trusted_clients` platform setting.
 *
 * The two lists are deliberately independent: a Key Player is no longer
 * auto-added here. Showing a company under one heading and not the other is a
 * real editorial choice, and the old merge made it impossible to express.
 */
export type TrustedClientsSetting = LogoStripSetting;

/** Seeds the strip with the companies that were previously hardcoded, so the
 *  homepage renders identically until a super admin edits it. */
export const TRUSTED_CLIENTS_DEFAULT: TrustedClientsSetting = {
  enabled: true,
  heading: "Trusted Clients",
  logos: [
    { name: "FSB Real Estate", src: "/logos/partners/fsb-real-estate.png", href: "" },
    { name: "Punuka", src: "/logos/partners/punuka.png", href: "" },
    { name: "Sheraton", src: "/logos/partners/sheraton.png", href: "" },
    { name: "Lagos State Government", src: "/logos/partners/lagos-state.png", href: "" },
    { name: "DanBran Projects", src: "/logos/partners/danbran.png", href: "" },
  ],
};

export function normalizeTrustedClients(raw: unknown): TrustedClientsSetting {
  return normalizeLogoStrip(raw, TRUSTED_CLIENTS_DEFAULT.heading);
}
