import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  MAINTENANCE_TAG,
  MAINTENANCE_DEFAULT,
  normalizeMaintenance,
  type MaintenanceSetting,
  MAIL_THROUGHPUT_TAG,
  MAIL_THROUGHPUT_DEFAULT,
  normalizeMailThroughput,
  type MailThroughputSetting,
  TICKER_SPEED_TAG,
  TICKER_SPEED_DEFAULT,
  normalizeTickerSpeed,
  type TickerSpeedSetting,
  EXHIBITION_HUB_TAG,
  EXHIBITION_HUB_DEFAULT,
  normalizeExhibitionHub,
  type ExhibitionHubSetting,
  TOOLS_TAG,
  TOOLS_DEFAULT,
  normalizeTools,
  type ToolsSetting,
  PAYMENT_PLANS_TAG,
  PAYMENT_PLANS_DEFAULT,
  normalizePaymentPlans,
  type PaymentPlansSetting,
  ABOUT_TEAM_TAG,
  ABOUT_TEAM_DEFAULT,
  normalizeAboutTeam,
  type AboutTeamSetting,
  PWA_TAG,
  PWA_DEFAULT,
  normalizePwa,
  type PwaSetting,
  KEY_PLAYERS_TAG,
  KEY_PLAYERS_DEFAULT,
  normalizeKeyPlayers,
  type KeyPlayersSetting,
  TRUSTED_CLIENTS_TAG,
  TRUSTED_CLIENTS_DEFAULT,
  normalizeTrustedClients,
  type TrustedClientsSetting,
} from "@/lib/services/platform-settings-shared";

/* ── Reading platform settings ──────────────────────────────────────────
 * Separate from ./platform-settings.ts, which is "use server". Every export of
 * a "use server" module becomes a callable server-action endpoint, so having
 * the reader there published the whole settings object — including
 * `allowEmails`, the list of people let through during maintenance — to any
 * unauthenticated caller who POSTed to the action id. Nothing here is exported
 * to the client: `server-only` makes importing it from a client component a
 * build error rather than a silent leak.
 */

/**
 * The maintenance setting. Cached for 30s and tagged so `setMaintenance` can
 * purge it for an effectively instant flip.
 *
 * Fails OPEN — a missing table (pre-migration) or a DB hiccup resolves to
 * `enabled: false`. Failing closed would let one bad query take the whole
 * public site down, which is far worse than a maintenance screen not showing.
 */
const readMaintenance = unstable_cache(
  async (): Promise<MaintenanceSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'maintenance' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return MAINTENANCE_DEFAULT;
      // pg returns jsonb already parsed; tolerate a string just in case.
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeMaintenance(value);
    } catch {
      return MAINTENANCE_DEFAULT;
    }
  },
  ["platform-setting-maintenance"],
  { revalidate: 30, tags: [MAINTENANCE_TAG] },
);

/** Full setting — server-side callers only (gate, admin page, robots). */
export async function getMaintenance(): Promise<MaintenanceSetting> {
  return readMaintenance();
}

/**
 * Just the flag and the display copy — no `allowEmails`. What the public
 * maintenance page needs, and the only shape that should ever travel toward a
 * rendered response.
 */
export async function getMaintenancePublic(): Promise<
  Pick<MaintenanceSetting, "enabled" | "headline" | "message" | "etaText">
> {
  const { enabled, headline, message, etaText } = await readMaintenance();
  return { enabled, headline, message, etaText };
}

/**
 * Mail throughput. Same fail-open reasoning as maintenance: if the setting can't
 * be read, fall back to the conservative default rather than either stalling the
 * queue or sending at an unbounded rate.
 */
const readMailThroughput = unstable_cache(
  async (): Promise<MailThroughputSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'mail_throughput' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return MAIL_THROUGHPUT_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeMailThroughput(value);
    } catch {
      return MAIL_THROUGHPUT_DEFAULT;
    }
  },
  ["platform-setting-mail-throughput"],
  { revalidate: 30, tags: [MAIL_THROUGHPUT_TAG] },
);

export async function getMailThroughput(): Promise<MailThroughputSetting> {
  return readMailThroughput();
}

/**
 * Ticker speed. Same fail-open reasoning as the settings above: an unreadable
 * value falls back to the default rather than leaving the marquee with no
 * duration, which would render it motionless.
 */
const readTickerSpeed = unstable_cache(
  async (): Promise<TickerSpeedSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'ticker_speed' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return TICKER_SPEED_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeTickerSpeed(value);
    } catch {
      return TICKER_SPEED_DEFAULT;
    }
  },
  ["platform-setting-ticker-speed"],
  { revalidate: 30, tags: [TICKER_SPEED_TAG] },
);

export async function getTickerSpeed(): Promise<TickerSpeedSetting> {
  return readTickerSpeed();
}

/**
 * Exhibition Hub availability. Same fail-open reasoning as maintenance: an
 * unreadable value falls back to the closed default rather than a bad query
 * accidentally flinging the whole marketplace open.
 */
const readExhibitionHub = unstable_cache(
  async (): Promise<ExhibitionHubSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'exhibition_hub' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return EXHIBITION_HUB_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeExhibitionHub(value);
    } catch {
      return EXHIBITION_HUB_DEFAULT;
    }
  },
  ["platform-setting-exhibition-hub"],
  { revalidate: 30, tags: [EXHIBITION_HUB_TAG] },
);

export async function getExhibitionHub(): Promise<ExhibitionHubSetting> {
  return readExhibitionHub();
}

/**
 * Tools page availability. Same fail-open reasoning as maintenance: an
 * unreadable value falls back to the open default rather than a bad query
 * accidentally hiding the tools directory.
 */
const readTools = unstable_cache(
  async (): Promise<ToolsSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'tools' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return TOOLS_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeTools(value);
    } catch {
      return TOOLS_DEFAULT;
    }
  },
  ["platform-setting-tools"],
  { revalidate: 30, tags: [TOOLS_TAG] },
);

export async function getTools(): Promise<ToolsSetting> {
  return readTools();
}

/**
 * Payment Plans availability. When the section was never enabled or the read
 * fails, it stays hidden — exactly the paused behavior we ship now.
 */
const readPaymentPlans = unstable_cache(
  async (): Promise<PaymentPlansSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'payment-plans' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return PAYMENT_PLANS_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizePaymentPlans(value);
    } catch {
      return PAYMENT_PLANS_DEFAULT;
    }
  },
  ["platform-setting-payment-plans"],
  { revalidate: 30, tags: [PAYMENT_PLANS_TAG] },
);

export async function getPaymentPlans(): Promise<PaymentPlansSetting> {
  return readPaymentPlans();
}

/**
 * About page team section. Same fail-open reasoning as maintenance: an
 * unreadable value (pre-migration, DB hiccup, build-time prerender) resolves
 * to the full designed default so the section keeps rendering, content intact.
 */
const readAboutTeam = unstable_cache(
  async (): Promise<AboutTeamSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'about_team' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return ABOUT_TEAM_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeAboutTeam(value);
    } catch {
      return ABOUT_TEAM_DEFAULT;
    }
  },
  ["platform-setting-about-team"],
  { revalidate: 30, tags: [ABOUT_TEAM_TAG] },
);

export async function getAboutTeam(): Promise<AboutTeamSetting> {
  return readAboutTeam();
}

/**
 * PWA availability. Same fail-open reasoning as the other settings: an
 * unreadable value resolves to the on default rather than a bad query silently
 * stripping the install prompt and service worker from every visitor.
 */
const readPwa = unstable_cache(
  async (): Promise<PwaSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'pwa' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return PWA_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizePwa(value);
    } catch {
      return PWA_DEFAULT;
    }
  },
  ["platform-setting-pwa"],
  { revalidate: 30, tags: [PWA_TAG] },
);

export async function getPwa(): Promise<PwaSetting> {
  return readPwa();
}

/**
 * Homepage "Key Players" strip. Same fail-open reasoning as maintenance: an
 * unreadable value (pre-migration, DB hiccup, build-time prerender) resolves
 * to the full designed set so the strip keeps rendering, content intact.
 */
const readKeyPlayers = unstable_cache(
  async (): Promise<KeyPlayersSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'key_players' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return KEY_PLAYERS_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeKeyPlayers(value);
    } catch {
      return KEY_PLAYERS_DEFAULT;
    }
  },
  ["platform-setting-key-players"],
  { revalidate: 30, tags: [KEY_PLAYERS_TAG] },
);

export async function getKeyPlayers(): Promise<KeyPlayersSetting> {
  return readKeyPlayers();
}

/**
 * Homepage "Trusted Clients" strip. Same fail-open reasoning as Key Players:
 * the strip used to be a hardcoded array, so anything unreadable here has to
 * resolve to that same designed set rather than an empty marquee.
 */
const readTrustedClients = unstable_cache(
  async (): Promise<TrustedClientsSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'trusted_clients' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return TRUSTED_CLIENTS_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeTrustedClients(value);
    } catch {
      return TRUSTED_CLIENTS_DEFAULT;
    }
  },
  ["platform-setting-trusted-clients"],
  { revalidate: 30, tags: [TRUSTED_CLIENTS_TAG] },
);

export async function getTrustedClients(): Promise<TrustedClientsSetting> {
  return readTrustedClients();
}
