"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { project } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

/**
 * Portfolio projects.
 *
 * The `project` table has existed for a long time and nothing ever read from or
 * wrote to it. /dashboard/add-project was a mock: its Title and Role inputs were
 * uncontrolled with no state behind them, no `upload` handler was passed to the
 * two FileUpload fields so images were never uploaded either, and submitting
 * fired toast.success("Project published!") and navigated away. The dashboard's
 * project list was React state seeded from a prop, so anything you appeared to
 * add vanished on reload.
 *
 * REQUIRES drizzle/0041_project_details.sql (start_date, end_date, ongoing,
 * responsibilities) to have been applied.
 */
export type PortfolioProject = {
  id: string;
  title: string;
  role: string;
  description: string;
  location: string;
  coverUrl: string;
  gallery: string[];
  responsibilities: string[];
  startDate: string | null;
  endDate: string | null;
  ongoing: boolean;
  draft: boolean;
  createdAt: string | null;
};

export type ProjectInput = {
  title: string;
  role?: string;
  description?: string;
  location?: string;
  coverUrl?: string;
  gallery?: string[];
  responsibilities?: string[];
  startDate?: string;
  endDate?: string;
  ongoing?: boolean;
  /** True keeps it out of the public portfolio until published. */
  draft?: boolean;
};

const clean = (v: string | undefined | null) => (v ?? "").trim();
/** Empty strings must become NULL: a date column rejects "". */
const dateOrNull = (v: string | undefined) => (clean(v) ? clean(v) : null);

function toProject(r: typeof project.$inferSelect): PortfolioProject {
  return {
    id: r.id,
    title: r.title,
    role: r.role ?? "",
    description: r.description ?? "",
    location: r.location ?? "",
    coverUrl: r.coverUrl ?? "",
    gallery: r.gallery ?? [],
    responsibilities: r.responsibilities ?? [],
    startDate: r.startDate ? String(r.startDate).slice(0, 10) : null,
    endDate: r.endDate ? String(r.endDate).slice(0, 10) : null,
    ongoing: r.ongoing ?? false,
    draft: r.draft ?? false,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
  };
}

/** Everything this user has, newest first. Drafts included, flagged. */
export async function listMyProjects(): Promise<PortfolioProject[]> {
  try {
    const uid = await requireUserId();
    const rows = await db.select().from(project).where(eq(project.userId, uid)).orderBy(desc(project.createdAt));
    return rows.map(toProject);
  } catch {
    // Resilient like the other dashboard reads: an empty portfolio is a valid
    // view, and this feeds a tab that should not blank the whole page.
    return [];
  }
}

export async function createProject(input: ProjectInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const uid = await requireUserId();
    const title = clean(input.title);
    if (!title) return { ok: false, error: "Give the project a title." };

    const start = dateOrNull(input.startDate);
    const end = input.ongoing ? null : dateOrNull(input.endDate);
    if (start && end && end < start) return { ok: false, error: "The end date is before the start date." };

    const [row] = await db.insert(project).values({
      userId: uid,
      title,
      role: clean(input.role) || null,
      description: clean(input.description) || null,
      location: clean(input.location) || null,
      coverUrl: clean(input.coverUrl) || null,
      gallery: (input.gallery ?? []).filter(Boolean),
      // Blank rows are inevitable: the form starts with one empty input and adds
      // more on demand, so most submissions carry at least one.
      responsibilities: (input.responsibilities ?? []).map((s) => s.trim()).filter(Boolean),
      startDate: start,
      endDate: end,
      ongoing: input.ongoing ?? false,
      draft: input.draft ?? false,
    }).returning({ id: project.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return { ok: true, id: row.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the project." };
  }
}

/** Scoped to the owner, so an id from elsewhere can't delete someone else's work. */
export async function deleteProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const uid = await requireUserId();
    await db.delete(project).where(and(eq(project.id, projectId), eq(project.userId, uid)));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't delete the project." };
  }
}
