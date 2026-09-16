import type { BeforeHook, Step, TourData } from "react-joyride";
import type { TourIconName } from "../tour-icon";
import type { TourStepMeta } from "../tour-meta";

/**
 * Tour vocabulary — the shapes every tour definition is built from.
 *
 * A `TourStep` is a react-joyride `Step` plus a few Nomarc-specific fields the
 * provider and tooltip understand:
 *  - `key`          stable id (debugging / React keys)
 *  - `route`        walkthrough steps on another page set this; the provider
 *                   decorates them with a `before` hook that navigates there and
 *                   waits for the target to mount
 *  - `page`         friendly page name, shown in the tooltip and used to count
 *                   "N pages to go" in walkthroughs
 *  - `optional`     dropped silently if its target isn't in the DOM
 *  - `desktopOnly`  dropped below the `lg` breakpoint (the sidebar rail is
 *                   `hidden lg:block`, so its anchors exist but are invisible)
 *  - `mobileOnly`   dropped at `lg` and up
 *  - `icon`         animated tooltip icon (see tour-icon.tsx)
 *  - `interact`     interactive stop: the user clicks the target and the tour
 *                   advances itself; the Next button still works as a fallback
 *  - `showEstimate` render the "~2 min · 8 stops" chip (intro steps only)
 *  - `before`       authored setup hook — open an accordion, switch a tab. The
 *                   provider composes it AFTER its own navigation hook, so a
 *                   step may carry both `route` and `before`.
 *
 * Copy rule (kept from the source implementation): say what is *actually* on the
 * page and what the user can do with it. No filler, no "this is the dashboard".
 *
 * Anchors are `data-tour="…"` attributes on the real components.
 */

export type TourAudience = "client" | "professional" | "exhibitor" | "employer" | "admin" | "super_admin";

export type TourKind = "page" | "welcome" | "walkthrough";

export type TourStep = Omit<Step, "data" | "before"> & {
  key: string;
  route?: string;
  page?: string;
  optional?: boolean;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
  icon?: TourIconName;
  interact?: { hint: string; clickTarget?: string };
  showEstimate?: boolean;
  /** Authored setup hook; also synthesized by the provider for `route` steps. */
  before?: BeforeHook;
  /** Added by withStepMeta at runtime; never set in the registry. */
  data?: TourStepMeta | TourData;
};

export type TourDef = {
  id: string;
  /**
   * Who this tour is for. An array lets one definition serve several audiences —
   * shared pages (profile, messages, settings) read the same for every role, and
   * admin/super_admin differ only by a couple of `optional` steps.
   */
  audience: TourAudience | TourAudience[];
  kind: TourKind;
  /** Home route for a page tour (informational; page tours match via routes.ts). */
  route?: string;
  /**
   * Candidate guard. When set, this tour only wins its route if the selector is
   * in the DOM. It's what lets one route carry two tours: `/dashboard/add-product`
   * shows the exhibitor onboarding wizard to a professional and the product form
   * to an exhibitor, and the gate tour claims the route only when the wizard is
   * actually on screen.
   */
  requires?: string;
  steps: TourStep[];
};

/** `[data-tour="name"]` — the anchor convention used across the app. */
export const anchor = (name: string) => `[data-tour="${name}"]`;

/** Does this tour serve the given audience? */
export function audienceMatches(defAudience: TourDef["audience"], audience: TourAudience): boolean {
  return Array.isArray(defAudience) ? defAudience.includes(audience) : defAudience === audience;
}

/** A full-screen, unanchored step — always present, used for intro/outro and cross-page walkthrough stops that don't need a specific target. */
export function centerStep(step: Omit<TourStep, "target" | "placement">): TourStep {
  return { target: "body", placement: "center", ...step };
}

/** A sidebar/topbar-anchored step — desktop-only since the rail collapses on mobile. */
export function navStep(
  anchorName: string,
  step: Omit<TourStep, "target" | "placement" | "desktopOnly">,
): TourStep {
  return { target: anchor(anchorName), placement: "right", desktopOnly: true, ...step };
}

/**
 * The mobile counterpart to `navStep`. Below `lg` the sidebar rail is replaced by
 * a hamburger header and a bottom nav, so every desktop nav stop needs a sibling
 * pointed at the mobile chrome — otherwise a phone welcome collapses to two steps.
 * `optional` by default because the bottom nav is `md:hidden` while the mobile
 * header is `lg:hidden`: between those breakpoints neither anchor is guaranteed.
 */
export function mobileNavStep(
  anchorName: string,
  step: Omit<TourStep, "target" | "placement" | "mobileOnly">,
): TourStep {
  return {
    target: anchor(anchorName),
    placement: "bottom",
    mobileOnly: true,
    optional: true,
    ...step,
  };
}

/** A step on a page-body anchor. `placement: "auto"` keeps narrow anchors on-screen at 360px. */
export function bodyStep(anchorName: string, step: Omit<TourStep, "target">): TourStep {
  return { target: anchor(anchorName), placement: "auto", ...step };
}
