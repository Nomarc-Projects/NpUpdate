"use server";

import { headers } from "next/headers";
import { eq, or, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  profile, workExperience, education, profileSkill, certification, project,
  company, job, application, recommendation, savedItem, list, notification,
  employerProfile,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { auth } from "@/lib/auth";
import type { StackableRole } from "@/lib/entitlements";
import { revokeRole } from "@/lib/roles-internal";

/**
 * Load the account info fields needed by the Account Information settings tab.
 *
 * Each of the three role reads is guarded independently. A single account rarely
 * has all three rows — an employer-only account has no `company`, an
 * exhibitor-only account has no `employer_profile` — and this panel renders a
 * section per held role from one call, so one absent or drifted table must not
 * take the other two with it. Only the employer read was wrapped before.
 */
export async function getAccountInfo() {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });

  const [p] = await db.select({
    headline: profile.headline, location: profile.location, yearsExperience: profile.yearsExperience,
    phone: profile.phone, phoneVerified: profile.phoneVerified, practiceLicenceStatus: profile.practiceLicenceStatus,
  }).from(profile).where(eq(profile.userId, uid)).limit(1).catch(() => []);

  const [c] = await db.select({
    headquarters: company.headquarters, name: company.name,
    phone: company.phone, phoneVerified: company.phoneVerified, contactPerson: company.contactPerson,
    email: company.email, emailVerified: company.emailVerified,
  }).from(company).where(eq(company.ownerUserId, uid)).limit(1).catch(() => []);

  const [e] = await db.select({
    phone: employerProfile.phone, phoneVerified: employerProfile.phoneVerified, contactPerson: employerProfile.contactPerson,
    email: employerProfile.email, emailVerified: employerProfile.emailVerified,
  }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1).catch(() => []);

  return {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    headline: p?.headline ?? "",
    location: p?.location ?? "",
    yearsExperience: p?.yearsExperience ?? null,
    phone: p?.phone ?? "",
    phoneVerified: !!p?.phoneVerified,
    practiceLicenceStatus: p?.practiceLicenceStatus ?? "",
    companyName: c?.name ?? "",
    companyHq: c?.headquarters ?? "",
    exhibitor: { phone: c?.phone ?? "", phoneVerified: !!c?.phoneVerified, contactPerson: c?.contactPerson ?? "", email: c?.email ?? "", emailVerified: !!c?.emailVerified },
    employer: { phone: e?.phone ?? "", phoneVerified: !!e?.phoneVerified, contactPerson: e?.contactPerson ?? "", email: e?.email ?? "", emailVerified: !!e?.emailVerified },
  };
}

/**
 * Save the base Account Information tab (Phone Number + Full name). Editing
 * the phone number here (outside the OTP "Verify Number" flow) resets the
 * verified flag if the value actually changed, matching the "Edit Phone
 * Number" warning's promise that a changed number loses its Tier 1 badge
 * until re-verified.
 */
export async function updateBaseAccountInfo(input: { name: string; phone: string }) {
  const uid = await requireUserId();
  if (input.name) {
    await auth.api.updateUser({ body: { name: input.name }, headers: await headers() });
  }
  const [existing] = await db.select({ id: profile.id, phone: profile.phone, phoneVerified: profile.phoneVerified }).from(profile).where(eq(profile.userId, uid)).limit(1);
  const phoneChanged = (existing?.phone ?? "") !== (input.phone || "");
  const fields = { phone: input.phone || null, phoneVerified: phoneChanged ? false : !!existing?.phoneVerified, updatedAt: new Date() };
  if (existing) await db.update(profile).set(fields).where(eq(profile.userId, uid));
  else await db.insert(profile).values({ userId: uid, ...fields });
  revalidatePath("/dashboard/settings/account");
}

/** Save the Exhibitor Information accordion (Company Phone Number + Primary Contact Person). */
export async function updateExhibitorAccountInfo(input: { contactPerson: string; phone: string }) {
  const uid = await requireUserId();
  const [existing] = await db.select({ phone: company.phone, phoneVerified: company.phoneVerified }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
  const phoneChanged = (existing?.phone ?? "") !== (input.phone || "");
  await db.update(company).set({
    contactPerson: input.contactPerson || null,
    phone: input.phone || null,
    phoneVerified: phoneChanged ? false : !!existing?.phoneVerified,
    updatedAt: new Date(),
  }).where(eq(company.ownerUserId, uid));
  revalidatePath("/dashboard/settings/account");
}

/** Save the Employer Information accordion (Company Phone Number + Primary Contact Person). */
export async function updateEmployerAccountInfo(input: { contactPerson: string; phone: string }) {
  const uid = await requireUserId();
  const [existing] = await db.select({ id: employerProfile.id, phone: employerProfile.phone, phoneVerified: employerProfile.phoneVerified }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
  const phoneChanged = (existing?.phone ?? "") !== (input.phone || "");
  const fields = { contactPerson: input.contactPerson || null, phone: input.phone || null, phoneVerified: phoneChanged ? false : !!existing?.phoneVerified, updatedAt: new Date() };
  if (existing) await db.update(employerProfile).set(fields).where(eq(employerProfile.userId, uid));
  else await db.insert(employerProfile).values({ userId: uid, ...fields });
  revalidatePath("/dashboard/settings/account");
}

/**
 * Persist a newly OTP-verified Exhibitor/Employer contact email (Change
 * Email Address tab's per-role accordions — these are role-scoped contact
 * emails, distinct from the Better Auth login email that the base section
 * changes via `authClient.changeEmail`). OTP delivery/verification happens
 * client-side via `authClient.emailOtp` before either of these is called.
 */
export async function updateExhibitorEmail(email: string) {
  const uid = await requireUserId();
  await db.update(company).set({ email, emailVerified: true, updatedAt: new Date() }).where(eq(company.ownerUserId, uid));
  revalidatePath("/dashboard/settings/account");
}

export async function updateEmployerEmail(email: string) {
  const uid = await requireUserId();
  const [existing] = await db.select({ id: employerProfile.id }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
  const fields = { email, emailVerified: true, updatedAt: new Date() };
  if (existing) await db.update(employerProfile).set(fields).where(eq(employerProfile.userId, uid));
  else await db.insert(employerProfile).values({ userId: uid, ...fields });
  revalidatePath("/dashboard/settings/account");
}

/**
 * Best available avatar for the current user, resilient to the Better Auth
 * `user.image` mirror occasionally not being written: prefers `user.image`,
 * then the professional profile photo, then the company logo. Self-heals by
 * re-mirroring onto `user.image` when a fallback is found.
 */
export async function getMyAvatar(): Promise<string> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const img = (session?.user as { image?: string | null } | undefined)?.image;
  if (img) return img;

  const [p] = await db.select({ a: profile.avatarUrl }).from(profile).where(eq(profile.userId, uid)).limit(1);
  const [c] = await db.select({ a: company.avatarUrl }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
  const url = p?.a || c?.a || "";
  if (url) {
    // best-effort: keep the session source-of-truth in sync for next time
    try { await auth.api.updateUser({ body: { image: url }, headers: await headers() }); } catch { /* ignore */ }
  }
  return url;
}

/** Update the professional info tab: name → Better Auth user, headline/location → profile row. */
export async function updateProfessionalInfo(input: {
  name: string; headline: string; location: string; yearsExperience?: number | null;
}) {
  const uid = await requireUserId();
  // Update Better Auth user name
  if (input.name) {
    await auth.api.updateUser({ body: { name: input.name }, headers: await headers() });
  }
  // Upsert profile row
  const fields = { headline: input.headline || null, location: input.location || null, yearsExperience: input.yearsExperience ?? null };
  const [existing] = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, uid)).limit(1);
  if (existing) await db.update(profile).set({ ...fields, updatedAt: new Date() }).where(eq(profile.userId, uid));
  else await db.insert(profile).values({ userId: uid, ...fields });
  revalidatePath("/dashboard");
}

/** Update the exhibitor info tab: name → Better Auth, HQ → company row. */
export async function updateExhibitorInfo(input: { name: string; headquarters: string }) {
  const uid = await requireUserId();
  if (input.name) {
    await auth.api.updateUser({ body: { name: input.name }, headers: await headers() });
  }
  await db.update(company).set({ headquarters: input.headquarters || null, updatedAt: new Date() }).where(eq(company.ownerUserId, uid));
  revalidatePath("/dashboard");
}

/**
 * Permanently delete the signed-in user's account and all owned data.
 * Company/job rows cascade to their products/applications; the Better Auth
 * `user` row cascades to session/account. The client signs out afterward.
 */
export async function deleteMyAccount() {
  const uid = await requireUserId();

  await db.delete(workExperience).where(eq(workExperience.userId, uid));
  await db.delete(education).where(eq(education.userId, uid));
  await db.delete(profileSkill).where(eq(profileSkill.userId, uid));
  await db.delete(certification).where(eq(certification.userId, uid));
  await db.delete(project).where(eq(project.userId, uid));
  await db.delete(application).where(eq(application.applicantUserId, uid));
  await db.delete(recommendation).where(or(eq(recommendation.recommenderUserId, uid), eq(recommendation.recommendeeUserId, uid)));
  await db.delete(savedItem).where(eq(savedItem.userId, uid));
  await db.delete(list).where(eq(list.userId, uid));
  await db.delete(notification).where(eq(notification.userId, uid));
  await db.delete(job).where(eq(job.ownerUserId, uid));          // cascades applications
  await db.delete(company).where(eq(company.ownerUserId, uid));  // cascades products + company_certification
  await db.delete(profile).where(eq(profile.userId, uid));

  // Better Auth user row (cascades session + account)
  await db.execute(sql`DELETE FROM "user" WHERE id = ${uid}`);
}

/**
 * Delete a single held role's profile (Account Settings Delete Account tab's
 * per-role "I want to permanently delete my [x] profile" links) — removes
 * only that role's scoped data, revokes the role, and re-syncs the primary
 * role/active-role. The user's Nomarc account and any other held roles are
 * left untouched.
 */
export async function deleteRoleProfile(role: StackableRole): Promise<{ ok: boolean; error?: string }> {
  try {
    const uid = await requireUserId();

    if (role === "professional") {
      await db.delete(workExperience).where(eq(workExperience.userId, uid));
      await db.delete(education).where(eq(education.userId, uid));
      await db.delete(profileSkill).where(eq(profileSkill.userId, uid));
      await db.delete(certification).where(eq(certification.userId, uid));
      await db.delete(project).where(eq(project.userId, uid));
      await db.delete(application).where(eq(application.applicantUserId, uid));
      await db.delete(recommendation).where(or(eq(recommendation.recommenderUserId, uid), eq(recommendation.recommendeeUserId, uid)));
      await db.delete(profile).where(eq(profile.userId, uid));
    } else if (role === "exhibitor") {
      await db.delete(company).where(eq(company.ownerUserId, uid)); // cascades products + company_certification
    } else {
      await db.delete(job).where(eq(job.ownerUserId, uid)); // cascades applications to those jobs
      try { await db.delete(employerProfile).where(eq(employerProfile.userId, uid)); } catch { /* table not yet migrated */ }
    }

    await revokeRole(uid, role);
    revalidatePath("/dashboard/settings/account");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete this profile." };
  }
}
