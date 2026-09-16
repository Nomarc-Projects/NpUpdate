"use server";

import { requireUserId } from "@/lib/server-user";
import { getViewer } from "@/lib/viewer-server";
import {
  checklistFor,
  checklistPercent,
  toChecklistRole,
  type ChecklistItem,
} from "@/lib/services/profile-checklist";

/** Re-exported so existing importers keep working; defined in ./profile-checklist. */
export type { ChecklistItem } from "@/lib/services/profile-checklist";
export type OnboardingChecklist = { role: string; title: string; subtitle: string; items: ChecklistItem[]; percent: number };

/**
 * The active role's setup checklist.
 *
 * Two things changed here. It used to branch on `session.user.role` — the legacy
 * scalar — so switching roles left the checklist behind; it now follows the
 * viewer's ACTIVE role. And it used to special-case only `exhibitor` and
 * `buyer`, dropping employers into the professional branch, which is why an
 * onboarded employer was told to add an occupation, skills and education. Each
 * role now has its own list in ./profile-checklist.
 */
export async function getOnboardingChecklist(): Promise<OnboardingChecklist> {
  const [uid, viewer] = await Promise.all([requireUserId(), getViewer()]);
  const role = toChecklistRole(viewer.activeRole);
  const { items, title } = await checklistFor(uid, role);

  return {
    role,
    title,
    subtitle: "Finish setting up to get the most out of Nomarc.",
    items,
    percent: checklistPercent(items),
  };
}
