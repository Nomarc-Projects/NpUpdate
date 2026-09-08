import { partners, LogoMarquee } from "./logo-marquee";

/** "Trusted Partners" — final section before the footer. */
export function PartnersSection() {
  return (
    <section className="bg-white dark:bg-[#111] pt-4 pb-16">
      <div className="px-6 md:px-10 lg:px-14">
        <p className="text-center text-[10px] font-semibold text-[#898989] uppercase tracking-[0.22em] mb-6">
Trusted Partners
        </p>
        <LogoMarquee logos={partners} />
      </div>
    </section>
  );
}
