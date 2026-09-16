/**
 * Seed the relaunch announcement as a DRAFT email campaign.
 *
 * Tells migrated members the platform has been redesigned, that their profile
 * details came across intact, and that their old password will not sign them in
 * — with a button to set a new one.
 *
 * Run: doppler run -p nomarc -c prd -- npx tsx scripts/seed-launch-campaign.ts
 *
 * Idempotent: re-running updates the same draft rather than creating a second
 * one. Seeds `status = 'draft'` only — nothing is sent, scheduled or submitted
 * for approval. Releasing it stays a deliberate act in the admin console.
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { resolveSiteUrl } from "../lib/site-url";

const NAME = "Relaunch announcement";
const SITE = resolveSiteUrl();

const SUBJECT = "Good news: the new Nomarc Projects is live";
const PREVIEW = "You have been talking, we have been listening. Come and see what we built.";

/**
 * Body is an inner fragment, not a document: `emailLayout` supplies the shell,
 * the logo, the <h1> (which repeats SUBJECT), the Need Help block and the
 * footer, so this starts at the greeting.
 *
 * The CTA is hand-rolled here rather than passed as `ctaLabel`/`ctaUrl` because
 * email_campaign has no CTA columns; a campaign's button is authored as HTML in
 * the rich editor. It carries the same data-cta-button attributes the editor's
 * CtaButton node emits, so opening this draft in the composer parses it back
 * into a real, editable button instead of a styled link.
 *
 * Deliberately no <table> anywhere: tables are not in the editor's schema, so
 * one would be silently stripped the first time an admin opened this campaign,
 * quietly destroying the layout. Paragraphs and lists survive the round trip.
 *
 * House style for anything that lands in an inbox: no em dashes.
 */
const BODY_HTML = `
<p style="margin:0 0 16px;">Hello,</p>

<p style="margin:0 0 16px;"><strong style="color:#1e1e1e;">You have been talking, and we have been listening.</strong></p>

<p style="margin:0 0 16px;">Over the past few months we took everything you told us about Nomarc Projects, the parts you loved and the parts that frustrated you, and we rebuilt the platform around it. It is live today, and we are genuinely excited for you to see it.</p>

<p style="margin:0 0 16px;">It is quicker, far easier to find your way around, and properly responsive on a phone. Your work, your applications and your messages now sit together in one place, and there is a good deal more you can actually get done.</p>

<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#caa400;">A few of the new things</p>
<ul style="margin:0 0 20px;padding-left:20px;color:#4b4b4b;font-size:14.5px;line-height:1.7;">
  <li style="margin:0 0 8px;"><strong style="color:#1e1e1e;">A rebuilt dashboard.</strong> Your work, applications, messages and profile progress, all on one screen.</li>
  <li style="margin:0 0 8px;"><strong style="color:#1e1e1e;">Tiered verification.</strong> Build trust step by step and earn a verified seal on your public profile.</li>
  <li style="margin:0 0 8px;"><strong style="color:#1e1e1e;">Jobs and quotes.</strong> Apply, track your submissions and request material quotes without leaving the platform.</li>
  <li style="margin:0;"><strong style="color:#1e1e1e;">A materials marketplace.</strong> Source from verified exhibitors and compare everything you have saved.</li>
</ul>

<p style="margin:0 0 16px;">Your account came with you. Your profile, qualifications, work history, education and saved items all carried across exactly as you left them; same account, same email address.</p>

<p style="margin:0 0 22px;">One small thing before you dive in. For everyone's security we were not able to bring passwords across to the new platform, so you will need to set a fresh one. It takes less than a minute, and only once.</p>

<a href="${SITE}/forgot-password" style="display:block;width:100%;box-sizing:border-box;text-align:center;background-color:#ffd716;color:#1e1e1e;font-weight:700;font-style:normal;font-size:15px;text-decoration:none;padding:14px 26px;border-radius:10px;mso-padding-alt:14px 26px;font-family:inherit;" data-cta-button="true" data-bg="#ffd716" data-fg="#1e1e1e" data-radius="10" data-font-size="15" data-bold="true" data-italic="false" data-underline="false" data-full-width="true">Set your password and sign in</a>

<p style="margin:22px 0 0;"></p>

<p style="margin:0 0 20px;color:#6b6b6b;font-size:13.5px;line-height:1.7;">Just use the same email address this message was sent to.</p>

<p style="margin:0;">We are really glad to have you with us.</p>

<p style="margin:16px 0 0;">The Nomarc Projects team</p>
`.trim();

const FOOTNOTE_NOTE =
  "If you have any trouble getting back in, reply to this email and a person will help you.";

(async () => {
  // created_by is NOT NULL. Attribute the draft to a real admin so the campaigns
  // table shows an author rather than a dangling id.
  // NOTE: "user" is Better Auth's table and uses quoted camelCase columns
  // ("createdAt"), unlike the snake_case drizzle tables alongside it.
  const admin = await db.execute(sql`
    SELECT id, email FROM "user"
    WHERE role IN ('super_admin', 'admin') AND banned IS NOT TRUE
    ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, "createdAt"
    LIMIT 1
  `);
  const adminRow = admin.rows[0] as { id: string; email: string } | undefined;
  if (!adminRow) {
    console.error("No admin/super_admin user found — cannot set created_by.");
    process.exit(1);
  }

  const body = `${BODY_HTML}\n<p style="margin:20px 0 0;color:#9a9a9a;font-size:12.5px;line-height:1.7;">${FOOTNOTE_NOTE}</p>`;

  const existing = await db.execute(sql`SELECT id, status FROM email_campaign WHERE name = ${NAME} LIMIT 1`);
  const found = existing.rows[0] as { id: string; status: string } | undefined;

  if (found) {
    // Never rewrite something already released — that would silently change the
    // record of what recipients were actually sent.
    if (found.status !== "draft") {
      console.error(`Campaign "${NAME}" exists with status "${found.status}" — refusing to overwrite. Nothing changed.`);
      process.exit(1);
    }
    await db.execute(sql`
      UPDATE email_campaign SET
        subject = ${SUBJECT}, preview_text = ${PREVIEW}, body_html = ${body},
        from_name = ${"Nomarc Projects"}, reply_to = ${null},
        audience_key = ${"all_users"}, segment_id = ${null},
        status = 'draft', updated_at = now()
      WHERE id = ${found.id}
    `);
    console.log(`Updated existing draft ${found.id}`);
  } else {
    const ins = await db.execute(sql`
      INSERT INTO email_campaign
        (name, subject, preview_text, from_name, reply_to, body_html, segment_id, audience_key, status, created_by)
      VALUES
        (${NAME}, ${SUBJECT}, ${PREVIEW}, ${"Nomarc Projects"}, ${null}, ${body}, ${null}, ${"all_users"}, 'draft', ${adminRow.id})
      RETURNING id
    `);
    console.log(`Created draft ${(ins.rows[0] as { id: string }).id}`);
  }

  const count = await db.execute(sql`
    SELECT count(*)::int AS n FROM "user" WHERE banned IS NOT TRUE AND email IS NOT NULL
  `);
  console.log(`Audience: all_users — ${(count.rows[0] as { n: number }).n} recipients would receive it.`);
  console.log(`CTA target: ${SITE}/forgot-password`);
  console.log(`Author: ${adminRow.email}`);
  console.log(`Status: draft — nothing sent, scheduled, or submitted for approval.`);
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
