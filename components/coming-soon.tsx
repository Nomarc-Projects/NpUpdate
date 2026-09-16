import Link from "next/link";

/**
 * "Coming soon" screen for a section that is built but not yet open to users.
 *
 * Deliberately the same composition as app/maintenance/page.tsx — framed GIF,
 * pulsing pill, headline, subcopy, two actions — because both say the same
 * thing ("not now, come back later") and two different treatments of that would
 * read as two different kinds of problem.
 *
 * Two differences from the maintenance page, both because this renders INSIDE
 * the marketing shell rather than standalone: no logo and no theme toggle (the
 * navbar already provides both, and duplicating them looks broken), and the
 * height is measured against the viewport minus the navbar rather than the full
 * `h-svh`.
 */
export function ComingSoon({
  badge = "Coming soon",
  headline,
  message,
  primaryHref = "/",
  primaryLabel = "Back to home",
}: {
  badge?: string;
  headline: string;
  message: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-[2vh] overflow-hidden bg-[#f9f9f9] px-5 py-[4vh] text-center dark:bg-[#111] sm:px-6">
      {/* The frame stays white in BOTH themes on purpose: the source GIF is
          drawn on solid white, so a frame that went dark left a hard white
          rectangle floating inside a near-transparent box. Same reasoning as
          the maintenance page. */}
      <div className="flex min-h-0 w-full max-w-[230px] shrink items-center justify-center overflow-hidden rounded-3xl border border-[#ececec] bg-white dark:border-white/10 sm:max-w-[280px] lg:max-w-[320px]">
        {/* Animated GIF, so a plain <img>: next/image would need `unoptimized`
            to keep the animation, which buys nothing here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/maintenance.gif"
          alt=""
          aria-hidden="true"
          width={450}
          height={450}
          className="max-h-[30svh] w-full object-contain"
        />
      </div>

      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ffd716]/40 bg-[#fffdf2] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8a7400] dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.06] dark:text-[#ffd716] sm:px-3.5 sm:py-1.5 sm:text-[11.5px]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#caa400] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#caa400]" />
        </span>
        {badge}
      </span>

      <div className="shrink-0">
        <h1 className="max-w-[620px] text-[21px] font-bold leading-tight tracking-[-0.01em] text-[#1e1e1e] dark:text-white sm:text-[27px] lg:text-[30px]">
          {headline}
        </h1>
        <p className="mt-2 max-w-[520px] text-[13px] leading-snug text-[#6b6b6b] dark:text-white/60 sm:mt-3 sm:text-[14.5px] sm:leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex shrink-0 flex-row items-center justify-center gap-2.5 sm:gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] sm:px-6 sm:py-3 sm:text-[13.5px]"
        >
          {primaryLabel}
        </Link>
        {/* info@, not support@ — support@nomarcprojects.com is not a mailbox
            provisioned on the mail server, so it would hard-bounce. */}
        <a
          href="mailto:info@nomarcprojects.com"
          className="inline-flex items-center justify-center rounded-xl border border-[#e3e3e3] px-5 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white sm:px-6 sm:py-3 sm:text-[13.5px]"
        >
          Contact support
        </a>
      </div>
    </section>
  );
}
