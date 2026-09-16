"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { btTemplate, btDownload, btSubmission } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";

export type TemplateRow = {
  id: string; slug: string; name: string; description: string | null; category: string;
  discipline: string | null; fileType: string | null; fileUrl: string | null; downloads: number;
  isPremium: boolean; status: string;
};
export type SubmissionRow = {
  id: string; name: string; description: string | null; category: string; discipline: string | null;
  fileType: string | null; status: string; submittedBy: string; createdAt: string;
};

const bump = () => { revalidatePath("/dashboard/practice-templates"); revalidatePath("/admin/templates"); };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function map(t: typeof btTemplate.$inferSelect): TemplateRow {
  return {
    id: t.id, slug: t.slug, name: t.name, description: t.description, category: t.category,
    discipline: t.discipline, fileType: t.fileType, fileUrl: t.fileUrl, downloads: t.downloads ?? 0,
    isPremium: t.isPremium ?? false, status: t.status ?? "published",
  };
}

/** Published templates for the library. Resilient: [] pre-migration. */
export async function listTemplates(opts?: { category?: string; q?: string }): Promise<TemplateRow[]> {
  try {
    const rows = await db.select().from(btTemplate).where(eq(btTemplate.status, "published")).orderBy(desc(btTemplate.downloads));
    let out = rows.map(map);
    if (opts?.category && opts.category !== "all") out = out.filter((t) => t.category === opts.category);
    if (opts?.q) { const q = opts.q.toLowerCase(); out = out.filter((t) => `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)); }
    return out;
  } catch { return []; }
}

export async function getTemplateBySlug(slug: string): Promise<TemplateRow | null> {
  try {
    const [t] = await db.select().from(btTemplate).where(eq(btTemplate.slug, slug)).limit(1);
    return t ? map(t) : null;
  } catch { return null; }
}

/** Record a download (increments counter + logs per-user). Returns fileUrl. */
export async function recordDownload(templateId: string): Promise<string | null> {
  const uid = await requireUserId();
  await db.update(btTemplate).set({ downloads: sql`${btTemplate.downloads} + 1` }).where(eq(btTemplate.id, templateId));
  await db.insert(btDownload).values({ templateId, userId: uid }).catch(() => {});
  const [t] = await db.select({ fileUrl: btTemplate.fileUrl }).from(btTemplate).where(eq(btTemplate.id, templateId)).limit(1);
  bump();
  return t?.fileUrl ?? null;
}

export async function submitTemplate(input: { name: string; description?: string; category: string; discipline?: string; fileUrl?: string; fileType?: string }): Promise<string> {
  const uid = await requireUserId();
  if (!input.name?.trim()) throw new Error("Template name is required");
  const [row] = await db.insert(btSubmission).values({
    submittedBy: uid, name: input.name.trim(), description: input.description || null,
    category: input.category, discipline: input.discipline || null, fileUrl: input.fileUrl || null,
    fileType: input.fileType || null, status: "pending",
  }).returning({ id: btSubmission.id });
  bump();
  return row.id;
}

// ── Admin ──
// These publish, archive and delete platform-wide templates, and expose the
// submission queue. `requireUserId()` alone meant any signed-in user could do
// all of it; the two read paths had no guard whatsoever.
export async function listAllTemplates(): Promise<TemplateRow[]> {
  await requireAdmin();
  try {
    const rows = await db.select().from(btTemplate).orderBy(desc(btTemplate.createdAt));
    return rows.map(map);
  } catch { return []; }
}

export async function listSubmissions(status?: string): Promise<SubmissionRow[]> {
  await requireAdmin();
  try {
    const rows = await db.select().from(btSubmission)
      .where(status ? eq(btSubmission.status, status) : undefined)
      .orderBy(desc(btSubmission.createdAt));
    return rows.map((s) => ({
      id: s.id, name: s.name, description: s.description, category: s.category, discipline: s.discipline,
      fileType: s.fileType, status: s.status ?? "pending", submittedBy: s.submittedBy,
      createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    }));
  } catch { return []; }
}

export async function createTemplate(input: { name: string; description?: string; category: string; discipline?: string; fileUrl?: string; fileType?: string; isPremium?: boolean; status?: string }): Promise<string> {
  await requireAdmin();
  const [row] = await db.insert(btTemplate).values({
    slug: `${slugify(input.name)}-${Date.now().toString(36).slice(-4)}`, name: input.name.trim(),
    description: input.description || null, category: input.category, discipline: input.discipline || null,
    fileUrl: input.fileUrl || null, fileType: input.fileType || null, isPremium: input.isPremium ?? false,
    status: input.status || "published",
  }).returning({ id: btTemplate.id });
  bump();
  return row.id;
}

export async function publishTemplate(id: string, status: "draft" | "published" | "archived"): Promise<void> {
  await requireAdmin();
  await db.update(btTemplate).set({ status, updatedAt: new Date() }).where(eq(btTemplate.id, id));
  bump();
}

export async function deleteTemplate(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(btTemplate).where(eq(btTemplate.id, id));
  bump();
}

/** Approve a submission → publish it as a template (or reject). */
export async function reviewSubmission(id: string, action: "approve" | "reject", note?: string): Promise<void> {
  await requireUserId();
  const [s] = await db.select().from(btSubmission).where(eq(btSubmission.id, id)).limit(1);
  if (!s) return;
  if (action === "approve") {
    await db.insert(btTemplate).values({
      slug: `${slugify(s.name)}-${Date.now().toString(36).slice(-4)}`, name: s.name, description: s.description,
      category: s.category, discipline: s.discipline, fileUrl: s.fileUrl, fileType: s.fileType, status: "published",
      submittedBy: s.submittedBy,
    });
  }
  await db.update(btSubmission).set({ status: action === "approve" ? "approved" : "rejected", reviewNote: note || null }).where(eq(btSubmission.id, id));
  bump();
}
