/**
 * Profile the legacy user data before importing any of it. READ-ONLY.
 *
 * The point is to size the problem — how many duplicates, how many malformed
 * emails, how many bot signups — so the cleaning rules in
 * clean-legacy-users.ts are calibrated against the real distribution instead of
 * guesses, and so there's a baseline to check the import against afterwards.
 *
 * SELECT statements only. Nothing is written anywhere.
 *
 * Run: cd frontend && npx tsx scripts/analyze-legacy-users.ts
 */
import { legacyPool, closeLegacy } from "./legacy-db";

async function main() {
  const pool = await legacyPool();

  const q = async (label: string, query: string) => {
    console.log(`\n── ${label} ${"─".repeat(Math.max(0, 62 - label.length))}`);
    try {
      const r = await pool.request().query(query);
      if (!r.recordset?.length) return console.log("   (no rows)");
      console.table(r.recordset);
    } catch (e) {
      console.log("   ERROR:", e instanceof Error ? e.message : e);
    }
  };

  await q("Roles defined", `SELECT Id, Name FROM Roles ORDER BY Id`);

  await q("Role distribution", `
    SELECT r.Name AS role, COUNT(*) AS n
    FROM UserMngt.UserRoles ur JOIN Roles r ON r.Id = ur.RoleId
    GROUP BY r.Name ORDER BY n DESC`);

  await q("Roles held per user", `
    SELECT roles_held, COUNT(*) AS users FROM (
      SELECT UserId, COUNT(*) AS roles_held FROM UserMngt.UserRoles GROUP BY UserId
    ) t GROUP BY roles_held ORDER BY roles_held`);

  await q("Email integrity", `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN Email IS NULL OR LTRIM(RTRIM(Email)) = '' THEN 1 ELSE 0 END) AS no_email,
      SUM(CASE WHEN Email NOT LIKE '%_@_%._%' THEN 1 ELSE 0 END) AS malformed,
      SUM(CASE WHEN EmailConfirmed = 1 THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN PasswordHash IS NULL THEN 1 ELSE 0 END) AS no_password
    FROM UserMngt.Users`);

  await q("Duplicate emails", `
    SELECT COUNT(*) AS dup_groups, ISNULL(SUM(n) - COUNT(*), 0) AS redundant_rows FROM (
      SELECT NormalizedEmail, COUNT(*) AS n FROM UserMngt.Users
      GROUP BY NormalizedEmail HAVING COUNT(*) > 1
    ) t`);

  // Bot signups on this platform share a tell: a FullName that is one long
  // unspaced token of random letters (e.g. "Nmmtajdyatggjbowvzc") paired with a
  // plausible-looking mailbox. Single-token + >=14 chars catches them without
  // catching real mononyms, which are short.
  await q("Name shape", `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN FullName IS NULL OR LTRIM(RTRIM(FullName)) = '' THEN 1 ELSE 0 END) AS blank,
      SUM(CASE WHEN CHARINDEX(' ', LTRIM(RTRIM(FullName))) = 0 THEN 1 ELSE 0 END) AS single_token,
      SUM(CASE WHEN CHARINDEX(' ', LTRIM(RTRIM(FullName))) = 0 AND LEN(LTRIM(RTRIM(FullName))) >= 14 THEN 1 ELSE 0 END) AS single_token_14plus,
      SUM(CASE WHEN FullName = Email THEN 1 ELSE 0 END) AS name_is_email
    FROM UserMngt.Users`);

  await q("Suspicious-name sample (newest 12)", `
    SELECT TOP 12 FullName, Email, EmailConfirmed, DateCreated
    FROM UserMngt.Users
    WHERE CHARINDEX(' ', LTRIM(RTRIM(FullName))) = 0 AND LEN(LTRIM(RTRIM(FullName))) >= 14
    ORDER BY DateCreated DESC`);

  await q("Signups per month vs suspicious", `
    SELECT FORMAT(DateCreated, 'yyyy-MM') AS month, COUNT(*) AS signups,
           SUM(CASE WHEN CHARINDEX(' ', LTRIM(RTRIM(FullName))) = 0 AND LEN(LTRIM(RTRIM(FullName))) >= 14 THEN 1 ELSE 0 END) AS suspicious
    FROM UserMngt.Users
    GROUP BY FORMAT(DateCreated, 'yyyy-MM') ORDER BY month`);

  await q("Has a talent profile / supplier profile", `
    SELECT
      (SELECT COUNT(*) FROM UserMngt.Users) AS users,
      (SELECT COUNT(DISTINCT UserId) FROM UserMngt.TalentProfiles) AS with_talent_profile,
      (SELECT COUNT(DISTINCT UserId) FROM UserMngt.SupplierProfiles) AS with_supplier_profile,
      (SELECT COUNT(*) FROM UserMngt.TalentProfiles WHERE IsActive = 1) AS active_talent_profiles`);

  await q("Waitlist already registered", `
    SELECT
      (SELECT COUNT(*) FROM UserMngt.WaitlistUser) AS waitlist_total,
      (SELECT COUNT(*) FROM UserMngt.WaitlistUser w
        WHERE EXISTS (SELECT 1 FROM UserMngt.Users u WHERE u.NormalizedEmail = UPPER(LTRIM(RTRIM(w.Email))))) AS also_registered`);

  await q("Top email domains", `
    SELECT TOP 12 RIGHT(Email, LEN(Email) - CHARINDEX('@', Email)) AS domain, COUNT(*) AS n
    FROM UserMngt.Users WHERE Email LIKE '%_@_%._%'
    GROUP BY RIGHT(Email, LEN(Email) - CHARINDEX('@', Email)) ORDER BY n DESC`);

  console.log("\nRead-only. Nothing was written to the legacy database.\n");
}

main()
  .catch((e) => {
    console.error("FATAL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closeLegacy);
