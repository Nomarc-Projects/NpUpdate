"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { profileSkill, workExperience, education, certification, recommendation } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { getServicesForUser, type ServiceWithTiers } from "@/lib/services/services";
import { notify } from "@/lib/notify-internal";
import { inferDiscipline } from "@/lib/helm/disciplines";

export type ProCard = {
  id: string;
  name: string;
  avatarUrl: string;
  headline: string;
  location: string;
  availability: string;
  verified: boolean;
  successScore: number;
  years: number;
  skills: string[];
  ratingAvg: number;
  ratingCount: number;
  /** raw practice_status: intern | graduate | consultant | licensed | company.
   *  Drives the Practice status filter on Find Professionals. */
  practiceStatus: string;
  /** canonical profession axis — schema.profile.discipline, inferred from the
   *  headline when unset. Lets the Occupation filter match the real profession
   *  even when the free-text headline was never filled at onboarding. */
  discipline: string;
  /** True when the professional's practice status is "company" — see
   *  schema.profile.practiceStatus. Drives the Individual/Company filter on
   *  Find Professionals. */
  isCompany: boolean;
};

export type ProDetail = {
  id: string;
  name: string;
  avatarUrl: string;
  headline: string;
  location: string;
  availability: string;
  verified: boolean;
  about: string;
  experience: [string, string][];
  education: [string, string][];
  specialization: string[];
  skills: string[];
  certifications: [string, string][];
  positions: string[];
  recommendations: { name: string; role: string; date: string; body: string; avatarUrl: string }[];
  services: ServiceWithTiers[];
};

const AVAIL_LABEL: Record<string, string> = { open_to_work: "Open to work", "Open to work": "Open to work", hiring: "Hiring" };
const avail = (a: string | null) => (a ? AVAIL_LABEL[a] ?? "" : "");

/** All professionals, ranked verified-first then by success score. Joins Better
 *  Auth `user` (not in the Drizzle schema) via raw SQL for name/avatar. */
export async function getProfessionals(): Promise<ProCard[]> {
  const res = await db.execute(sql`
    SELECT u.id, u.name, COALESCE(p.avatar_url, u.image) AS avatar_url,
           COALESCE(p.headline,'') AS headline, COALESCE(p.location,'') AS location,
           COALESCE(p.availability,'') AS availability, COALESCE(p.verified,false) AS verified,
           COALESCE(p.practice_status,'') AS practice_status,
           COALESCE(p.discipline,'') AS discipline,
           COALESCE(p.success_score,0) AS success_score, COALESCE(p.years_experience,0) AS years,
           COALESCE((SELECT round(avg(rating)::numeric,1) FROM review WHERE subject_type='professional' AND subject_id=u.id),0) AS rating_avg,
           COALESCE((SELECT count(*) FROM review WHERE subject_type='professional' AND subject_id=u.id),0) AS rating_count
    FROM profile p JOIN "user" u ON u.id = p.user_id
    ORDER BY COALESCE(p.verified,false) DESC, u.name ASC
  `);
  const rows = res.rows as Record<string, unknown>[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const skills = await db.select().from(profileSkill).where(and(inArray(profileSkill.userId, ids), eq(profileSkill.kind, "skill")));
  const byUser = new Map<string, string[]>();
  for (const s of skills) {
    const arr = byUser.get(s.userId) ?? [];
    if (arr.length < 4) arr.push(s.name);
    byUser.set(s.userId, arr);
  }
  return rows.map((r) => {
    const id = String(r.id);
    const all = skills.filter((s) => s.userId === id).length;
    const shown = byUser.get(id) ?? [];
    const skillsList = all > 4 ? [...shown.slice(0, 3), `+${all - 3}`] : shown;
    return {
      id,
      name: String(r.name ?? "Professional"),
      avatarUrl: String(r.avatar_url ?? ""),
      headline: String(r.headline ?? ""),
      location: String(r.location ?? ""),
      availability: avail(r.availability as string),
      verified: r.verified === true,
      isCompany: String(r.practice_status ?? "") === "company",
      practiceStatus: String(r.practice_status ?? ""),
      discipline: String(r.discipline ?? "") || inferDiscipline(String(r.headline ?? "")) || "",
      successScore: Number(r.success_score ?? 0),
      years: Number(r.years ?? 0),
      skills: skillsList,
      ratingAvg: Number(r.rating_avg ?? 0),
      ratingCount: Number(r.rating_count ?? 0),
    };
  });
}

export type PeopleRow = {
  id: string; name: string; avatarUrl: string; currentRole: string; company: string;
  email: string; phone: string; location: string; availability: string; verified: boolean; years: number;
};

/**
 * The Directory > People table (images 50/51/54) — distinct from
 * `getProfessionals` (the talent-search cards on Find Professionals): this
 * surfaces contact-style columns (email/phone) for browsing your network,
 * not a hiring search. Filters are applied client-side over this full set —
 * the directory is small enough (dozens, not thousands) that a DB-side
 * filter isn't worth the added complexity yet.
 */
export async function getPeopleDirectory(): Promise<PeopleRow[]> {
  const res = await db.execute(sql`
    SELECT u.id, u.name, u.email, COALESCE(p.avatar_url, u.image) AS avatar_url,
           COALESCE(p.headline,'') AS headline, COALESCE(p.phone,'') AS phone,
           COALESCE(p.location,'') AS location, COALESCE(p.availability,'') AS availability,
           COALESCE(p.verified,false) AS verified, COALESCE(p.years_experience,0) AS years
    FROM profile p JOIN "user" u ON u.id = p.user_id
    ORDER BY COALESCE(p.verified,false) DESC, u.name ASC
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => {
    const headline = String(r.headline ?? "");
    const [currentRole, company] = headline.includes(" at ") ? headline.split(/ at (.+)/) : [headline, ""];
    return {
      id: String(r.id), name: String(r.name ?? "Member"), avatarUrl: String(r.avatar_url ?? ""),
      currentRole: currentRole || "Professional", company,
      email: String(r.email ?? ""), phone: String(r.phone ?? ""),
      location: String(r.location ?? ""), availability: avail(r.availability as string),
      verified: r.verified === true, years: Number(r.years ?? 0),
    };
  });
}

export async function getProfessionalDetail(userId: string): Promise<ProDetail | null> {
  const res = await db.execute(sql`
    SELECT u.id, u.name, COALESCE(p.avatar_url, u.image) AS avatar_url,
           COALESCE(p.headline,'') AS headline, COALESCE(p.location,'') AS location,
           COALESCE(p.availability,'') AS availability, COALESCE(p.verified,false) AS verified,
           COALESCE(p.bio,'') AS bio
    FROM "user" u LEFT JOIN profile p ON p.user_id = u.id WHERE u.id = ${userId} LIMIT 1
  `);
  const r = (res.rows as Record<string, unknown>[])[0];
  if (!r) return null;

  const [exp, edu, skillRows, certs, recs, services] = await Promise.all([
    db.select().from(workExperience).where(eq(workExperience.userId, userId)).orderBy(desc(workExperience.startDate)),
    db.select().from(education).where(eq(education.userId, userId)).orderBy(desc(education.endYear)),
    db.select().from(profileSkill).where(eq(profileSkill.userId, userId)),
    db.select().from(certification).where(eq(certification.userId, userId)).orderBy(desc(certification.year)),
    db.execute(sql`
      SELECT r.body, r.relationship, r.created_at, u.name AS rec_name, u.image AS rec_image
      FROM recommendation r JOIN "user" u ON u.id = r.recommender_user_id
      WHERE r.recommendee_user_id = ${userId} AND r.status = 'approved'
      ORDER BY r.created_at DESC`),
    getServicesForUser(userId),
  ]);

  const yr = (d: string | null) => (d ? new Date(d + "T00:00:00").getFullYear().toString() : "");
  return {
    id: userId,
    name: String(r.name ?? "Professional"),
    avatarUrl: String(r.avatar_url ?? ""),
    headline: String(r.headline ?? ""),
    location: String(r.location ?? ""),
    availability: avail(r.availability as string),
    verified: r.verified === true,
    about: String(r.bio ?? ""),
    experience: exp.map((e) => [`${e.title}${e.company ? ` • ${e.company}` : ""}`, `${yr(e.startDate)} — ${e.current ? "Present" : yr(e.endDate) || "—"}`] as [string, string]),
    education: edu.map((e) => [e.school, `${[e.degree, e.field].filter(Boolean).join(" - ")}${e.endYear ? ` • ${e.startYear ?? ""}${e.startYear ? " — " : ""}${e.endYear}` : ""}`] as [string, string]),
    specialization: skillRows.filter((s) => s.kind === "specialization").map((s) => s.name),
    skills: skillRows.filter((s) => (s.kind ?? "skill") === "skill").map((s) => s.name),
    certifications: certs.map((c) => [c.name, `${[c.issuer, c.year].filter(Boolean).join(" • ")}`] as [string, string]),
    positions: exp.map((e) => `${e.title}${e.company ? ` • ${e.company}` : ""}`),
    recommendations: (recs.rows as Record<string, unknown>[]).map((x) => ({
      name: String(x.rec_name ?? "Member"),
      role: String(x.relationship ?? ""),
      date: x.created_at ? new Date(String(x.created_at)).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
      body: String(x.body ?? ""),
      avatarUrl: String(x.rec_image ?? ""),
    })),
    services,
  };
}

export async function recommendProfessional(input: { recommendeeUserId: string; relationship?: string; positionAtTime?: string; body: string }) {
  const uid = await requireUserId();
  if (!input.body.trim()) throw new Error("Write a few words before sending");
  if (input.recommendeeUserId === uid) throw new Error("You can't recommend yourself");
  await db.insert(recommendation).values({
    recommenderUserId: uid,
    recommendeeUserId: input.recommendeeUserId,
    relationship: input.relationship || null,
    positionAtTime: input.positionAtTime || null,
    body: input.body.trim(),
    status: "pending",
  });
  const me = await db.execute(sql`SELECT name FROM "user" WHERE id = ${uid} LIMIT 1`);
  const myName = String((me.rows as { name?: string }[])[0]?.name ?? "Someone");
  await notify(input.recommendeeUserId, {
    type: "recommendation",
    title: `${myName} recommended you`,
    body: "Review and approve it to show it on your profile.",
    href: "/dashboard/profile",
  });
  revalidatePath("/dashboard/find-professionals");
}
