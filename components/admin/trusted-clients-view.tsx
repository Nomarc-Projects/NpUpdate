"use client";

import { setTrustedClients } from "@/lib/services/platform-settings";
import type { TrustedClientsSetting } from "@/lib/services/platform-settings-shared";
import { LogoStripView, type LogoStripCopy } from "./logo-strip-view";

/** Wording for the Trusted Clients strip. The two homepage logo strips are
 *  curated the same way and share LogoStripView, so this is the only place
 *  their language differs. */
const COPY: LogoStripCopy = {
  title: "Trusted Clients marquee on the homepage",
  shownHint:
    "Visible to all visitors on /, below the Key Players strip. The heading and the company cards below are what they see.",
  hiddenHint:
    "Hidden. The rest of the homepage renders as normal; only this strip is tucked away.",
  toggleLabel: (enabled) => (enabled ? "Hide the Trusted Clients strip" : "Show the Trusted Clients strip"),
  showMessage: "Section shown on the homepage",
  hideMessage: "Section hidden from the homepage",
  headingPlaceholder: "Trusted Clients",
  namePlaceholder: "e.g. FSB Real Estate",
  emptyImageHint: "No image set — upload one to show this company's mark.",
};

export function TrustedClientsView({ current }: { current: TrustedClientsSetting }) {
  return <LogoStripView current={current} save={setTrustedClients} copy={COPY} />;
}
