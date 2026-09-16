import { LogoMarquee, type Logo } from "./logo-marquee";

// NOTE: the Figma trusted-by strip shows a 6th logo (CEA) with no matching
// asset in public/logos/partners/ — still outstanding; the CEP mark below was
// supplied separately and keyed off its scanned page background.
// Each mark links to whatever that company actually publishes as its own front
// door — a website where one exists, otherwise the profile they gave us. Several
// of these firms have no site, which is a large part of why the platform exists.
const keyPlayers: Logo[] = [
  { name: "MC&T — Migliore Construzione & Tecniche", src: "/logos/partners/mct.png", href: "https://mcandt.com.ng/" },
  { name: "The Building Practice", src: "/logos/partners/building-practice.png", href: "https://www.instagram.com/thebuildingpractice" },
  { name: "CEP — Construction Economists Partnership Limited", src: "/logos/partners/cep.png", href: "https://www.linkedin.com/company/construction-economists-partnership-limited-cep-/" },
  { name: "DanBran Projects Limited", src: "/logos/partners/danbran-projects.png", href: "https://danbranprojectsltd.com/danbran12dx/" },
  { name: "Nomadic Architects", src: "/logos/partners/nomadic-architects.png", href: "https://nomarcprojects.com" },
  { name: "Tivisto", src: "/logos/partners/tivisto.png", href: "https://drive.google.com/file/d/19crZRwag_msXnClaN8VGW8q71iMOjKy1/view" },
];

/** "Trusted by" strip — looping marquee, hairline dividers above/below. */
export function TrustedByStrip() {
  return (
    <section className="bg-white dark:bg-[#111] pt-10">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[10px] font-semibold text-[#898989] uppercase tracking-[0.22em] mb-6">
          Key Players and Fastest Growing Companies in the Industry
        </p>
        <div className="border-t border-[#ececec] dark:border-white/10" />
        <div className="py-7 sm:py-8">
          <LogoMarquee logos={keyPlayers} />
        </div>
        <div className="border-b border-[#ececec] dark:border-white/10" />
      </div>
    </section>
  );
}
