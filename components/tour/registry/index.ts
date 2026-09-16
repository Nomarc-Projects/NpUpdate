import type { TourDef } from "./types";
import { clientTours } from "./client";
import { professionalTours } from "./professional";
import { exhibitorTours } from "./exhibitor";
import { employerTours } from "./employer";
import { adminTours } from "./admin";
import { pageTours } from "./pages";

/**
 * The single source of truth for every guided tour.
 *
 * Each role file exports its own `*Tours` array (welcome + walkthrough);
 * `pages.ts` exports the per-route page tours; this module flattens them all
 * into the id-keyed map the provider looks up. Walkthrough/welcome defs
 * declare `audience: TourAudience | TourAudience[]` and the provider matches
 * with `audienceMatches()`.
 */
export const TOURS: Record<string, TourDef> = Object.fromEntries(
  [
    ...clientTours,
    ...professionalTours,
    ...exhibitorTours,
    ...employerTours,
    ...adminTours,
    ...pageTours,
  ].map((t) => [t.id, t]),
);

export type { TourAudience, TourStep, TourDef, TourKind } from "./types";
export { anchor, audienceMatches, centerStep, navStep, mobileNavStep, bodyStep } from "./types";
