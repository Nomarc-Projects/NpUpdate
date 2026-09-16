"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { application, job } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

export type ApplicationRow = { id: string; jobId: string; role: string; company: string; date: string; status: string; ownerUserId: string; recruiterName: string };

function shortDate(d: Date | string) {
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function submitApplication(input: {
  jobId: string; coverLetter?: string; expectedSalary?: string; resumeUrl?: string; portfolioUrl?: string; linkedinUrl?: string; draft?: boolean;
}) {
  const uid = await requireUserId();
  if (!input.jobId) throw new Error("Missing job");

  await db.insert(application).values({
    jobId: input.jobId,
    applicantUserId: uid,
    coverLetter: input.coverLetter || null,
    expectedSalary: input.expectedSalary || null,
    resumeUrl: input.resumeUrl || null,
    portfolioUrl: input.portfolioUrl || null,
    linkedinUrl: input.linkedinUrl || null,
    draft: !!input.draft,
    status: input.draft ? "draft" : "applied",
  });
  // notify the job owner of a new submission (not for drafts)
  if (!input.draft) {
    const [j] = await db.select({ ownerUserId: job.ownerUserId, title: job.title }).from(job).where(eq(job.id, input.jobId)).limit(1);
    if (j && j.ownerUserId !== uid) {
      await notify(j.ownerUserId, {
        type: "application",
        title: `New applicant for ${j.title}`,
        body: "Review their application in your posted jobs.",
        href: "/dashboard/jobs/posted",
      });
    }
  }
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/applications/drafts");
}

/** Current user's applications (draft=false → submitted, true → drafts). */
export async function getMyApplications(draft: boolean): Promise<ApplicationRow[]> {
  try {
    const uid = await requireUserId();
    const rows = await db
      .select({ a: application, jTitle: job.title, jCompany: job.company, jOwner: job.ownerUserId, jRecruiter: job.recruiterName })
      .from(application)
      .innerJoin(job, eq(application.jobId, job.id))
      .where(and(eq(application.applicantUserId, uid), eq(application.draft, draft)))
      .orderBy(desc(application.createdAt));
    return rows.map(({ a, jTitle, jCompany, jOwner, jRecruiter }) => ({
      id: a.id,
      jobId: a.jobId,
      role: jTitle,
      company: jCompany ?? "",
      date: shortDate(a.createdAt),
      status: a.status ?? "applied",
      ownerUserId: jOwner,
      recruiterName: jRecruiter ?? "",
    }));
  } catch {
    return [];
  }
}

export async function deleteApplication(id: string) {
  const uid = await requireUserId();
  await db.delete(application).where(and(eq(application.id, id), eq(application.applicantUserId, uid)));
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/applications/drafts");
}

export type ApplicantDefaults = { name: string; email: string; phone: string; location: string };

/**
 * The signed-in user's details, for the apply form's "copy details from
 * profile" button.
 *
 * That button previously read a module-level PROFILE constant whose every field
 * was an empty string, so it wiped whatever had been typed and then toasted
 * "Details copied from your profile" — it looked like it worked and had never
 * copied anything.
 *
 * Raw SQL because `user` is Better Auth's table and is not in the drizzle
 * schema; the rest of the codebase reads it the same way.
 */
export async function getApplicantDefaults(): Promise<ApplicantDefaults> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT u.name, u.email, p.phone, p.location
    FROM "user" u
    LEFT JOIN profile p ON p.user_id = u.id
    WHERE u.id = ${uid}
    LIMIT 1
  `);
  const row = (res.rows as { name?: string; email?: string; phone?: string; location?: string }[])[0];
  return {
    name: row?.name ?? "",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    location: row?.location ?? "",
  };
}
