"use server";

import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kycDocument, profile, company, employerProfile } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import type { StackableRole } from "@/lib/entitlements";
import { getHeldRoles } from "@/lib/roles-internal";

export type KycStatus = "none" | "pending" | "approved" | "rejected";
export type DocStatus = "pending" | "approved" | "rejected";

export interface KycDoc {
  id: string;
  docType: string;
  fileUrl: string | null;
  textValue: string | null;
  status: DocStatus;
  adminNote: string | null;
  submittedAt: Date;
}

export interface TierState {
  tier: number;
  status: "locked" | "not_started" | "in_progress" | "under_review" | "approved" | "rejected";
  docs: KycDoc[];
}

export interface KycState {
  role: string;
  overallTier: number;     // highest approved tier
  tiers: TierState[];
  isFullyVerified: boolean; // tier 3 approved
}

/**
 * Whether Tier 1 is satisfied: the profile carries the details the Tier 1 card
 * actually asks for.
 *
 * This used to read `phoneVerified`, which silently contradicted the UI. The
 * Tier 1 card in components/dashboard/kyc-view.tsx is titled "Profile Setup",
 * reads "Complete your profile with a headline, bio and profession", lists
 * "Profile bio & headline" as its requirement, and its button goes to
 * /dashboard/profile?tab=public. A member could therefore do exactly what was
 * asked, on the exact page they were sent to, and watch Tier 1 stay "Not
 * Started" forever, with nothing on that screen able to satisfy the real gate.
 *
 * Phone verification still exists in Account Settings; it just no longer blocks
 * verification progress.
 */
async function isTier1Complete(uid: string, role: string): Promise<boolean> {
  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  try {
    if (role === "exhibitor") {
      const [c] = await db
        .select({ about: company.about, industry: company.industry })
        .from(company).where(eq(company.ownerUserId, uid)).limit(1);
      return filled(c?.about) && filled(c?.industry);
    }
    if (role === "employer") {
      const [e] = await db
        .select({ about: employerProfile.about })
        .from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
      return filled(e?.about);
    }
    const [p] = await db
      .select({ headline: profile.headline, bio: profile.bio })
      .from(profile).where(eq(profile.userId, uid)).limit(1);
    return filled(p?.headline) && filled(p?.bio);
  } catch {
    return false;
  }
}

async function computeKycStateForRole(uid: string, role: string): Promise<KycState> {
  type KycDocWithTier = KycDoc & { tier: number };
  let allRows: KycDocWithTier[] = [];
  try {
    const rows = await db.select().from(kycDocument).where(and(eq(kycDocument.userId, uid), eq(kycDocument.role, role)));
    allRows = rows.map((r) => ({
      id: r.id,
      docType: r.docType,
      fileUrl: r.fileUrl,
      textValue: r.textValue,
      status: r.status as DocStatus,
      adminNote: r.adminNote,
      submittedAt: r.submittedAt!,
      tier: r.tier,
    }));
  } catch { /* table not yet migrated */ }

  const tierList: TierState[] = [1, 2, 3].map((tier) => {
    const td = allRows.filter((r) => r.tier === tier);
    let status: TierState["status"] = "not_started";
    if (td.length > 0) {
      const allApproved = td.every((d) => d.status === "approved");
      const anyRejected = td.some((d) => d.status === "rejected");
      const anyPending = td.some((d) => d.status === "pending");
      if (allApproved) status = "approved";
      else if (anyRejected) status = "rejected";
      else if (anyPending) status = "under_review";
      else status = "in_progress";
    }
    return { tier, status, docs: td };
  });

  // Tier 1 = the profile details its own card asks for.
  if (await isTier1Complete(uid, role)) tierList[0].status = "approved";

  const overallTier = tierList.filter((t) => t.status === "approved").length;

  return {
    role,
    overallTier,
    tiers: tierList,
    isFullyVerified: tierList[2].status === "approved",
  };
}

/** Legacy single-role KYC state, derived from the session's primary role — used by the profile page's KYC view. */
export async function getKycState(): Promise<KycState> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "professional";
  return computeKycStateForRole(uid, role);
}

/**
 * Per-held-role KYC state — one entry per role the viewer actually holds
 * (professional/exhibitor/employer), each with its own Tier 1/2/3 progress.
 * Backs the Account Settings Verification tab's per-role accordions.
 */
export async function getKycStates(): Promise<Partial<Record<StackableRole, KycState>>> {
  const uid = await requireUserId();
  const held = await getHeldRoles(uid).catch(() => []);
  const roles = held.length ? held.map((h) => h.role) : (["professional"] as StackableRole[]);
  const entries = await Promise.all(roles.map(async (role) => [role, await computeKycStateForRole(uid, role)] as const));
  return Object.fromEntries(entries) as Partial<Record<StackableRole, KycState>>;
}

export async function submitKycDoc(input: {
  tier: number;
  docType: string;
  fileUrl?: string;
  textValue?: string;
  role?: StackableRole;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const uid = await requireUserId();
    let role: string | undefined = input.role;
    if (!role) {
      const session = await auth.api.getSession({ headers: await headers() });
      role = (session?.user as { role?: string } | undefined)?.role ?? "professional";
    }

    // A `blob:` URL is an in-memory handle scoped to the submitting tab — it
    // refers to nothing once that tab closes, and nothing was ever uploaded.
    // Every KYC document stored before this check was one of these, so no
    // reviewer could open any of them. Reject it here rather than in the form,
    // so no caller can reintroduce it.
    if (input.fileUrl && /^(blob:|data:)/i.test(input.fileUrl.trim())) {
      throw new Error("That file wasn't uploaded. Please re-select the document and try again.");
    }

    await db.insert(kycDocument).values({
      userId: uid,
      role,
      tier: input.tier,
      docType: input.docType,
      fileUrl: input.fileUrl ?? null,
      textValue: input.textValue ?? null,
      status: "pending",
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Submission failed" };
  }
}
