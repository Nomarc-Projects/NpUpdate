"use client";

import { setKeyPlayers } from "@/lib/services/platform-settings";
import type { KeyPlayersSetting } from "@/lib/services/platform-settings-shared";
import { LogoStripView, type LogoStripCopy } from "./logo-strip-view";

/** Wording for the Key Players strip. Shared with Trusted Clients only in
 *  structure — each strip passes its own copy. */
const COPY: LogoStripCopy = {
  title: "Key Players marquee on the homepage",
  shownHint:
    "Visible to all visitors on /. The heading and the company cards below are what they see.",
  hiddenHint:
    "Hidden. The rest of the homepage renders as normal; only this strip is tucked away.",
  toggleLabel: (enabled) => (enabled ? "Hide the Key Players strip" : "Show the Key Players strip"),
  showMessage: "Section shown on the homepage",
  hideMessage: "Section hidden from the homepage",
  headingPlaceholder: "Key Players and Fastest Growing Companies in the Industry",
  namePlaceholder: "e.g. MC&T — Migliore Construzione & Tecniche",
  emptyImageHint: "No image set — upload one to show this company's mark.",
};

export function KeyPlayersView({ current }: { current: KeyPlayersSetting }) {
  return <LogoStripView current={current} save={setKeyPlayers} copy={COPY} />;
}
