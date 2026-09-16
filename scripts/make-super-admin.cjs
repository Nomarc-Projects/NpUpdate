/**
 * Grant (or revoke) super_admin. THE ONLY WAY super_admin IS EVER ASSIGNED.
 *
 * Deliberately a script and not a button. `super_admin` is the tier that can
 * release platform-wide email, manage other admins and impersonate users, so the
 * bar for obtaining it should be "has production database credentials", not "has
 * a session in the admin console". Nothing reachable over HTTP can set this role:
 *   - lib/services/admin.ts `setUserRole` refuses it (ASSIGNABLE_ROLES omits it)
 *   - lib/auth.ts declares `role` with `input: false`, so sign-up cannot set it
 *
 * The target must already have a Nomarc account; this promotes an existing user
 * rather than creating a credential-less one.
 *
 * Usage (from frontend/):
 *   doppler run -p nomarc -c prd -- node scripts/make-super-admin.cjs list
 *   doppler run -p nomarc -c prd -- node scripts/make-super-admin.cjs grant  you@example.com
 *   doppler run -p nomarc -c prd -- node scripts/make-super-admin.cjs revoke them@example.com
 *
 * `grant` and `revoke` both require --yes to actually write, so a mistyped
 * address shows you what it WOULD do first.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require(path.join(process.cwd(), "node_modules", "pg"));

function resolveSSL() {
  const envCert = process.env.COCKROACH_CA_CERT || process.env.COCKROACH_CERT;
  if (envCert && envCert.includes("BEGIN CERTIFICATE")) return { ca: envCert, rejectUnauthorized: true };
  try {
    return { ca: fs.readFileSync(path.join(process.cwd(), "certs", "cockroach-ca.crt"), "utf8"), rejectUnauthorized: true };
  } catch {
    return { rejectUnauthorized: true };
  }
}

const fmt = (r) => `  ${String(r.role).padEnd(12)} ${String(r.email ?? "—").padEnd(34)} ${r.name ?? ""}`;

async function main() {
  const [cmd, email] = process.argv.slice(2);
  const confirmed = process.argv.includes("--yes");

  if (!cmd || !["list", "grant", "revoke"].includes(cmd)) {
    console.error("Usage: make-super-admin.cjs <list|grant|revoke> [email] [--yes]");
    process.exit(1);
  }
  if (cmd !== "list" && !email) {
    console.error(`Usage: make-super-admin.cjs ${cmd} <email> [--yes]`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run this under `doppler run`.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 1 });

  try {
    if (cmd === "list") {
      const { rows } = await pool.query(
        `SELECT name, email, role FROM "user" WHERE role IN ('admin','super_admin') ORDER BY role DESC, "createdAt" ASC`,
      );
      if (!rows.length) {
        console.log("No admins exist yet. Grant the first super admin with:\n  node scripts/make-super-admin.cjs grant you@example.com --yes");
        return;
      }
      console.log(`Privileged accounts (${rows.length}):`);
      rows.forEach((r) => console.log(fmt(r)));
      const supers = rows.filter((r) => r.role === "super_admin").length;
      console.log(`\n${supers} super admin(s), ${rows.length - supers} admin(s).`);
      if (supers > 3) console.log("NOTE: more than three super admins is a large blast radius. Consider revoking some.");
      return;
    }

    const target = email.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT id, name, email, role, banned FROM "user" WHERE lower(email) = $1 LIMIT 1`,
      [target],
    );
    const user = rows[0];

    if (!user) {
      console.error(`No Nomarc account for ${target}.`);
      console.error("They must sign up normally first; this promotes an existing account, it does not create one.");
      process.exit(1);
    }
    if (user.banned) {
      console.error(`${target} is suspended. Reinstate the account before granting privilege.`);
      process.exit(1);
    }

    const nextRole = cmd === "grant" ? "super_admin" : "client";

    if (cmd === "grant" && user.role === "super_admin") {
      console.log(`${target} is already a super admin. Nothing to do.`);
      return;
    }
    if (cmd === "revoke" && user.role !== "super_admin") {
      console.log(`${target} is not a super admin (current role: ${user.role}). Nothing to do.`);
      return;
    }

    // Never leave the platform with no super admin; that state is only
    // recoverable by running this script again, which needs someone who still
    // has production credentials.
    if (cmd === "revoke") {
      const { rows: c } = await pool.query(`SELECT count(*)::int AS n FROM "user" WHERE role = 'super_admin'`);
      if (c[0].n <= 1) {
        console.error("Refusing: this is the last super admin. Grant another one first.");
        process.exit(1);
      }
    }

    console.log(`${cmd === "grant" ? "GRANT" : "REVOKE"}  ${user.name || "(no name)"} <${user.email}>`);
    console.log(`  role: ${user.role} -> ${nextRole}`);

    if (!confirmed) {
      console.log("\nDry run. Re-run with --yes to apply.");
      return;
    }

    await pool.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [nextRole, user.id]);

    // Same audit trail the in-app paths write, so a console-side reader sees
    // script-driven changes too rather than an unexplained role.
    await pool
      .query(
        `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
         VALUES ($1, $2, 'user', $1, $3)`,
        [user.id, cmd === "grant" ? "super_admin_granted" : "super_admin_revoked", `via make-super-admin.cjs (${nextRole})`],
      )
      .catch(() => { /* audit is best-effort */ });

    console.log(`\nDone. ${user.email} is now ${nextRole}.`);
    console.log("They must sign out and back in for the new role to appear in their session.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
