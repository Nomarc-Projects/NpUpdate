import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  profile, workExperience, education, profileSkill, service,
  company, product, companyCertification, job, employerProfile,
  certification,
} from "@/lib/db/schema";

/* ── The single definition of "how complete is this profile" ─────────────
 *
 * There were two, and both rendered on screen at the same time disagreeing with
 * each other: computeCompleteness() in ./profile.ts scored nine checks and drove
 * the "Profile Complete 56%" tile, while getOnboardingChecklist() in
 * ./onboarding.ts scored six items and drove the "Your profile is 50% complete!"
 * panel directly beneath it. Both were internally correct, which is what made it
 * confusing rather than obviously broken.
 *
 * This module is now the only answer. It lives outside both "use server" files
 * so either can import it (a "use server" module may only export async
 * functions, so shared helpers cannot live in one), and `server-only` keeps it
 * off the client.
 */

/** Tabs on /dashboard/profile. Items carrying one can be reached without navigating. */
export type ProfileTab = "public" | "qualifications" | "education";

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  /** Excluded from the percentage. Present so it can still be suggested. */
  optional?: boolean;
  /** Set when the fix lives on a profile tab, so the UI can switch in place. */
  tab?: ProfileTab;
};

/**
 * Percentage complete, ignoring optional items entirely.
 *
 * "Publish a service (optional)" used to sit in the denominator, so a member who
 * had finished everything that was actually required still read as 83%, and the
 * only way to reach 100% was to do the thing labelled optional.
 */
export function checklistPercent(items: ChecklistItem[]): number {
  const required = items.filter((i) => !i.optional);
  if (required.length === 0) return 100;
  const done = required.filter((i) => i.done).length;
  return Math.round((done / required.length) * 100);
}

/** Items still outstanding, optional ones last so the required work reads first. */
export function outstandingItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((i) => !i.done).sort((a, b) => Number(!!a.optional) - Number(!!b.optional));
}

/**
 * The professional/default profile checklist.
 *
 * Labels are imperative ("Add a profile photo") because they are shown both as a
 * checklist and as a list of what is left to do, and every item carries an href
 * so "what's missing" can always be acted on rather than merely reported.
 */
export async function professionalChecklist(uid: string): Promise<ChecklistItem[]> {
  const [[p], [ex], [sk], [ed], [sv]] = await Promise.all([
    db.select().from(profile).where(eq(profile.userId, uid)).limit(1),
    db.select({ v: count() }).from(workExperience).where(eq(workExperience.userId, uid)),
    db.select({ v: count() }).from(profileSkill).where(eq(profileSkill.userId, uid)),
    db.select({ v: count() }).from(education).where(eq(education.userId, uid)),
    db.select({ v: count() }).from(service).where(eq(service.userId, uid)),
  ]);

  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  // Education is only a requirement for members practising as a company.
  const educationRequired = p?.practiceStatus === "company";

  return [
    { key: "photo", label: "Add a profile photo", done: filled(p?.avatarUrl), href: "/dashboard/profile", tab: "public" },
    { key: "headline", label: "Add your occupation", done: filled(p?.headline), href: "/dashboard/profile", tab: "public" },
    { key: "bio", label: "Add a short bio", done: filled(p?.bio), href: "/dashboard/profile", tab: "public", optional: true },
    { key: "location", label: "Add your location", done: filled(p?.location), href: "/dashboard/profile", tab: "public" },
    { key: "experience", label: "Add work experience", done: (ex?.v ?? 0) > 0, href: "/dashboard/profile?tab=qualifications", tab: "qualifications" },
    { key: "skills", label: "Add at least 3 skills", done: (sk?.v ?? 0) >= 3, href: "/dashboard/profile?tab=qualifications", tab: "qualifications" },
    { key: "education", label: "Add your education", done: (ed?.v ?? 0) > 0, href: "/dashboard/profile?tab=education", tab: "education", optional: !educationRequired },
    // Off-page and genuinely optional, so it neither carries a tab nor counts.
    { key: "service", label: "Publish a service", done: (sv?.v ?? 0) > 0, href: "/dashboard/services", optional: true },
  ];
}

/**
 * Tier 1 = every REQUIRED item on the professional checklist is done.
 *
 * This is the bar for applying to a job. Onboarding deliberately does not
 * enforce it — a new professional is asked for a headline and a quiz, and the
 * tiers are shown as skippable — so the requirement lands here instead, which
 * is what the onboarding wizard already promises ("completing your Tier 1
 * profile basics clears the way").
 *
 * Reads `professionalChecklist` directly rather than going through
 * getOnboardingChecklist(), which resolves against the viewer's ACTIVE role: a
 * user holding both professional and employer would otherwise be judged on
 * whichever hat they happen to be wearing.
 */
export async function meetsTier1(uid: string): Promise<boolean> {
  const items = await professionalChecklist(uid);
  return items.every((i) => i.optional || i.done);
}

/**
 * Checks whether every field required by the professional onboarding form is
 * actually filled. Mirrors the validation in `ProfessionalOnboarding` (all-
 * fields-required gate).
 *
 * Fields checked:
 *   headline, availability, practiceStatus (+ conditional: licenseNumber /
 *   registrationNumber / practiceCompanyName+RegNumber+Address), location,
 *   ≥1 skill, ≥1 certification (registered/licensed only), ≥1 experience,
 *   ≥1 education (only for "company" practice status).
 */
export async function professionalOnboardingComplete(uid: string): Promise<boolean> {
  const [[p], [sk], [ce], [ex], [ed]] = await Promise.all([
    db.select().from(profile).where(eq(profile.userId, uid)).limit(1),
    db.select({ v: count() }).from(profileSkill).where(eq(profileSkill.userId, uid)),
    db.select({ v: count() }).from(certification).where(eq(certification.userId, uid)),
    db.select({ v: count() }).from(workExperience).where(eq(workExperience.userId, uid)),
    db.select({ v: count() }).from(education).where(eq(education.userId, uid)),
  ]);
  if (!p) return false;
  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  if (!filled(p.headline) || !filled(p.availability) || !filled(p.location)) return false;
  if (!filled(p.practiceStatus)) return false;
  if (p.practiceStatus === "licensed" && !filled(p.licenseNumber)) return false;
  if (p.practiceStatus === "registered" && !filled(p.registrationNumber)) return false;
  if (p.practiceStatus === "company") {
    if (!filled(p.practiceCompanyName) || !filled(p.practiceRegNumber) || !filled(p.practiceCompanyAddress)) return false;
  }
  if ((sk?.v ?? 0) < 1) return false;
  // Certifications only apply to registered or licensed professionals.
  if ((p.practiceStatus === "licensed" || p.practiceStatus === "registered") && (ce?.v ?? 0) < 1) return false;
  if ((ex?.v ?? 0) < 1) return false;
  // Education is only required when practising as a company.
  if (p.practiceStatus === "company" && (ed?.v ?? 0) < 1) return false;
  return true;
}

/** The required Tier 1 items still outstanding — drives the locked-state copy. */
export async function outstandingTier1(uid: string): Promise<ChecklistItem[]> {
  const items = await professionalChecklist(uid);
  return items.filter((i) => !i.optional && !i.done);
}

/* ── The other two roles get their own checklists ────────────────────────
 *
 * They previously did not. getOnboardingChecklist special-cased `exhibitor` and
 * `buyer` and sent everything else — including employers — down the professional
 * branch. Since FeatureGate resolves its unlock from that checklist's `headline`
 * item, an employer with a complete company profile was told to add an
 * occupation and bio before they could open their own messages, and their
 * profile card read "0% complete" against a list of professional tasks they had
 * no reason to do.
 *
 * `key` values are shared across roles on purpose: FeatureGate looks up
 * "headline" for basicProfile, so each role needs an item under that key
 * describing whatever *its* equivalent of "you have an identity" is.
 */

/** Employer: a business identity plus a way to be contacted. */
export async function employerChecklist(uid: string): Promise<ChecklistItem[]> {
  const [[e], [c], [jc]] = await Promise.all([
    db.select().from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1),
    db.select().from(company).where(eq(company.ownerUserId, uid)).limit(1),
    db.select({ v: count() }).from(job).where(eq(job.ownerUserId, uid)),
  ]);
  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  // Hiring under an existing exhibitor company is a valid shape, so either the
  // freestanding employer profile or the linked company can satisfy identity.
  const name = filled(e?.name) || filled(c?.name);
  const about = filled(e?.about) || filled(c?.about);
  const logo = filled(e?.avatarUrl) || filled(c?.avatarUrl);

  return [
    { key: "headline", label: "Add your company name", done: name, href: "/dashboard/settings/account?tab=company" },
    { key: "about", label: "Describe your company", done: about, href: "/dashboard/settings/account?tab=company" },
    { key: "logo", label: "Upload a company logo", done: logo, href: "/dashboard/settings/account?tab=company" },
    { key: "phone", label: "Verify your phone number", done: !!e?.phoneVerified, href: "/dashboard/settings/account?tab=info" },
    { key: "job", label: "Post your first job", done: (jc?.v ?? 0) > 0, href: "/dashboard/jobs/post", optional: true },
  ];
}

/** Exhibitor: a storefront someone could actually buy from. */
export async function exhibitorChecklist(uid: string): Promise<ChecklistItem[]> {
  const [c] = await db.select().from(company).where(eq(company.ownerUserId, uid)).limit(1);
  // A missing company means zero of everything; skip the counts rather than
  // querying against a sentinel id.
  const [[pc], [cc]] = c
    ? await Promise.all([
        db.select({ v: count() }).from(product).where(eq(product.companyId, c.id)),
        db.select({ v: count() }).from(companyCertification).where(eq(companyCertification.companyId, c.id)),
      ])
    : [[{ v: 0 }], [{ v: 0 }]];

  return [
    { key: "headline", label: "Add your company profile", done: !!c?.about && !!c?.industry, href: "/dashboard/company" },
    { key: "logo", label: "Upload a company logo", done: !!c?.avatarUrl, href: "/dashboard/company" },
    { key: "product", label: "List your first product", done: (pc?.v ?? 0) > 0, href: "/dashboard/add-product" },
    { key: "cert", label: "Add a certification (CAC, ISO…)", done: (cc?.v ?? 0) > 0, href: "/dashboard/company?tab=credentials" },
    { key: "verify", label: "Get verified", done: !!c?.verified, href: "/dashboard/company", optional: true },
  ];
}

/** Base user with no role yet: enough identity to talk to people. */
export async function clientChecklist(uid: string): Promise<ChecklistItem[]> {
  const [p] = await db.select().from(profile).where(eq(profile.userId, uid)).limit(1);
  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  return [
    { key: "headline", label: "Add your name and a short bio", done: filled(p?.bio), href: "/dashboard/profile", tab: "public" },
    { key: "photo", label: "Add a profile photo", done: filled(p?.avatarUrl), href: "/dashboard/profile", tab: "public" },
  ];
}

export type ChecklistRole = "professional" | "employer" | "exhibitor" | "client";

/** Titles are the role's own framing, not a generic "complete your profile". */
const TITLES: Record<ChecklistRole, string> = {
  professional: "Complete your profile",
  employer: "Set up your hiring profile",
  exhibitor: "Set up your storefront",
  client: "Get started",
};

/** The checklist for one role. Callers pass the ACTIVE role. */
export async function checklistFor(uid: string, role: ChecklistRole): Promise<{ items: ChecklistItem[]; title: string }> {
  const items =
    role === "employer" ? await employerChecklist(uid)
    : role === "exhibitor" ? await exhibitorChecklist(uid)
    : role === "client" ? await clientChecklist(uid)
    : await professionalChecklist(uid);
  return { items, title: TITLES[role] };
}

/** Narrows any role string to one that has a checklist. */
export function toChecklistRole(role: string | null | undefined): ChecklistRole {
  return role === "employer" || role === "exhibitor" || role === "professional" ? role : "client";
}
