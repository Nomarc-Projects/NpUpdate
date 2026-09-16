/** Read-only: locate the Roles table and profile spam signals. SELECT only. */
import { legacyPool, closeLegacy } from "./legacy-db";

async function main() {
  const pool = await legacyPool();
  const q = async (label: string, query: string) => {
    console.log(`\n── ${label} ${"─".repeat(Math.max(0, 58 - label.length))}`);
    try {
      const r = await pool.request().query(query);
      if (!r.recordset?.length) return console.log("   (no rows)");
      console.table(r.recordset);
    } catch (e) {
      console.log("   ERROR:", e instanceof Error ? e.message : e);
    }
  };

  await q("Where does Roles live?", `
    SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME IN ('Roles','UserRoles','Users','WaitlistUser','TalentProfiles','SupplierProfiles')`);

  await q("Role names + counts", `
    SELECT r.Name AS role, COUNT(ur.UserId) AS n
    FROM UserMngt.Roles r LEFT JOIN UserMngt.UserRoles ur ON ur.RoleId = r.Id
    GROUP BY r.Name ORDER BY n DESC`);

  // Gmail dot-abuse: gmail ignores dots, so many dots in the local part is a
  // standard way to mint unlimited accounts from one inbox. 3+ is well past
  // anything a real person types.
  await q("Gmail dot-abuse (3+ dots in local part)", `
    SELECT COUNT(*) AS n FROM UserMngt.Users
    WHERE Email LIKE '%@gmail.com'
      AND LEN(LEFT(Email, CHARINDEX('@',Email)-1)) - LEN(REPLACE(LEFT(Email, CHARINDEX('@',Email)-1),'.','')) >= 3`);

  await q("Overlap: gibberish name AND dot-abuse", `
    SELECT COUNT(*) AS n FROM UserMngt.Users
    WHERE CHARINDEX(' ', LTRIM(RTRIM(FullName))) = 0 AND LEN(LTRIM(RTRIM(FullName))) >= 14
      AND Email LIKE '%@gmail.com'
      AND LEN(LEFT(Email, CHARINDEX('@',Email)-1)) - LEN(REPLACE(LEFT(Email, CHARINDEX('@',Email)-1),'.','')) >= 3`);

  await q("Name contains a URL or markup", `
    SELECT COUNT(*) AS n FROM UserMngt.Users
    WHERE FullName LIKE '%http%' OR FullName LIKE '%www.%' OR FullName LIKE '%<%' OR FullName LIKE '%/%'`);

  await q("Name looks like the email (false positives to KEEP)", `
    SELECT COUNT(*) AS n FROM UserMngt.Users
    WHERE LOWER(LTRIM(RTRIM(FullName))) = LOWER(LTRIM(RTRIM(Email)))
       OR LOWER(LTRIM(RTRIM(FullName))) = LOWER(LEFT(Email, CHARINDEX('@',Email)-1))`);

  await q("Suspicious names that DO have a talent profile", `
    SELECT COUNT(*) AS n
    FROM UserMngt.Users u
    WHERE CHARINDEX(' ', LTRIM(RTRIM(u.FullName))) = 0 AND LEN(LTRIM(RTRIM(u.FullName))) >= 14
      AND EXISTS (SELECT 1 FROM UserMngt.TalentProfiles t WHERE t.UserId = u.Id)`);

  await q("…and how many of those profiles have real content", `
    SELECT COUNT(*) AS n
    FROM UserMngt.Users u JOIN UserMngt.TalentProfiles t ON t.UserId = u.Id
    WHERE CHARINDEX(' ', LTRIM(RTRIM(u.FullName))) = 0 AND LEN(LTRIM(RTRIM(u.FullName))) >= 14
      AND (t.About IS NOT NULL OR t.Occupation IS NOT NULL OR t.City IS NOT NULL)`);

  await q("Rare/spammy TLDs", `
    SELECT TOP 15 RIGHT(Email, LEN(Email)-CHARINDEX('@',Email)) AS domain, COUNT(*) AS n
    FROM UserMngt.Users
    WHERE Email NOT LIKE '%@gmail.com' AND Email NOT LIKE '%@yahoo%' AND Email NOT LIKE '%@hotmail%'
      AND Email NOT LIKE '%@outlook%' AND Email NOT LIKE '%@live.%' AND Email NOT LIKE '%@icloud%'
    GROUP BY RIGHT(Email, LEN(Email)-CHARINDEX('@',Email))
    HAVING COUNT(*) >= 2 ORDER BY n DESC`);

  await q("Users with NO password hash (OAuth or never set)", `
    SELECT
      SUM(CASE WHEN PasswordHash IS NULL THEN 1 ELSE 0 END) AS no_hash,
      SUM(CASE WHEN PasswordHash IS NULL AND EXISTS (SELECT 1 FROM UserMngt.TalentProfiles t WHERE t.UserId = UserMngt.Users.Id) THEN 1 ELSE 0 END) AS no_hash_with_profile
    FROM UserMngt.Users`);

  console.log("\nRead-only. Nothing was written.\n");
}

main()
  .catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(closeLegacy);
