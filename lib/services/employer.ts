"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employerProfile } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { grantRole } from "@/lib/roles-internal";
import { getOwnCompany } from "@/lib/company-internal";

const bump = () => {};

/** What the employer onboarding wizard needs to pick Branch A vs Branch B. */
export async function getEmployerOnboardingContext() {
  const uid = await requireUserId();
  const [company, [existing]] = await Promise.all([
    getOwnCompany(uid),
    db.select().from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1),
  ]);
  return {
    hasCompany: !!company,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    alreadyOnboarded: !!existing,
  };
}

export type EmployerProfileData = {
  hiringAs: "company" | "individual";
  name: string;
  email: string;
  employerType: string;
  headquarters: string;
  companySize: string;
  yearFounded: string;
  about: string;
  avatarUrl: string;
  /** Set when hiring under an owned exhibitor company rather than freestanding. */
  linkedCompanyName: string | null;
};

/**
 * Read the employer profile for editing.
 *
 * There was no reader: `saveEmployerProfile` was called only from the onboarding
 * wizard, so once onboarding finished an employer could never change their
 * company name, logo, size, description or contact details again — the data was
 * write-once with no surface to revisit it.
 */
export async function getEmployerProfile(): Promise<EmployerProfileData> {
  const uid = await requireUserId();
  const [company, [e]] = await Promise.all([
    getOwnCompany(uid),
    db.select().from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1),
  ]);
  return {
    hiringAs: (e?.hiringAs === "individual" ? "individual" : "company"),
    name: e?.name ?? company?.name ?? "",
    email: e?.email ?? "",
    employerType: e?.employerType ?? "",
    headquarters: e?.headquarters ?? "",
    companySize: e?.companySize ?? "",
    yearFounded: e?.yearFounded ? String(e.yearFounded) : "",
    about: e?.about ?? company?.about ?? "",
    avatarUrl: e?.avatarUrl ?? company?.avatarUrl ?? "",
    linkedCompanyName: e?.companyId ? (company?.name ?? null) : null,
  };
}

/** Branch A — hire under an existing exhibitor company the user already owns. */
export async function chooseEmployerCompany(input: { companyId: string | null; employerType: string }) {
  const uid = await requireUserId();
  const fields = {
    companyId: input.companyId,
    hiringAs: input.companyId ? ("company" as const) : null,
    employerType: input.employerType || null,
    updatedAt: new Date(),
  };
  const [existing] = await db.select({ id: employerProfile.id }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
  if (existing) await db.update(employerProfile).set(fields).where(eq(employerProfile.userId, uid));
  else await db.insert(employerProfile).values({ userId: uid, ...fields });
  await grantRole(uid, "employer", "self_serve_tier1");
  bump();
}

/** Branch B — freestanding hiring profile, no existing company. */
export async function saveEmployerProfile(input: {
  hiringAs: "company" | "individual";
  name?: string;
  email?: string;
  employerType?: string;
  headquarters?: string;
  companySize?: string;
  yearFounded?: string;
  about?: string;
  avatarUrl?: string;
}) {
  const uid = await requireUserId();
  const fields = {
    hiringAs: input.hiringAs,
    name: input.name?.trim() || null,
    email: input.email || null,
    employerType: input.employerType || null,
    headquarters: input.headquarters || null,
    companySize: input.companySize || null,
    yearFounded: input.yearFounded ? Number(input.yearFounded) || null : null,
    about: input.about || null,
    avatarUrl: input.avatarUrl || null,
    updatedAt: new Date(),
  };
  const [existing] = await db.select({ id: employerProfile.id }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
  if (existing) await db.update(employerProfile).set(fields).where(eq(employerProfile.userId, uid));
  else await db.insert(employerProfile).values({ userId: uid, ...fields });
  await grantRole(uid, "employer", "self_serve_tier1");
  bump();
}
