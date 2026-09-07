"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile, profileSkill, certification, workExperience, education } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { grantRole } from "@/lib/roles-internal";
import {
  professionalChecklist,
  checklistPercent,
  outstandingItems,
  type ChecklistItem,
} from "@/lib/services/profile-checklist";

/** intern | graduate | consultant | licensed | company */
export type PracticeStatus = "" | "intern" | "graduate" | "consultant" | "licensed" | "company";

export type ProfileData = {
  name: string;
  phone: string;
  headline: string;
  location: string;
  availability: string;
  bio: string;
  avatarUrl: string;
  practiceStatus: PracticeStatus;
  licenseNumber: string;
  practiceCompanyName: string;
  practiceRegNumber: string;
  practiceCompanyAddress: string;
  practiceCompanyBio: string;
  /** "professional" | "non_professional" — kind selected in "Set up as a
   *  company" (drizzle/0049). */
  companyKind: string;
  completeness: number;
  verified: boolean;
};

/* computeCompleteness() lived here and scored nine checks, while
 * getOnboardingChecklist() scored six; the two rendered side by side on the
 * dashboard showing 56% and 50% at the same moment. Both now defer to
 * ./profile-checklist, which is the only definition. */

/**
 * `missing` carries whole checklist items, not labels.
 *
 * It used to be `string[]`, which is why the profile page could only print
 * "Add: Profile photo, Bio, Work experience, At least 3 skills…" and truncate.
 * With the href and tab attached, every outstanding item becomes something the
 * member can click straight through to.
 */
export async function getMyProfile(): Promise<{ data: ProfileData; missing: ChecklistItem[] }> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const [p] = await db.select().from(profile).where(eq(profile.userId, uid)).limit(1);
  const items = await professionalChecklist(uid);
  const c = { percent: checklistPercent(items), missing: outstandingItems(items) };
  return {
    data: {
      name: session?.user?.name ?? "",
      phone: p?.phone ?? "",
      headline: p?.headline ?? "",
      location: p?.location ?? "",
      availability: p?.availability ?? "",
      bio: p?.bio ?? "",
      avatarUrl: p?.avatarUrl ?? "",
      practiceStatus: (p?.practiceStatus ?? "") as PracticeStatus,
      licenseNumber: p?.licenseNumber ?? "",
      practiceCompanyName: p?.practiceCompanyName ?? "",
      practiceRegNumber: p?.practiceRegNumber ?? "",
      practiceCompanyAddress: p?.practiceCompanyAddress ?? "",
      practiceCompanyBio: p?.practiceCompanyBio ?? "",
      companyKind: p?.companyKind ?? "",
      completeness: c.percent,
      verified: p?.verified ?? false,
    },
    missing: c.missing,
  };
}

/**
 * Persist the phone + location collected on the signup form.
 *
 * Separate from `saveProfile` because that one never touches `phone`: changing
 * a phone elsewhere has to drop the verified badge (see `phone-verify.ts`),
 * whereas here the profile is brand new and nothing is verified yet. Writes
 * `phoneVerified: false` explicitly so a signup can never mint a trusted
 * number.
 */
export async function saveSignupDetails(input: { phone?: string; location?: string }) {
  const uid = await requireUserId();
  const phone = input.phone?.trim() || null;
  const location = input.location?.trim() || null;
  if (!phone && !location) return;

  const [existing] = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, uid)).limit(1);
  if (existing) {
    await db.update(profile).set({ phone, location, phoneVerified: false, updatedAt: new Date() }).where(eq(profile.userId, uid));
  } else {
    await db.insert(profile).values({ userId: uid, phone, location, phoneVerified: false });
  }
}

export async function saveProfile(input: {
  name?: string; phone?: string; headline?: string; location?: string; availability?: string; bio?: string; avatarUrl?: string;
  practiceLicenceStatus?: string;
  practiceStatus?: PracticeStatus;
  licenseNumber?: string; practiceCompanyName?: string; practiceRegNumber?: string;
  practiceCompanyAddress?: string; practiceCompanyBio?: string;
  companyKind?: string;
  registrationNumber?: string;
}) {
  const uid = await requireUserId();
  // Fields belonging to a status the user is no longer on are cleared rather
  // than left behind — otherwise switching Licensed → Company keeps a stale
  // licence number that the form no longer shows and nobody can remove.
  const status = input.practiceStatus;
  const licensed = status === undefined || status === "licensed";
  const isCompany = status === undefined || status === "company";
  const [existing] = await db.select({ id: profile.id, phone: profile.phone, phoneVerified: profile.phoneVerified }).from(profile).where(eq(profile.userId, uid)).limit(1);
  // Editing the phone here (outside the OTP "Verify Number" flow) resets the
  // verified flag only when the value actually changed, matching the "Edit
  // Phone Number" warning's promise — a changed number loses its Tier 1 badge
  // until re-verified.
  const phoneChanged = input.phone !== undefined && (existing?.phone ?? "") !== (input.phone || "");
  // A blank location is persisted as empty (never garbage): account settings
  // and onboarding only ever write the profile location from user-entered
  // parts, so when nothing was typed it must store `null`, not some stale or
  // legacy string. `undefined` still means "leave untouched" (drizzle skips it).
  const fields = {
    headline: input.headline, location: typeof input.location === "string" ? (input.location.trim() || null) : input.location, availability: input.availability,
    bio: input.bio, avatarUrl: input.avatarUrl,
    ...(input.phone !== undefined
      ? { phone: input.phone || null, phoneVerified: phoneChanged ? false : !!existing?.phoneVerified }
      : {}),
    ...(input.practiceLicenceStatus !== undefined ? { practiceLicenceStatus: input.practiceLicenceStatus || null } : {}),
    ...(input.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber || null } : {}),
    ...(status !== undefined ? { practiceStatus: status || null } : {}),
    ...(input.licenseNumber !== undefined || status !== undefined ? { licenseNumber: licensed ? (input.licenseNumber ?? null) : null } : {}),
    ...(input.practiceCompanyName !== undefined || status !== undefined ? { practiceCompanyName: isCompany ? (input.practiceCompanyName ?? null) : null } : {}),
    ...(input.practiceRegNumber !== undefined || status !== undefined ? { practiceRegNumber: isCompany ? (input.practiceRegNumber ?? null) : null } : {}),
    ...(input.practiceCompanyAddress !== undefined || status !== undefined ? { practiceCompanyAddress: isCompany ? (input.practiceCompanyAddress ?? null) : null } : {}),
    ...(input.practiceCompanyBio !== undefined || status !== undefined ? { practiceCompanyBio: isCompany ? (input.practiceCompanyBio ?? null) : null } : {}),
    ...(input.companyKind !== undefined ? { companyKind: input.companyKind || null } : {}),
  };
  if (existing) await db.update(profile).set({ ...fields, updatedAt: new Date() }).where(eq(profile.userId, uid));
  else await db.insert(profile).values({ userId: uid, ...fields });
  // Mirror name + avatar onto the Better Auth user so the session (and every
  // navbar/sidebar that reads it) stays consistent with the uploaded avatar.
  const userPatch: { name?: string; image?: string } = {};
  if (input.name) userPatch.name = input.name;
  if (input.avatarUrl !== undefined) userPatch.image = input.avatarUrl || "";
  if (Object.keys(userPatch).length) {
    try { await auth.api.updateUser({ body: userPatch, headers: await headers() }); } catch { /* best-effort */ }
  }
  // Note: completing this form no longer grants the professional role by
  // itself — passing the aptitude quiz does (lib/services/quiz.ts).
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}

/**
 * Lightweight read of the saved location (the "Country / State / LGA / Address"
 * captured on the basic profile) so the find-work onboarding can reuse it
 * instead of asking for it again. Returns "" when there's no profile row yet.
 */
export async function getSavedLocation(): Promise<string> {
  try {
    const uid = await requireUserId();
    const [p] = await db.select({ location: profile.location }).from(profile).where(eq(profile.userId, uid)).limit(1);
    return p?.location ?? "";
  } catch {
    return "";
  }
}

/**
 * Find-work onboarding submit: saves the professional identity fields,
 * the LinkedIn-style professional profile blocks (qualifications, work
 * experience, education) AND grants the professional role in one action —
 * the flow that replaced the aptitude quiz on /dashboard/jobs. Requiring a
 * headline here keeps the form honest; "open_to_work" is what flips the
 * profile tabs to professional.
 */
export async function completeProfessionalOnboarding(input: {
  headline: string;
  bio?: string;
  location?: string;
  availability: string;
  practiceStatus?: PracticeStatus;
  practiceLicenceStatus?: string;
  licenseNumber?: string;
  registrationNumber?: string;
  practiceCompanyName?: string;
  practiceRegNumber?: string;
  practiceCompanyAddress?: string;
  /** "professional" | "non_professional" — defaults to "professional". */
  companyKind?: "professional" | "non_professional";
  skills?: string[];
  certifications?: { name: string; issuer?: string; year?: number }[];
  experience?: { title: string; company: string; description?: string; location?: string; workplaceType?: string; startDate?: string; endDate?: string; current?: boolean }[];
  education?: { school: string; degree?: string; field?: string; startYear?: number; endYear?: number; current?: boolean; description?: string }[];
}) {
  const uid = await requireUserId();
  if (!input.headline.trim()) throw new Error("Job title is required.");
  await saveProfile({
    headline: input.headline.trim(),
    bio: input.bio ?? "",
    location: input.location ?? "",
    availability: input.availability,
    // `practiceStatus` (drives the Individual/Company filter on Find
    // Professionals) is set explicitly by the caller — ordinarily the company
    // setup flow passes "company". practiceLicenceStatus stays for the legacy
    // fine-grained licensing state.
    ...(input.practiceStatus !== undefined ? { practiceStatus: input.practiceStatus } : {}),
    practiceLicenceStatus: input.practiceLicenceStatus ?? "",
    ...(input.practiceLicenceStatus === "company" ? { practiceStatus: "company" as PracticeStatus } : {}),
    ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber || undefined } : {}),
    ...(input.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber || undefined } : {}),
    ...(input.practiceCompanyName !== undefined ? { practiceCompanyName: input.practiceCompanyName || undefined } : {}),
    ...(input.practiceRegNumber !== undefined ? { practiceRegNumber: input.practiceRegNumber || undefined } : {}),
    ...(input.practiceCompanyAddress !== undefined ? { practiceCompanyAddress: input.practiceCompanyAddress || undefined } : {}),
    companyKind: input.companyKind ?? "professional",
  });

  const skillRows = (input.skills ?? []).filter((s) => s.trim()).map((s) => ({ userId: uid, name: s.trim(), kind: "skill" }));
  if (skillRows.length) await db.insert(profileSkill).values(skillRows).onConflictDoNothing().catch(() => {});

  const certRows = (input.certifications ?? []).filter((c) => c.name.trim()).map((c) => ({
    userId: uid, name: c.name.trim(), issuer: c.issuer?.trim() || null, year: c.year ?? null,
  }));
  if (certRows.length) await db.insert(certification).values(certRows).catch(() => {});

  // The onboarding collects work dates as year-only strings (e.g. "2020"), but
  // `work_experience.start_date/end_date` are `date` columns, which CockroachDB
  // rejects if they lack a full YYYY-MM-DD. Normalise a bare year to Jan 1 of
  // that year so the insert doesn't throw (and then get swallowed by the catch
  // below, silently dropping the experience from the Qualifications tab).
  const fullDate = (y?: string) => (y && /^\d{4}$/.test(y) ? `${y}-01-01` : y || null);
  const expRows = (input.experience ?? []).filter((x) => x.title.trim() && x.company.trim()).map((x) => ({
    userId: uid, title: x.title.trim(), company: x.company.trim(), description: x.description?.trim() || null,
    location: x.location?.trim() || null, workplaceType: x.workplaceType?.trim() || null,
    startDate: fullDate(x.startDate), endDate: x.current ? null : fullDate(x.endDate), current: !!x.current,
  }));
  if (expRows.length) await db.insert(workExperience).values(expRows).catch(() => {});

  const eduRows = (input.education ?? []).filter((e) => e.school.trim()).map((e) => ({
    userId: uid, school: e.school.trim(), degree: e.degree?.trim() || null, field: e.field?.trim() || null,
    startYear: e.startYear ?? null, endYear: e.current ? null : e.endYear ?? null, current: !!e.current,
    description: e.description?.trim() || null,
  }));
  if (eduRows.length) await db.insert(education).values(eduRows).catch(() => {});

  await grantRole(uid, "professional", "self_serve_tier1");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
}
