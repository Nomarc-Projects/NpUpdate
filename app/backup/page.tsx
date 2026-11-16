import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { backupMeta } from "@/lib/db/backup";
import { BackupLogin } from "./login-form";
import { BackupConsole } from "./backup-console";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * Super-admin backup console. Not linked anywhere in the UI and excluded from
 * sitemap/robots; the gate is the live Better Auth session's `role`, checked
 * here on the server (the API route re-checks independently).
 */
export default async function BackupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { role?: string } | undefined;

  let body: React.ReactNode;
  if (!user) {
    body = <BackupLogin />;
  } else if (user.role !== "super_admin") {
    body = (
      <div className="w-full max-w-[420px] rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <h1 className="text-[18px] font-bold text-white">Not authorized</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
          You are signed in as <span className="font-semibold text-white/80">{(session?.user as { email?: string }).email}</span>,
          but this console is restricted to accounts with the{" "}
          <code className="text-white/70">super_admin</code> role.
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">
          If this account should have access, promote it from the app repo:{" "}
          <code className="text-white/60">node scripts/make-super-admin.cjs</code>.
        </p>
      </div>
    );
  } else {
    const meta = await backupMeta();
    body = <BackupConsole meta={meta} />;
  }

  return (
    <main
      className="grid min-h-screen place-items-center bg-[#141414] px-4 py-16"
      style={{ ["--background" as string]: "#141414" }}
    >
      {body}
    </main>
  );
}
