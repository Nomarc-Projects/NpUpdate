import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { NomarcAvatar } from "@/components/ui/avatar";

/**
 * Standard admin screen header — title + subtitle at left, admin's own
 * avatar at right. Every admin-dashboard screenshot has this band; fetches
 * its own session so call sites stay a one-liner.
 */
export async function AdminPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { name?: string; image?: string } | undefined;

  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">{title}</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">{subtitle}</p>
      </div>
      <NomarcAvatar name={user?.name} src={user?.image} size="md" className="flex-shrink-0" />
    </div>
  );
}
