import { LogoMarqueeWithModal } from "./logo-modal";
import { getKeyPlayers } from "@/lib/services/platform-settings-read";
import { KEY_PLAYERS_DEFAULT } from "@/lib/services/platform-settings-shared";

// The strip's companies, heading and on/off switch live in the `key_players`
// platform_setting (seeded by drizzle/0057_key_players_setting.sql) and are
// curated from /admin/platform/key-players. Fail-open to the designed default
// so a settings read that goes wrong can never blank the homepage section.
export async function TrustedByStrip() {
  const setting = await getKeyPlayers().catch(() => KEY_PLAYERS_DEFAULT);

  // Nomadic Architects was delisted — filter it out here too so a stored
  // setting that still contains it stops rendering immediately.
  const logos = setting.logos.filter((l) => !/nomad|nomard/i.test(l.name));

  // Admin can hide the strip entirely, or delete every company on it — either
  // way it renders nothing rather than an empty marquee.
  if (!setting.enabled || logos.length === 0) return null;

  return (
    <section className="bg-white dark:bg-[#111] pt-4 pb-16">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[10px] font-semibold text-[#898989] uppercase tracking-[0.22em] mb-6">
          {setting.heading}
        </p>
        <LogoMarqueeWithModal logos={logos} badge="Key Player" />
      </div>
    </section>
  );
}
