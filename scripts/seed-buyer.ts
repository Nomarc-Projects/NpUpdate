import { sql } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";

async function main() {
  try {
    const created = await auth.api.signUpEmail({ body: { name: "Tunde Bello", email: "buyer@nomarc.test", password: "Password123!" } });
    if (created?.user?.id) {
      await db.execute(sql`UPDATE "user" SET role = 'buyer' WHERE id = ${created.user.id}`);
      console.log("✓ created buyer buyer@nomarc.test");
    }
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/exist|already|unique/i.test(m)) console.log("• exists buyer@nomarc.test");
    else console.error("✗ failed:", m);
  }
}
main();
