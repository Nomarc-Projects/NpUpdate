"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyListerProfile } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/authz";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";
import { LISTER_TYPES, type ListerType } from "@/lib/constants/property";

export type ListerInput = {
  listerType: string;
  displayName: string;
  companyName?: string;
  cacNumber?: string;
  phone?: string;
  email?: string;
  cacDocumentKey?: string;
  idDocumentKey?: string;
};

function clean(value: string | undefined | null) {
  return value?.trim() || null;
}

function isListerType(value: string): value is ListerType {
  return LISTER_TYPES.some((t) => t.value === value);
}

function validate(input: ListerInput, forReview: boolean) {
  if (!isListerType(input.listerType)) throw new Error("Choose a lister type");
  if ((input.displayName ?? "").trim().length < 2) throw new Error("Add the name buyers should see");
  if (forReview && (input.phone ?? "").replace(/\D/g, "").length < 7) throw new Error("Add a contact phone number");
  if (forReview && input.listerType === "realtor") {
    if (!(input.companyName ?? "").trim()) throw new Error("Add your agency or company name");
    if (!(input.cacNumber ?? "").trim()) throw new Error("Add your CAC registration number");
    if (!input.cacDocumentKey) throw new Error("Upload your CAC certificate");
  }
  if (forReview && !input.idDocumentKey) throw new Error("Upload a government-issued ID");
}

async function upsertProfile(uid: string, input: ListerInput, submit: boolean) {
  validate(input, submit);
  const [existing] = await db
    .select()
    .from(propertyListerProfile)
    .where(eq(propertyListerProfile.userId, uid))
    .limit(1);

  if (existing?.verificationStatus === "verified" && submit) {
    return existing;
  }

  const changedSensitive = !!existing && (
    input.listerType !== existing.listerType ||
    clean(input.companyName) !== existing.companyName ||
    clean(input.cacNumber) !== existing.cacNumber ||
    (!!input.cacDocumentKey && input.cacDocumentKey !== existing.cacDocumentKey) ||
    (!!input.idDocumentKey && input.idDocumentKey !== existing.idDocumentKey)
  );
  const nextStatus = submit
    ? "pending"
    : existing?.verificationStatus === "verified" && changedSensitive
      ? "pending"
      : existing?.verificationStatus ?? "unverified";
  const values = {
    userId: uid,
    listerType: input.listerType,
    displayName: clean(input.displayName),
    companyName: clean(input.companyName),
    cacNumber: clean(input.cacNumber),
    phone: clean(input.phone),
    email: clean(input.email),
    cacDocumentKey: input.cacDocumentKey ?? existing?.cacDocumentKey ?? null,
    idDocumentKey: input.idDocumentKey ?? existing?.idDocumentKey ?? null,
    verificationStatus: nextStatus,
    verificationNote: submit || (existing?.verificationStatus === "verified" && changedSensitive)
      ? null
      : existing?.verificationNote ?? null,
    verifiedAt: submit || (existing?.verificationStatus === "verified" && changedSensitive)
      ? null
      : existing?.verifiedAt ?? null,
    updatedAt: new Date(),
  };

  let profileId: string;
  if (existing) {
    await db.update(propertyListerProfile).set(values).where(eq(propertyListerProfile.id, existing.id));
    profileId = existing.id;
  } else {
    const [created] = await db.insert(propertyListerProfile).values(values).returning({ id: propertyListerProfile.id });
    profileId = created.id;
  }

  await db
    .update(property)
    .set({ listerProfileId: profileId, updatedAt: new Date() })
    .where(eq(property.ownerUserId, uid));

  revalidatePath("/dashboard/properties/verification");
  revalidatePath("/dashboard/properties");
  return { ...values, id: profileId };
}

export async function getMyListerProfile() {
  const uid = await requireUserId();
  const [row] = await db
    .select()
    .from(propertyListerProfile)
    .where(eq(propertyListerProfile.userId, uid))
    .limit(1);
  return row ?? null;
}

export async function saveListerProfile(input: ListerInput) {
  const uid = await requireUserId();
  return upsertProfile(uid, input, false);
}

export async function submitListerVerification(input: ListerInput) {
  const uid = await requireUserId();
  const profile = await upsertProfile(uid, input, true);
  await notify(uid, {
    type: "property_lister_verification",
    title: "Lister verification submitted",
    body: "We are reviewing your lister profile and documents. You will be notified when it is done.",
    href: "/dashboard/properties/verification",
  }).catch(() => {});
  revalidatePath("/admin/properties/listers");
  return profile;
}

export type AdminListerRow = {
  id: string;
  userId: string;
  listerType: string;
  displayName: string | null;
  companyName: string | null;
  cacNumber: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: string;
  verificationNote: string | null;
  cacDocumentKey: string | null;
  idDocumentKey: string | null;
  createdAt: string;
  listings: number;
};

export async function getAdminListers(status?: string): Promise<AdminListerRow[]> {
  await requireAdmin();
  const where = status && status !== "all" ? eq(propertyListerProfile.verificationStatus, status) : undefined;
  const rows = await db
    .select({
      id: propertyListerProfile.id,
      userId: propertyListerProfile.userId,
      listerType: propertyListerProfile.listerType,
      displayName: propertyListerProfile.displayName,
      companyName: propertyListerProfile.companyName,
      cacNumber: propertyListerProfile.cacNumber,
      phone: propertyListerProfile.phone,
      email: propertyListerProfile.email,
      verificationStatus: propertyListerProfile.verificationStatus,
      verificationNote: propertyListerProfile.verificationNote,
      cacDocumentKey: propertyListerProfile.cacDocumentKey,
      idDocumentKey: propertyListerProfile.idDocumentKey,
      createdAt: propertyListerProfile.createdAt,
      listings: sql<number>`(select count(*)::int from ${property} where ${property.listerProfileId} = ${propertyListerProfile.id})`,
    })
    .from(propertyListerProfile)
    .where(where)
    .orderBy(desc(propertyListerProfile.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getAdminListerStats() {
  await requireAdmin();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where verification_status = 'pending')::int`,
      verified: sql<number>`count(*) filter (where verification_status = 'verified')::int`,
      rejected: sql<number>`count(*) filter (where verification_status = 'rejected')::int`,
    })
    .from(propertyListerProfile);
  return row ?? { total: 0, pending: 0, verified: 0, rejected: 0 };
}

export async function reviewListerProfile(id: string, decision: "verify" | "reject", note?: string) {
  const admin = await requireAdmin();
  const [row] = await db.select().from(propertyListerProfile).where(eq(propertyListerProfile.id, id)).limit(1);
  if (!row) throw new Error("Lister profile not found");
  if (row.verificationStatus !== "pending") throw new Error("This profile is not awaiting review");
  const cleanNote = note?.trim() || null;
  if (decision === "reject" && !cleanNote) throw new Error("Add a note explaining the rejection");

  await db.update(propertyListerProfile).set({
    verificationStatus: decision === "verify" ? "verified" : "rejected",
    verificationNote: cleanNote,
    verifiedAt: decision === "verify" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(propertyListerProfile.id, id));

  await notify(row.userId, {
    type: decision === "verify" ? "property_lister_verified" : "property_lister_rejected",
    title: decision === "verify" ? "Lister verification approved" : "Lister verification not approved",
    body: decision === "verify" ? "Your lister profile is now verified on Nomarc Projects." : cleanNote || "Please review your details and resubmit.",
    href: "/dashboard/properties/verification",
  }).catch(() => {});

  revalidatePath("/admin/properties/listers");
  revalidatePath("/dashboard/properties/verification");
  return decision;
}
