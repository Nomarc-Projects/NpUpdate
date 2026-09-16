"use server";

import { headers } from "next/headers";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { company, companyCertification, product } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { ensureCompany, getOwnCompany } from "@/lib/company-internal";
import { grantRole } from "@/lib/roles-internal";

const bump = () => { revalidatePath("/dashboard/company"); revalidatePath("/dashboard"); };

export type CompanyData = {
  name: string;
  industry: string;
  headquarters: string;
  about: string;
  yearFounded: string;
  companySize: string;
  /** Collected at onboarding; editable on the company profile since 0034. */
  companyType: string;
  categories: string[];
  registrationNumber: string;
  avatarUrl: string;
  completeness: number;
  verified: boolean;
};
export type CompanyCert = { id: string; name: string; issuer: string | null; year: number | null; url: string | null };

/** Weighted company completeness (0–100) + what's missing. */
function computeCompleteness(
  c: { avatarUrl?: string | null; about?: string | null; industry?: string | null; headquarters?: string | null; yearFounded?: number | null; companySize?: string | null },
  certCount: number,
) {
  const checks = [
    { ok: !!c.avatarUrl, label: "Company logo" },
    { ok: !!c.industry, label: "Primary industry" },
    { ok: !!c.headquarters, label: "Headquarters" },
    { ok: !!c.about, label: "About the company" },
    { ok: !!c.yearFounded, label: "Year founded" },
    { ok: !!c.companySize, label: "Company size" },
    { ok: certCount > 0, label: "A certification" },
  ];
  const done = checks.filter((x) => x.ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter((x) => !x.ok).map((x) => x.label) };
}

export async function getMyCompany(): Promise<{ data: CompanyData; certifications: CompanyCert[]; missing: string[] }> {
  const uid = await requireUserId();
  const c = await getOwnCompany(uid);
  const certs = c
    ? await db.select().from(companyCertification).where(eq(companyCertification.companyId, c.id)).orderBy(desc(companyCertification.year))
    : [];
  const comp = computeCompleteness(c ?? {}, certs.length);
  return {
    data: {
      name: c?.name ?? "",
      industry: c?.industry ?? "",
      headquarters: c?.headquarters ?? "",
      about: c?.about ?? "",
      yearFounded: c?.yearFounded ? String(c.yearFounded) : "",
      companySize: c?.companySize ?? "",
      companyType: c?.companyType ?? "",
      categories: c?.categories ?? [],
      registrationNumber: c?.registrationNumber ?? "",
      avatarUrl: c?.avatarUrl ?? "",
      completeness: comp.percent,
      verified: c?.verified ?? false,
    },
    certifications: certs.map((x) => ({ id: x.id, name: x.name, issuer: x.issuer, year: x.year, url: x.url })),
    missing: comp.missing,
  };
}

export async function saveCompany(input: {
  name?: string; industry?: string; headquarters?: string; about?: string; yearFounded?: string;
  companySize?: string; avatarUrl?: string; companyType?: string; categories?: string[];
  registrationNumber?: string;
}) {
  const uid = await requireUserId();
  // Only write what the caller actually supplied. Every field used to be set
  // unconditionally, so a form that didn't render companyType/categories — i.e.
  // the company profile editor — silently nulled whatever onboarding collected
  // the moment anything else was saved.
  const fields = {
    ...(input.name !== undefined ? { name: input.name.trim() || "My Company" } : {}),
    ...(input.industry !== undefined ? { industry: input.industry || null } : {}),
    ...(input.headquarters !== undefined ? { headquarters: input.headquarters || null } : {}),
    ...(input.about !== undefined ? { about: input.about || null } : {}),
    ...(input.yearFounded !== undefined ? { yearFounded: input.yearFounded ? Number(input.yearFounded) || null : null } : {}),
    ...(input.companySize !== undefined ? { companySize: input.companySize || null } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
    ...(input.companyType !== undefined ? { companyType: input.companyType || null } : {}),
    ...(input.categories !== undefined ? { categories: input.categories.length ? input.categories : null } : {}),
    ...(input.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber || null } : {}),
  };
  const c = await getOwnCompany(uid);
  if (c) await db.update(company).set({ ...fields, updatedAt: new Date() }).where(eq(company.id, c.id));
  // `name` is NOT NULL, and a partial save may not carry one — fall back the
  // same way ensureCompany does.
  else await db.insert(company).values({ ownerUserId: uid, ...fields, name: fields.name ?? "My Company" });
  // mirror the logo onto the Better Auth user so the navbar/sidebar avatar matches
  if (input.avatarUrl !== undefined) {
    try { await auth.api.updateUser({ body: { image: input.avatarUrl || "" }, headers: await headers() }); } catch { /* best-effort */ }
  }
  // Tier-1 self-serve: name + (industry, or a company type/category) is enough
  // to grant the exhibitor role (mirrors the condition kyc.ts uses to
  // auto-approve tier 1). The onboarding wizard no longer collects a
  // standalone "industry" field, so companyType/categories satisfy this too.
  if (input.industry || input.companyType || input.categories?.length) {
    await grantRole(uid, "exhibitor", "self_serve_tier1");
  }
  bump();
}

export async function addCompanyCertification(input: { name: string; issuer?: string; year?: number; url?: string }) {
  const uid = await requireUserId();
  if (!input.name.trim()) throw new Error("Certification name required");
  const companyId = await ensureCompany(uid);
  await db.insert(companyCertification).values({ companyId, name: input.name.trim(), issuer: input.issuer || null, year: input.year ?? null, url: input.url?.trim() || null });
  bump();
}

export async function deleteCompanyCertification(id: string) {
  const uid = await requireUserId();
  const c = await getOwnCompany(uid);
  if (!c) return;
  await db.delete(companyCertification).where(and(eq(companyCertification.id, id), eq(companyCertification.companyId, c.id)));
  bump();
}

export type CompanyCard = {
  id: string;
  name: string;
  industry: string | null;
  headquarters: string | null;
  companySize: string | null;
  verified: boolean;
  avatarUrl: string | null;
  productCount: number;
  email: string;
  phone: string;
};

export type CompanyDetail = {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  industry: string | null;
  headquarters: string | null;
  yearFounded: number | null;
  companySize: string | null;
  categories: string[];
  avatarUrl: string | null;
  verified: boolean;
  products: { id: string; name: string; coverUrl: string | null; tags: string[] }[];
  certifications: CompanyCert[];
  /** The Better Auth user id that owns this company — used to start a direct
   *  message conversation ("Message" button) from the Exhibition Hub's
   *  View Exhibitor screen (image 43/44). */
  ownerUserId: string;
};

/** Public company profile: company + its published products + certifications.
 *  Resilient — returns null if the company id is unknown. */
export async function getCompanyById(id: string): Promise<CompanyDetail | null> {
  try {
    const [c] = await db.select().from(company).where(eq(company.id, id)).limit(1);
    if (!c) return null;
    const certs = await db.select().from(companyCertification).where(eq(companyCertification.companyId, id)).catch(() => []);
    let products: CompanyDetail["products"] = [];
    try {
      const rows = await db.select().from(product).where(and(eq(product.companyId, id), eq(product.draft, false))).limit(12);
      products = rows.map((p) => ({ id: p.id, name: p.name, coverUrl: p.coverUrl, tags: p.tags ?? [] }));
    } catch { /* table may be empty pre-seed */ }
    return {
      id: c.id, name: c.name, tagline: c.tagline, about: c.about, industry: c.industry,
      headquarters: c.headquarters, yearFounded: c.yearFounded, companySize: c.companySize,
      categories: c.categories ?? [], avatarUrl: c.avatarUrl, verified: c.verified ?? false,
      products,
      certifications: (certs as CompanyCert[]).map((x) => ({ id: x.id, name: x.name, issuer: x.issuer, year: x.year, url: x.url })),
      ownerUserId: c.ownerUserId,
    };
  } catch {
    return null;
  }
}

/** Find a company id by (case-insensitive, exact) name — used by the
 *  Exhibition Hub browse/detail screens to resolve a "View exhibitor" link
 *  from a product card's supplier/vendor name without changing the shape of
 *  `getProductsForBrowse` / `getProductById` in catalog.ts / products.ts. */
export async function getCompanyIdByName(name: string): Promise<string | null> {
  if (!name.trim()) return null;
  try {
    const [c] = await db.select({ id: company.id }).from(company).where(ilike(company.name, name.trim())).limit(1);
    return c?.id ?? null;
  } catch {
    return null;
  }
}

export type CompanyRecommendation = { id: string; name: string; role: string; date: string; body: string; avatarUrl: string };

/** Public "recommendations" for a company — reuses the same `recommendation`
 *  table the professional profile Recommendations tab writes to (approved
 *  rows only), scoped to the company owner's user id. Powers the Exhibition
 *  Hub's View Exhibitor > Recommendations tab (image 44); there is no
 *  company-scoped read for this yet in recommendations.ts / directory.ts. */
export async function getCompanyRecommendations(companyId: string): Promise<CompanyRecommendation[]> {
  try {
    const [c] = await db.select({ ownerUserId: company.ownerUserId }).from(company).where(eq(company.id, companyId)).limit(1);
    if (!c) return [];
    const res = await db.execute(sql`
      SELECT r.id, r.relationship, r.position_at_time, r.body, r.created_at,
             u.name, COALESCE(p.avatar_url, u.image) AS avatar
      FROM recommendation r
      JOIN "user" u ON u.id = r.recommender_user_id
      LEFT JOIN profile p ON p.user_id = r.recommender_user_id
      WHERE r.recommendee_user_id = ${c.ownerUserId} AND r.status = 'approved'
      ORDER BY r.pinned DESC, r.created_at DESC
      LIMIT 20
    `);
    return (res.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "Member"),
      role: String(r.position_at_time || r.relationship || ""),
      date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
      body: String(r.body ?? ""),
      avatarUrl: String(r.avatar ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Public directory: all companies with search + industry filter. */
export async function getCompaniesForDirectory(opts?: { q?: string; industry?: string }) {
  let q = db
    .select({
      id: company.id,
      name: company.name,
      industry: company.industry,
      headquarters: company.headquarters,
      companySize: company.companySize,
      verified: company.verified,
      avatarUrl: company.avatarUrl,
      phone: company.phone,
      ownerUserId: company.ownerUserId,
    })
    .from(company)
    .$dynamic();

  if (opts?.q) {
    const pattern = `%${opts.q}%`;
    q = q.where(or(ilike(company.name, pattern), ilike(company.industry, pattern), ilike(company.headquarters, pattern))!);
  }
  if (opts?.industry) {
    q = q.where(ilike(company.industry, `%${opts.industry}%`));
  }

  const rows = await q.orderBy(desc(company.verified), asc(company.name)).limit(60);
  if (rows.length === 0) return [] as CompanyCard[];
  const owners = await db.execute(sql`SELECT id, email FROM "user" WHERE id IN (${sql.join(rows.map((r) => sql`${r.ownerUserId}`), sql`, `)})`);
  const emailByOwner = new Map((owners.rows as { id: string; email: string }[]).map((u) => [u.id, u.email]));
  return rows.map((r) => ({
    ...r, verified: r.verified ?? false, productCount: 0,
    phone: r.phone ?? "", email: emailByOwner.get(r.ownerUserId) ?? "",
  })) as CompanyCard[];
}
