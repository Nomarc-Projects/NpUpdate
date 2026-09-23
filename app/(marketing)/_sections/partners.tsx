import { partners, type Logo } from "./logo-marquee";
import { LogoMarqueeWithModal } from "./logo-modal";
import { getKeyPlayers } from "@/lib/services/platform-settings-read";
import { KEY_PLAYERS_DEFAULT } from "@/lib/services/platform-settings-shared";

/** Normalize a company name for dedupe ("DanBran Projects Limited" == "DanBran Projects"). */
function companyKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(limited|ltd)$/, "");
}

/** "Trusted Clients" — final section before the footer. */
export async function PartnersSection() {
  // Every Key Player is also a trusted client, so merge the Key Players strip
  // into this marquee (Nomadic Architects stays delisted everywhere).
  const setting = await getKeyPlayers().catch(() => KEY_PLAYERS_DEFAULT);
  const keyPlayers: Logo[] = setting.logos
    .filter((l) => !/nomad|nomard/i.test(l.name))
    .map((l) => ({ name: l.name, src: l.src, href: l.href || undefined }));

  const seen = new Set(partners.map((p) => companyKey(p.name)));
  const merged: Logo[] = [...partners];
  for (const kp of keyPlayers) {
    if (!kp.src) continue;
    if (seen.has(companyKey(kp.name))) continue;
    seen.add(companyKey(kp.name));
    merged.push(kp);
  }

  return (
    <section className="bg-white dark:bg-[#111] pt-4 pb-16">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[10px] font-semibold text-[#898989] uppercase tracking-[0.22em] mb-6">
          Trusted Clients
        </p>
        <LogoMarqueeWithModal logos={merged} badge="Trusted Client" />
      </div>
    </section>
  );
}
