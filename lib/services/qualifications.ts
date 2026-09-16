"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { workExperience, profileSkill, certification, education, professionalRegistration, reference } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

const bump = () => revalidatePath("/dashboard/profile");

export type Experience = { id: string; title: string; company: string; description: string | null; location: string | null; workplaceType: string | null; startDate: string | null; endDate: string | null; current: boolean };
export type Cert = { id: string; name: string; issuer: string | null; year: number | null; url: string | null };
export type Edu = {
  id: string; school: string; degree: string | null; field: string | null;
  startYear: number | null; endYear: number | null;
  current: boolean; description: string | null;
  proofUrl: string | null;
  /** null until a document is attached, then pending | approved | rejected. */
  proofStatus: "pending" | "approved" | "rejected" | null;
};
export type Registration = { id: string; body: string; registrationNumber: string | null };
export type Reference = { id: string; name: string; contactType: string; contact: string | null; organization: string | null };

export async function getQualifications() {
  const uid = await requireUserId();
  const [exp, sk, certs, regs] = await Promise.all([
    db.select().from(workExperience).where(eq(workExperience.userId, uid)).orderBy(desc(workExperience.startDate)),
    db.select().from(profileSkill).where(eq(profileSkill.userId, uid)).orderBy(asc(profileSkill.createdAt)),
    db.select().from(certification).where(eq(certification.userId, uid)).orderBy(desc(certification.year)),
    // resilient: returns [] until the professional_registration migration is applied
    db.select().from(professionalRegistration).where(eq(professionalRegistration.userId, uid)).orderBy(asc(professionalRegistration.createdAt)).catch(() => []),
  ]);
  return {
    experience: exp as Experience[],
    skills: sk.filter((s) => (s.kind ?? "skill") === "skill").map((s) => ({ id: s.id, name: s.name })),
    specializations: sk.filter((s) => s.kind === "specialization").map((s) => ({ id: s.id, name: s.name })),
    certifications: certs.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year, url: c.url })) as Cert[],
    registrations: regs.map((r) => ({ id: r.id, body: r.body, registrationNumber: r.registrationNumber })) as Registration[],
    // Sum of per-skill endorsements — the profile's "likes"/endorsement-type metric.
    endorsementsTotal: sk.reduce((sum, s) => sum + (s.endorsements ?? 0), 0),
  };
}

export async function getRegistrations(): Promise<Registration[]> {
  const uid = await requireUserId();
  try {
    const rows = await db.select().from(professionalRegistration).where(eq(professionalRegistration.userId, uid)).orderBy(asc(professionalRegistration.createdAt));
    return rows.map((r) => ({ id: r.id, body: r.body, registrationNumber: r.registrationNumber }));
  } catch { return []; }
}
export async function addRegistration(input: { body: string; registrationNumber?: string }) {
  const uid = await requireUserId();
  if (!input.body.trim()) throw new Error("Select a regulatory body");
  await db.insert(professionalRegistration).values({ userId: uid, body: input.body.trim(), registrationNumber: input.registrationNumber?.trim() || null });
  bump();
}
export async function removeRegistration(id: string) {
  const uid = await requireUserId();
  await db.delete(professionalRegistration).where(and(eq(professionalRegistration.id, id), eq(professionalRegistration.userId, uid)));
  bump();
}

export async function getReferences(): Promise<Reference[]> {
  const uid = await requireUserId();
  try {
    const rows = await db.select().from(reference).where(eq(reference.userId, uid)).orderBy(asc(reference.createdAt));
    return rows.map((r) => ({ id: r.id, name: r.name, contactType: r.contactType ?? "email", contact: r.contact, organization: r.organization }));
  } catch { return []; }
}
export async function addReference(input: { name: string; contactType: "email" | "phone"; contact?: string; organization?: string }) {
  const uid = await requireUserId();
  if (!input.name.trim()) throw new Error("Reference name is required");
  await db.insert(reference).values({ userId: uid, name: input.name.trim(), contactType: input.contactType, contact: input.contact?.trim() || null, organization: input.organization?.trim() || null });
  bump();
}
export async function removeReference(id: string) {
  const uid = await requireUserId();
  await db.delete(reference).where(and(eq(reference.id, id), eq(reference.userId, uid)));
  bump();
}

export async function addExperience(input: { title: string; company: string; description?: string; location?: string; workplaceType?: string; startDate?: string; endDate?: string; current?: boolean }) {
  const uid = await requireUserId();
  if (!input.title.trim() || !input.company.trim()) throw new Error("Role and company are required");
  await db.insert(workExperience).values({
    userId: uid, title: input.title.trim(), company: input.company.trim(), description: input.description || null,
    location: input.location || null, workplaceType: input.workplaceType || null,
    startDate: input.startDate || null, endDate: input.current ? null : input.endDate || null, current: !!input.current,
  });
  bump();
}
export async function deleteExperience(id: string) {
  const uid = await requireUserId();
  await db.delete(workExperience).where(and(eq(workExperience.id, id), eq(workExperience.userId, uid)));
  bump();
}

export async function addSkill(name: string, kind: "skill" | "specialization") {
  const uid = await requireUserId();
  if (!name.trim()) throw new Error("Name required");
  await db.insert(profileSkill).values({ userId: uid, name: name.trim(), kind });
  bump();
}
export async function removeSkill(id: string) {
  const uid = await requireUserId();
  await db.delete(profileSkill).where(and(eq(profileSkill.id, id), eq(profileSkill.userId, uid)));
  bump();
}

export async function addCertification(input: { name: string; issuer?: string; year?: number; url?: string }) {
  const uid = await requireUserId();
  if (!input.name.trim()) throw new Error("Certification name required");
  await db.insert(certification).values({ userId: uid, name: input.name.trim(), issuer: input.issuer || null, year: input.year ?? null, url: input.url?.trim() || null });
  bump();
}
export async function deleteCertification(id: string) {
  const uid = await requireUserId();
  await db.delete(certification).where(and(eq(certification.id, id), eq(certification.userId, uid)));
  bump();
}

export async function getEducationList(): Promise<Edu[]> {
  const uid = await requireUserId();
  const rows = await db.select().from(education).where(eq(education.userId, uid)).orderBy(desc(education.endYear));
  return rows.map((e) => ({
    id: e.id, school: e.school, degree: e.degree, field: e.field,
    startYear: e.startYear, endYear: e.endYear,
    current: e.current, description: e.description,
    proofUrl: e.proofUrl, proofStatus: (e.proofStatus ?? null) as Edu["proofStatus"],
  }));
}

/**
 * Returns whether a proof document was attached, so the caller can raise the
 * "Document Submitted — approval usually takes 24-48 hours" confirmation only
 * when there is actually something under review.
 */
export async function addEducation(input: {
  school: string; degree?: string; field?: string; startYear?: number; endYear?: number;
  current?: boolean; description?: string; proofUrl?: string;
}): Promise<{ proofSubmitted: boolean }> {
  const uid = await requireUserId();
  if (!input.school.trim()) throw new Error("School is required");
  const proofUrl = input.proofUrl?.trim() || null;
  await db.insert(education).values({
    userId: uid,
    school: input.school.trim(),
    degree: input.degree || null,
    field: input.field || null,
    startYear: input.startYear ?? null,
    // "Currently studying here" and an end year are mutually exclusive; the
    // checkbox wins so a stale year can't imply a finished course.
    endYear: input.current ? null : input.endYear ?? null,
    current: !!input.current,
    description: input.description?.trim() || null,
    proofUrl,
    proofStatus: proofUrl ? "pending" : null,
    proofSubmittedAt: proofUrl ? new Date() : null,
  });
  bump();
  return { proofSubmitted: !!proofUrl };
}
export async function deleteEducation(id: string) {
  const uid = await requireUserId();
  await db.delete(education).where(and(eq(education.id, id), eq(education.userId, uid)));
  bump();
}
