import type { Locale, Options } from "react-joyride";

/**
 * Nomarc brand theme for react-joyride.
 *
 * The tooltip itself is a custom component (`tour-tooltip.tsx`) styled with the
 * usual Tailwind tokens, so the only thing left for joyride to theme is the
 * chrome around it: the overlay, the spotlight cutout and the arrow. Those are
 * applied by joyride as *inline* styles, which can't carry a `dark:` variant —
 * so they read CSS custom properties instead, and `TOUR_THEME_CSS` below flips
 * those properties under Nomarc's `.dark` class strategy.
 *
 * `zIndex` is raised to 10000 so the spotlight/tooltip sit above the dashboard's
 * mobile header (z-40), the sticky top bar (z-30) and the messages FAB (z-30).
 */
export const LOCALE: Locale = {
  back: "Back",
  close: "Close",
  last: "Done",
  next: "Next",
  skip: "Skip tour",
};

/**
 * Injected once by the provider. Nomarc uses next-themes with the `class`
 * strategy (`@custom-variant dark (&:is(.dark *))` in globals.css), so `.dark`
 * on <html> is the switch.
 *
 * Surface `#ffffff` / `#1e1e1e` and ink `#1e1e1e` / `#ffffff` mirror the card
 * tokens used across the dashboard, so the tooltip arrow always matches the
 * tooltip body it points out of.
 */
export const TOUR_THEME_CSS = `
:root {
  --nm-tour-surface: #ffffff;
  --nm-tour-ink: #1e1e1e;
  --nm-tour-overlay: rgba(30, 30, 30, 0.55);
}
.dark {
  --nm-tour-surface: #1e1e1e;
  --nm-tour-ink: #ffffff;
  --nm-tour-overlay: rgba(0, 0, 0, 0.7);
}
`;

export const BRAND_OPTIONS: Partial<Options> = {
  skipBeacon: true,
  zIndex: 10000,
  buttons: ["back", "skip", "primary"],
  // Nomarc yellow. Only reaches joyride's own chrome — the custom tooltip
  // paints its buttons with ink-on-yellow (white on yellow is unreadable).
  primaryColor: "#ffd716",
  textColor: "var(--nm-tour-ink, #1e1e1e)",
  backgroundColor: "var(--nm-tour-surface, #ffffff)",
  arrowColor: "var(--nm-tour-surface, #ffffff)",
  overlayColor: "var(--nm-tour-overlay, rgba(30, 30, 30, 0.55))",
  // Matches the dashboard's `rounded-2xl` card language.
  spotlightRadius: 16,
  // Interactive steps need clicks to reach the real UI through the cutout.
  blockTargetInteraction: false,
  // A stray overlay click shouldn't silently skip a step — the tooltip's own
  // Back / Skip / Next buttons are the only way through.
  overlayClickAction: false,
  // The custom tooltip draws its own progress rail and "Step N of M" line.
  showProgress: false,
};
