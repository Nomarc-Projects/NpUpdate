import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotifyForm } from "@/components/maintenance/notify-form";
import { getMaintenancePublic } from "@/lib/services/platform-settings-read";

export const metadata = {
  title: "Welcome to Nomadic Projects",
  description: "NomarcProject is currently under construction. Enter your email and we'll notify you once it's live.",
  robots: { index: false, follow: false },
};

// The headline/message are admin-editable, so this can't be prerendered.
export const dynamic = "force-dynamic";

/**
 * Scheduled-maintenance screen. No session and no dashboard chrome — it has to
 * render when the things behind it are the reason someone is seeing it. The one
 * read it does make, `getMaintenance()`, is guaranteed non-throwing: it swallows
 * its own errors and falls back to the copy below, so a database outage still
 * produces this page rather than an error boundary.
 *
 * The illustration sits in a tinted, rounded frame rather than bare on the page.
 * The source GIF is drawn on white, so on a dark background it would otherwise
 * read as a glaring white slab; the frame plus a slight dark-mode dim keeps it
 * sitting in the page instead of punching a hole through it.
 */
export default async function MaintenancePage() {
  const maintenance = await getMaintenancePublic();

  // Don't strand anyone here after the toggle goes off — a stale tab or a
  // bookmarked /maintenance should land on the live site, not on a notice about
  // maintenance that has already finished.
  if (!maintenance.enabled) redirect("/");

  return (
    /* Sized against the viewport, not stacked at fixed sizes: `h-svh` (small
       viewport height) is the height with mobile browser chrome *shown*, so the
       page can't be pushed under an address bar that appears on scroll. The
       illustration is the only elastic element — it carries `min-h-0` and a
       viewport-relative cap so it absorbs every reduction in height, letting the
       text and buttons keep their size on a short screen instead of the whole
       column overflowing. Nothing here scrolls at any breakpoint. */
    <main className="relative flex h-svh min-h-[480px] flex-col items-center justify-center gap-[2vh] overflow-hidden bg-[#f9f9f9] px-5 py-[3vh] text-center dark:bg-[#111] sm:px-6">
      {/* Absolutely positioned so it can't add height to the centred column,
          which is budgeted to the viewport. There is no navbar on this page, so
          without it a visitor is stuck in whatever theme they arrived in. */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* tone="auto" (the default) already swaps the wordmark per theme. The
          wordmark carries the brand on a page with no navbar, so it takes the
          larger size and scales down only on the narrowest phones, where the
          height budget is tight. */}
      <Link href="/" aria-label="Nomarc Projects home" className="shrink-0">
        <Logo size="md" className="scale-90 sm:scale-100 lg:scale-110" />
      </Link>

      {/* The frame stays white in BOTH themes on purpose. The source GIF is drawn
          on solid white, so a frame that went dark left a hard white rectangle
          floating inside a near-transparent box — worse than no frame at all.
          Keeping it white turns the illustration into a deliberate card, and the
          softened dark-mode border stops it glaring against the dark page. */}
      <div className="flex min-h-0 w-full max-w-[230px] shrink items-center justify-center overflow-hidden rounded-3xl border border-[#ececec] bg-white dark:border-white/10 sm:max-w-[280px] lg:max-w-[320px]">
        {/* Animated GIF, so a plain <img>: next/image would need `unoptimized`
            to keep the animation, which buys nothing here. `object-contain`
            under a max-height in svh means it scales down on short viewports
            rather than forcing the page taller. */}
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
        Under construction
      </span>

      <div className="shrink-0">
        <h1 className="max-w-[620px] text-[21px] font-bold leading-tight tracking-[-0.01em] text-[#1e1e1e] dark:text-white sm:text-[27px] lg:text-[30px]">
          Welcome to Nomadic Projects
        </h1>
        <p className="mt-2 max-w-[520px] text-[13px] leading-snug text-[#6b6b6b] dark:text-white/60 sm:mt-3 sm:text-[14.5px] sm:leading-relaxed">
          NomarcProject is currently under construction. Enter your email below so we can notify
          you once it&apos;s live.
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col items-center gap-2.5">
        <NotifyForm />
        <p className="inline-flex items-center gap-1.5 text-[11.5px] text-[#9a9a9a] sm:text-[12px]">
          <Mail size={12} /> No spam — we&apos;ll only write when we&apos;re ready.
        </p>
      </div>

      <p className="shrink-0 text-[11.5px] text-[#9a9a9a] sm:text-[12px]">
        &copy; {new Date().getFullYear()} NomarcProject by Nomadic Architect.
      </p>
    </main>
  );
}
