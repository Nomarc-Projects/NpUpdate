import type { Logo } from "./logo-marquee";
import { LogoMarqueeWithModal } from "./logo-modal";
import { getTrustedClients } from "@/lib/services/platform-settings-read";
import { TRUSTED_CLIENTS_DEFAULT } from "@/lib/services/platform-settings-shared";

/** "Trusted Clients" — final section before the footer.
 *
 *  The companies, heading and on/off switch live in the `trusted_clients`
 *  platform_setting (seeded by drizzle/0062_trusted_clients_setting.sql) and
 *  are curated from /admin/platform/trusted-clients. Fail-open to the designed
 *  default so a settings read that goes wrong can never blank the section.
 *
 *  This list used to be a hardcoded array in logo-marquee.tsx, merged with the
 *  Key Players list at render time. The two are now independent: a Key Player
 *  is not auto-added here, because showing a company under one heading and not
 *  the other is an editorial choice the merge could not express. */
export async function PartnersSection() {
  const setting = await getTrustedClients().catch(() => TRUSTED_CLIENTS_DEFAULT);

  // Entries with no mark would render as an empty plate, and the strip is
  // meaningless without at least one company to show.
  const logos: Logo[] = setting.logos
    .filter((l) => l.src)
    .map((l) => ({ name: l.name, src: l.src, href: l.href || undefined }));

  // Admin can hide the strip entirely, or delete every company on it — either
  // way it renders nothing rather than an empty marquee.
  if (!setting.enabled || logos.length === 0) return null;

  return (
    <section className="bg-white dark:bg-[#111] pt-4 pb-16">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[11px] font-bold text-[#898989] uppercase tracking-[0.22em] mb-6">
          {setting.heading}
        </p>
        <LogoMarqueeWithModal logos={logos} badge="Trusted Client" />
      </div>
    </section>
  );
}
