import { LogoMarquee } from "./logo-marquee";
import { getKeyPlayers } from "@/lib/services/platform-settings-read";
import { KEY_PLAYERS_DEFAULT } from "@/lib/services/platform-settings-shared";

// The strip's companies, heading and on/off switch live in the `key_players`
// platform_setting (seeded by drizzle/0057_key_players_setting.sql) and are
// curated from /admin/platform/key-players. Fail-open to the designed default
// so a settings read that goes wrong can never blank the homepage section.
export async function TrustedByStrip() {
  const setting = await getKeyPlayers().catch(() => KEY_PLAYERS_DEFAULT);

  // Admin can hide the strip entirely, or delete every company on it — either
  // way it renders nothing rather than an empty marquee.
  if (!setting.enabled || setting.logos.length === 0) return null;

  return (
    <section className="bg-white dark:bg-[#111] pt-10">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[10px] font-semibold text-[#898989] uppercase tracking-[0.22em] mb-6">
          {setting.heading}
        </p>
        <div className="border-t border-[#ececec] dark:border-white/10" />
        <div className="py-7 sm:py-8 grid grid-cols-12">
          <div className="col-span-12 sm:col-span-12">
            <LogoMarquee logos={setting.logos} interactive />
          </div>
        </div>
        <div className="border-b border-[#ececec] dark:border-white/10" />
      </div>
    </section>
  );
}
