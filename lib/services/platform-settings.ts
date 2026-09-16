"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin, requireSuperAdmin } from "@/lib/authz";
import { getMaintenance, getMailThroughput, getTickerSpeed, getExhibitionHub, getTools, getPaymentPlans, getAboutTeam, getPwa } from "@/lib/services/platform-settings-read";
import {
  MAINTENANCE_TAG,
  normalizeMaintenance,
  type MaintenanceSetting,
  MAIL_THROUGHPUT_TAG,
  normalizeMailThroughput,
  type MailThroughputSetting,
  TICKER_SPEED_TAG,
  normalizeTickerSpeed,
  type TickerSpeedSetting,
  EXHIBITION_HUB_TAG,
  normalizeExhibitionHub,
  type ExhibitionHubSetting,
  TOOLS_TAG,
  normalizeTools,
  type ToolsSetting,
  PAYMENT_PLANS_TAG,
  normalizePaymentPlans,
  type PaymentPlansSetting,
  ABOUT_TEAM_TAG,
  normalizeAboutTeam,
  type AboutTeamSetting,
  PWA_TAG,
  normalizePwa,
  type PwaSetting,
} from "@/lib/services/platform-settings-shared";

/* ── Maintenance mode: the write path ───────────────────────────────────
 * Persisted in platform_setting under the key `maintenance` (drizzle
 * 0030_platform_settings.sql). Env vars were the obvious alternative and were
 * rejected: flipping one means a redeploy, and the whole point of this switch
 * is that it can be thrown mid-cutover from the admin console.
 *
 * ONLY the admin-guarded mutation lives here. Every export of a "use server"
 * module is a callable endpoint, so the reader deliberately sits in
 * ./platform-settings-read (server-only) — exporting it from here published
 * `allowEmails` to anyone who could invoke the action. Constants, the type and
 * the normaliser are in ./platform-settings-shared, since a "use server" module
 * may only export async functions.
 */

/**
 * Super-admin-only write. Upserts the whole object and audits the change.
 *
 * Was `requireAdmin`, which meant any plain admin could take the entire public
 * site offline. Pulling the platform down is squarely in the category of
 * irreversible, platform-wide acts that the super_admin tier exists to hold.
 */
export async function setMaintenance(
  input: Partial<MaintenanceSetting>,
): Promise<MaintenanceSetting> {
  const admin = await requireSuperAdmin();
  const current = await getMaintenance();
  const next = normalizeMaintenance({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('maintenance', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  // Toggling on/off is the security-relevant event, so record it explicitly.
  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "maintenance_on" : "maintenance_off"}, 'platform_setting', 'maintenance', ${next.etaText || null})
      `)
      .catch(() => {});
  }

  // `expire: 0` purges immediately: an admin flipping the switch expects the
  // site to change now, not after the 30s window lapses. Next 16 requires this
  // second argument.
  revalidateTag(MAINTENANCE_TAG, { expire: 0 });
  return next;
}

/**
 * Admin-only write for the campaign send rate.
 *
 * Lives in platform_setting rather than an env var for the same reason as
 * maintenance: the safe rate is whatever the email provider actually tolerates,
 * which is learned mid-send, and throttling a blast that is already going out
 * must not require a redeploy.
 *
 * Rate changes are audited: "why did the blast crawl" and "who sped it up" are
 * both questions worth being able to answer after the fact.
 */
/**
 * Server-action read, so a client settings card can show the live value.
 *
 * getMailThroughput() lives in platform-settings-read.ts, which is a plain server
 * module and therefore not callable from a client component; this is the action
 * wrapper. Admin-gated because the sending rate is operational detail.
 */
export async function getMailThroughputSetting(): Promise<MailThroughputSetting> {
  await requireAdmin();
  return getMailThroughput();
}

export async function setMailThroughput(
  input: Partial<MailThroughputSetting>,
): Promise<MailThroughputSetting> {
  // Super admin: releasing a blast is already super-admin only, and this lever
  // decides how hard that blast hits the email provider. Set too high it gets the
  // sending domain blocklisted, which affects password resets too.
  const admin = await requireSuperAdmin();
  const current = await getMailThroughput();
  const next = normalizeMailThroughput({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('mail_throughput', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  if (current.emailsPerHour !== next.emailsPerHour || current.batchSize !== next.batchSize) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, 'mail_throughput_changed', 'platform_setting', 'mail_throughput',
                ${`${next.emailsPerHour}/hour, batch ${next.batchSize}`})
      `)
      .catch(() => {});
  }

  revalidateTag(MAIL_THROUGHPUT_TAG, { expire: 0 });
  return next;
}

/* ── News ticker speed: the write path ──────────────────────────────────
 * Admin (not super-admin): this only changes how fast a marquee scrolls on the
 * public site. Nothing here can cost money or take the platform down, so it
 * sits with the ordinary admin content controls the ticker items already use.
 */
export async function getTickerSpeedSetting(): Promise<TickerSpeedSetting> {
  await requireAdmin();
  return getTickerSpeed();
}

export async function setTickerSpeed(seconds: number): Promise<TickerSpeedSetting> {
  const admin = await requireAdmin();
  const next = normalizeTickerSpeed({ seconds });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('ticker_speed', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  revalidateTag(TICKER_SPEED_TAG, { expire: 0 });
  revalidatePath("/");
  return next;
}

/* ── Exhibition Hub: the write path ──────────────────────────────────────
 * Super-admin-only, like maintenance and mail throughput: opening or locking
 * the marketplace is a platform-wide, launcher-grade act.
 */
export async function setExhibitionHub(
  input: Partial<ExhibitionHubSetting>,
): Promise<ExhibitionHubSetting> {
  const admin = await requireSuperAdmin();
  const current = await getExhibitionHub();
  const next = normalizeExhibitionHub({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('exhibition_hub', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "exhibition_hub_open" : "exhibition_hub_lock"}, 'platform_setting', 'exhibition_hub', NULL)
      `)
      .catch(() => {});
  }

  // Purge immediately so flipping the switch changes the live site now.
  revalidateTag(EXHIBITION_HUB_TAG, { expire: 0 });
  revalidatePath("/exhibition-hub");
  return next;
}

/* ── Tools page: the write path ─────────────────────────────────────────
 * Super-admin-only, like the hub: taking the public tools directory live or
 * hiding it is a platform-wide, launcher-grade act.
 */
export async function setTools(input: Partial<ToolsSetting>): Promise<ToolsSetting> {
  const admin = await requireSuperAdmin();
  const current = await getTools();
  const next = normalizeTools({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('tools', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "tools_open" : "tools_lock"}, 'platform_setting', 'tools', NULL)
      `)
      .catch(() => {});
  }

  revalidateTag(TOOLS_TAG, { expire: 0 });
  revalidatePath("/tools");
  return next;
}

/* ── Payment Plans (Plans & upgrades): the write path ───────────────────
 * Super-admin-only: pausing or relaunching payment plans is a commercial,
 * platform-wide decision, so plain admins don't get the lever.
 */
export async function setPaymentPlans(input: Partial<PaymentPlansSetting>): Promise<PaymentPlansSetting> {
  const admin = await requireSuperAdmin();
  const current = await getPaymentPlans();
  const next = normalizePaymentPlans({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('payment-plans', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "payment_plans_open" : "payment_plans_hide"}, 'platform_setting', 'payment-plans', NULL)
      `)
      .catch(() => {});
  }

  // Purge immediately so the Account Settings entry resolves now, not after
  // the 30s cache window.
  revalidateTag(PAYMENT_PLANS_TAG, { expire: 0 });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/plans");
  return next;
}

/* ── About page team section: the write path ────────────────────────────
 * Super-admin-only, like the other content that sits directly on the public
 * site: the section is part of the About page's designed copy, and edits to it
 * (or hiding it) go out to every visitor, so plain admins don't get the lever.
 * Members' `img` accepts either a paved path (the /media/about/team-*.webp
 * files) or an uploaded /media URL from the admin image picker.
 */
export async function setAboutTeam(
  input: Partial<AboutTeamSetting>,
): Promise<AboutTeamSetting> {
  const admin = await requireSuperAdmin();
  const current = await getAboutTeam();
  const next = normalizeAboutTeam({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('about_team', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  // Hiding/showing the section is the visitor-facing event, so record it.
  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "about_team_show" : "about_team_hide"}, 'platform_setting', 'about_team', NULL)
      `)
      .catch(() => {});
  }

  // Purge immediately so an edit or a hide/ship flip shows on the live About
  // page right away, not after the 30s cache window.
  revalidateTag(ABOUT_TEAM_TAG, { expire: 0 });
  revalidatePath("/about");
  return next;
}

/* ── PWA: the write path ────────────────────────────────────────────────
 * Super-admin-only, like the other feature switches: turning installability on
 * or off for every visitor is a platform-wide, launcher-grade act.
 */
export async function getPwaSetting(): Promise<PwaSetting> {
  await requireAdmin();
  return getPwa();
}

export async function setPwa(input: Partial<PwaSetting>): Promise<PwaSetting> {
  const admin = await requireSuperAdmin();
  const current = await getPwa();
  const next = normalizePwa({ ...current, ...input });

  await db.execute(sql`
    INSERT INTO platform_setting (key, value, updated_at, updated_by)
    VALUES ('pwa', ${JSON.stringify(next)}::jsonb, now(), ${admin})
    ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(next)}::jsonb, updated_at = now(), updated_by = ${admin}
  `);

  if (current.enabled !== next.enabled) {
    await db
      .execute(sql`
        INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
        VALUES (${admin}, ${next.enabled ? "pwa_enabled" : "pwa_disabled"}, 'platform_setting', 'pwa', NULL)
      `)
      .catch(() => {});
  }

  // Purge immediately so flipping the switch changes the installed experience
  // now, not after the 30s cache window.
  revalidateTag(PWA_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return next;
}
