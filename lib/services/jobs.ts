"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { job, application, jobInvitation, notification } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

export type PostedJob = {
  id: string; title: string; company: string | null; location: string | null;
  employmentType: string | null; workModel: string | null; status: string; draft: boolean;
  salary: string; createdAt: string; applicants: number; newApplicants: number;
  /** Which listing sections are still empty — drives the Drafts tab's "Missing" chips (image 101). */
  missing: string[];
  completePercent: number;
};

export type Applicant = {
  id: string; userId: string; name: string; avatarUrl: string; headline: string;
  coverLetter: string | null; expectedSalary: string | null; resumeUrl: string | null;
  portfolioUrl: string | null; linkedinUrl: string | null; status: string; date: string;
};

const naira = (min: number | null, max: number | null) => {
  if (!min && !max) return "Not disclosed";
  const f = (n: number) => `₦${n.toLocaleString()}`;
  if (min && max) return `${f(min)} – ${f(max)}`;
  return f((min || max)!);
};
const num = (s?: string) => { if (!s) return null; const n = Number(String(s).replace(/[^\d]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };

/** Trim, drop blanks, de-duplicate. The repeatable rows in the post form leave
 *  empty entries behind whenever someone adds a row and changes their mind. */
const cleanList = (v?: string[]) => {
  const out = (v ?? []).map((s) => s.trim()).filter(Boolean);
  return out.length ? Array.from(new Set(out)) : null;
};

export async function createJob(input: {
  title: string; company?: string; location?: string; employmentType?: string; experienceLevel?: string;
  workModel?: string; salaryMin?: string; salaryMax?: string; currency?: string; description?: string; requirements?: string;
  requirementList?: string[]; skills?: string[]; benefits?: string[];
  requireResume?: boolean; requirePortfolio?: boolean; requireCoverLetter?: boolean;
  deadline?: string; applyMethod?: "nomarc" | "url" | "email"; applyTarget?: string;
  recruiterName?: string; recruiterTitle?: string;
}, draft = false) {
  const uid = await requireUserId();
  if (!input.title.trim()) throw new Error("Job title is required");
  const [row] = await db.insert(job).values({
    ownerUserId: uid, title: input.title.trim(), company: input.company || null, location: input.location || null,
    employmentType: input.employmentType || null, experienceLevel: input.experienceLevel || null, workModel: input.workModel || null,
    salaryMin: num(input.salaryMin), salaryMax: num(input.salaryMax), currency: input.currency || "NGN",
    description: input.description || null,
    requirements: input.requirements || null,
    requirementList: cleanList(input.requirementList),
    skills: cleanList(input.skills),
    benefits: cleanList(input.benefits),
    requireResume: input.requireResume ?? null,
    requirePortfolio: input.requirePortfolio ?? null,
    requireCoverLetter: input.requireCoverLetter ?? null,
    deadline: input.deadline || null,
    applyMethod: input.applyMethod || "nomarc", applyTarget: input.applyTarget || null,
    recruiterName: input.recruiterName || null, recruiterTitle: input.recruiterTitle || null, draft,
    status: "open",
  }).returning({ id: job.id });
  revalidatePath("/dashboard/jobs");
  return row.id;
}

export type JobInput = {
  title: string; company?: string; location?: string; employmentType?: string; experienceLevel?: string;
  workModel?: string; salaryMin?: string; salaryMax?: string; currency?: string; description?: string; requirements?: string;
  requirementList?: string[]; skills?: string[]; benefits?: string[];
  requireResume?: boolean; requirePortfolio?: boolean; requireCoverLetter?: boolean;
  deadline?: string; applyMethod?: "nomarc" | "url" | "email"; applyTarget?: string;
  recruiterName?: string; recruiterTitle?: string;
};

/** The full field set for editing an own job, owner-gated. Reuses the same
 *  columns createJob writes so an edited row is shaped identically. */
export type OwnedJobDetail = JobInput & {
  id: string; salaryMinRaw: number | null; salaryMaxRaw: number | null; status: string; draft: boolean;
};

export async function getOwnedJobForEdit(jobId: string): Promise<OwnedJobDetail | null> {
  const uid = await requireUserId();
  const [j] = await db.select().from(job).where(and(eq(job.id, jobId), eq(job.ownerUserId, uid))).limit(1);
  if (!j) return null;
  return {
    id: j.id,
    title: j.title, company: j.company ?? undefined, location: j.location ?? undefined,
    employmentType: j.employmentType ?? undefined, experienceLevel: j.experienceLevel ?? undefined, workModel: j.workModel ?? undefined,
    salaryMin: j.salaryMin != null ? String(j.salaryMin) : undefined, salaryMax: j.salaryMax != null ? String(j.salaryMax) : undefined,
    currency: j.currency ?? undefined,
    description: j.description ?? undefined, requirements: j.requirements ?? undefined,
    requirementList: j.requirementList ?? [], skills: j.skills ?? [], benefits: j.benefits ?? [],
    requireResume: !!j.requireResume, requirePortfolio: !!j.requirePortfolio, requireCoverLetter: !!j.requireCoverLetter,
    deadline: j.deadline ? j.deadline.slice(0, 10) : undefined,
    applyMethod: ["nomarc", "url", "email"].includes(String(j.applyMethod)) ? (j.applyMethod as "nomarc" | "url" | "email") : "nomarc",
    applyTarget: j.applyTarget ?? undefined,
    recruiterName: j.recruiterName ?? undefined, recruiterTitle: j.recruiterTitle ?? undefined,
    salaryMinRaw: j.salaryMin, salaryMaxRaw: j.salaryMax, status: j.status ?? "open", draft: !!j.draft,
  };
}

/** Edit the content fields of an owned job. The owner is checked server-side
 *  so one user can never mutate another's listing. */
export async function updateJob(jobId: string, input: JobInput) {
  const uid = await requireUserId();
  await assertOwnsJob(jobId, uid);
  if (!input.title.trim()) throw new Error("Job title is required");
  await db.update(job).set({
    title: input.title.trim(), company: input.company || null, location: input.location || null,
    employmentType: input.employmentType || null, experienceLevel: input.experienceLevel || null, workModel: input.workModel || null,
    salaryMin: num(input.salaryMin), salaryMax: num(input.salaryMax), currency: input.currency || "NGN",
    description: input.description || null, requirements: input.requirements || null,
    requirementList: cleanList(input.requirementList), skills: cleanList(input.skills), benefits: cleanList(input.benefits),
    requireResume: input.requireResume ?? null, requirePortfolio: input.requirePortfolio ?? null, requireCoverLetter: input.requireCoverLetter ?? null,
    deadline: input.deadline || null, applyMethod: input.applyMethod || "nomarc", applyTarget: input.applyTarget || null,
    recruiterName: input.recruiterName || null, recruiterTitle: input.recruiterTitle || null,
  }).where(eq(job.id, jobId));
  revalidatePath("/dashboard/jobs/posted");
}

export type JobPostingDetail = {
  requirements: string[];
  skills: string[];
  benefits: string[];
  requireResume: boolean;
  requirePortfolio: boolean;
  requireCoverLetter: boolean;
};

/**
 * The listing fields the job detail and apply screens need. Requirements fall
 * back to the legacy free-text column split on newlines, so jobs posted before
 * drizzle/0044 still show their list rather than nothing.
 */
export async function getJobPostingDetail(jobId: string): Promise<JobPostingDetail> {
  const [r] = await db
    .select({
      requirements: job.requirements, requirementList: job.requirementList,
      skills: job.skills, benefits: job.benefits,
      requireResume: job.requireResume, requirePortfolio: job.requirePortfolio, requireCoverLetter: job.requireCoverLetter,
    })
    .from(job).where(eq(job.id, jobId)).limit(1);

  const legacy = (r?.requirements ?? "")
    .split(/\r?\n/).map((s) => s.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);

  return {
    requirements: r?.requirementList?.length ? r.requirementList : legacy,
    skills: r?.skills ?? [],
    benefits: r?.benefits ?? [],
    // NULL means "posted before requested-documents existed" — enforce nothing.
    requireResume: r?.requireResume ?? false,
    requirePortfolio: r?.requirePortfolio ?? false,
    requireCoverLetter: r?.requireCoverLetter ?? false,
  };
}

export async function getMyPostedJobs(): Promise<PostedJob[]> {
  try {
    const uid = await requireUserId();
    const rows = await db
      .select({
        id: job.id, title: job.title, company: job.company, location: job.location,
        employmentType: job.employmentType, workModel: job.workModel, status: job.status, draft: job.draft,
        salaryMin: job.salaryMin, salaryMax: job.salaryMax, createdAt: job.createdAt,
        description: job.description, requirements: job.requirements, deadline: job.deadline,
        applicants: sql<number>`count(${application.id}) filter (where ${application.draft} = false)`,
        newApplicants: sql<number>`count(${application.id}) filter (where ${application.draft} = false and ${application.status} = 'applied')`,
      })
      .from(job)
      .leftJoin(application, eq(application.jobId, job.id))
      .where(eq(job.ownerUserId, uid))
      .groupBy(job.id)
      .orderBy(desc(job.createdAt));
    return rows.map((r) => {
      const checks: [string, boolean][] = [
        ["Job description", !r.description],
        ["Requirements", !r.requirements],
        ["Compensation", !r.salaryMin && !r.salaryMax],
        ["Application settings", !r.deadline],
      ];
      const missing = checks.filter(([, isMissing]) => isMissing).map(([label]) => label);
      return {
        id: r.id, title: r.title, company: r.company, location: r.location,
        employmentType: r.employmentType, workModel: r.workModel, status: r.status ?? "open", draft: !!r.draft,
        salary: naira(r.salaryMin, r.salaryMax),
        createdAt: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        applicants: Number(r.applicants ?? 0), newApplicants: Number(r.newApplicants ?? 0),
        missing,
        completePercent: Math.round(((checks.length - missing.length) / checks.length) * 100),
      };
    });
  } catch {
    return [];
  }
}

async function assertOwnsJob(jobId: string, uid: string) {
  const [j] = await db.select({ id: job.id }).from(job).where(and(eq(job.id, jobId), eq(job.ownerUserId, uid))).limit(1);
  if (!j) throw new Error("Not found");
}

export async function setJobStatus(jobId: string, status: "open" | "closed") {
  const uid = await requireUserId();
  await assertOwnsJob(jobId, uid);
  await db.update(job).set({ status }).where(eq(job.id, jobId));
  revalidatePath("/dashboard/jobs");
}

export async function publishDraftJob(jobId: string) {
  const uid = await requireUserId();
  await assertOwnsJob(jobId, uid);
  await db.update(job).set({ draft: false }).where(eq(job.id, jobId));
  revalidatePath("/dashboard/jobs");
}

/** Copies a posted job into a new draft (image 107's "Duplicate in drafts"). */
export async function duplicateJobAsDraft(jobId: string) {
  const uid = await requireUserId();
  const [j] = await db.select().from(job).where(and(eq(job.id, jobId), eq(job.ownerUserId, uid))).limit(1);
  if (!j) throw new Error("Not found");
  const [row] = await db.insert(job).values({
    ownerUserId: uid, title: `${j.title} (copy)`, company: j.company, location: j.location,
    employmentType: j.employmentType, workModel: j.workModel, experienceLevel: j.experienceLevel,
    salaryMin: j.salaryMin, salaryMax: j.salaryMax, description: j.description, requirements: j.requirements,
    deadline: j.deadline, applyMethod: j.applyMethod, applyTarget: j.applyTarget,
    recruiterName: j.recruiterName, recruiterTitle: j.recruiterTitle, draft: true, status: "open",
  }).returning({ id: job.id });
  revalidatePath("/dashboard/jobs");
  return row.id;
}

export async function deleteJob(jobId: string) {
  const uid = await requireUserId();
  await assertOwnsJob(jobId, uid);
  await db.delete(job).where(eq(job.id, jobId)); // cascades applications
  revalidatePath("/dashboard/jobs");
}

export async function getJobApplicants(jobId: string): Promise<{ jobTitle: string; applicants: Applicant[] } | null> {
  const uid = await requireUserId();
  const [j] = await db.select().from(job).where(and(eq(job.id, jobId), eq(job.ownerUserId, uid))).limit(1);
  if (!j) return null;
  const res = await db.execute(sql`
    SELECT a.id, a.applicant_user_id AS user_id, a.cover_letter, a.expected_salary, a.resume_url,
           a.portfolio_url, a.linkedin_url, a.status, a.created_at,
           u.name, COALESCE(p.avatar_url, u.image) AS avatar_url, COALESCE(p.headline,'') AS headline
    FROM application a
    JOIN "user" u ON u.id = a.applicant_user_id
    LEFT JOIN profile p ON p.user_id = a.applicant_user_id
    WHERE a.job_id = ${jobId} AND a.draft = false
    ORDER BY a.created_at DESC
  `);
  const applicants = (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), userId: String(r.user_id), name: String(r.name ?? "Applicant"),
    avatarUrl: String(r.avatar_url ?? ""), headline: String(r.headline ?? ""),
    coverLetter: (r.cover_letter as string) ?? null, expectedSalary: (r.expected_salary as string) ?? null,
    resumeUrl: (r.resume_url as string) ?? null, portfolioUrl: (r.portfolio_url as string) ?? null,
    linkedinUrl: (r.linkedin_url as string) ?? null, status: String(r.status ?? "applied"),
    date: r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
  }));
  return { jobTitle: j.title, applicants };
}

/** Employer's open, published jobs — used to invite a professional to apply. */
export async function getMyOpenJobs(): Promise<{ id: string; title: string; company: string | null }[]> {
  const uid = await requireUserId();
  const rows = await db.select({ id: job.id, title: job.title, company: job.company })
    .from(job)
    .where(and(eq(job.ownerUserId, uid), eq(job.status, "open"), eq(job.draft, false)))
    .orderBy(desc(job.createdAt));
  return rows;
}

export async function inviteToApply(input: { jobId: string; inviteeUserId: string; note?: string }) {
  const uid = await requireUserId();
  if (input.inviteeUserId === uid) throw new Error("You can't invite yourself");
  await assertOwnsJob(input.jobId, uid);
  const [j] = await db.select({ title: job.title, company: job.company }).from(job).where(eq(job.id, input.jobId)).limit(1);
  // avoid duplicate pending invites for the same job+person
  const existing = await db.select({ id: jobInvitation.id }).from(jobInvitation)
    .where(and(eq(jobInvitation.jobId, input.jobId), eq(jobInvitation.inviteeUserId, input.inviteeUserId), eq(jobInvitation.status, "pending")))
    .limit(1);
  if (existing.length) throw new Error("You've already invited this person to that job");
  await db.insert(jobInvitation).values({ jobId: input.jobId, inviterUserId: uid, inviteeUserId: input.inviteeUserId, note: input.note || null });
  await db.insert(notification).values({
    userId: input.inviteeUserId, type: "job_invite",
    title: `You've been invited to apply${j?.title ? ` — ${j.title}` : ""}`,
    body: input.note || (j?.company ? `${j.company} would like you to apply.` : "An employer would like you to apply."),
    href: `/dashboard/jobs/apply?job=${input.jobId}`,
  });
  revalidatePath("/dashboard/find-professionals");
}

const STATUS_LABEL: Record<string, string> = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected" };

export async function setApplicationStatus(applicationId: string, status: string) {
  const uid = await requireUserId();
  // ensure the application belongs to a job owned by this user
  const res = await db.execute(sql`
    SELECT a.applicant_user_id, j.title FROM application a JOIN job j ON j.id = a.job_id
    WHERE a.id = ${applicationId} AND j.owner_user_id = ${uid} LIMIT 1
  `);
  const row = (res.rows as { applicant_user_id: string; title: string }[])[0];
  if (!row) throw new Error("Not allowed");
  await db.update(application).set({ status }).where(eq(application.id, applicationId));
  if (status !== "applied") {
    await notify(row.applicant_user_id, {
      type: "application_status",
      title: `Your application moved to ${STATUS_LABEL[status] ?? status}`,
      body: `Update on your application for ${row.title}.`,
      href: "/dashboard/applications",
    });
  }
  revalidatePath("/dashboard/jobs");
}
