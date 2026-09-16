"use server";

import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  profile, workExperience, education, profileSkill, certification, project, service, serviceTier,
  company, product, application, recommendation, review, savedItem, list,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";

/** NDPR "download my data": a JSON snapshot of everything tied to the account. */
export async function exportMyData() {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });

  const [prof, exp, edu, skills, certs, projects, services, applications, recsGiven, recsReceived, reviewsGiven, saved, lists, comp] = await Promise.all([
    db.select().from(profile).where(eq(profile.userId, uid)),
    db.select().from(workExperience).where(eq(workExperience.userId, uid)),
    db.select().from(education).where(eq(education.userId, uid)),
    db.select().from(profileSkill).where(eq(profileSkill.userId, uid)),
    db.select().from(certification).where(eq(certification.userId, uid)),
    db.select().from(project).where(eq(project.userId, uid)),
    db.select().from(service).where(eq(service.userId, uid)),
    db.select().from(application).where(eq(application.applicantUserId, uid)),
    db.select().from(recommendation).where(eq(recommendation.recommenderUserId, uid)),
    db.select().from(recommendation).where(eq(recommendation.recommendeeUserId, uid)),
    db.select().from(review).where(eq(review.reviewerUserId, uid)),
    db.select().from(savedItem).where(eq(savedItem.userId, uid)),
    db.select().from(list).where(eq(list.userId, uid)),
    db.select().from(company).where(eq(company.ownerUserId, uid)),
  ]);

  let products: unknown[] = [];
  let tiers: unknown[] = [];
  if (comp[0]) products = await db.select().from(product).where(eq(product.companyId, comp[0].id));
  if (services.length) tiers = await db.select().from(serviceTier).where(or(...services.map((s) => eq(serviceTier.serviceId, s.id))));

  return {
    exportedAt: new Date().toISOString(),
    account: { id: uid, name: session?.user?.name, email: session?.user?.email, role: (session?.user as { role?: string } | undefined)?.role },
    profile: prof[0] ?? null,
    workExperience: exp, education: edu, skills, certifications: certs, projects,
    services: services.map((s) => ({ ...s, tiers: (tiers as { serviceId: string }[]).filter((t) => t.serviceId === s.id) })),
    company: comp[0] ?? null, products,
    applications, recommendationsGiven: recsGiven, recommendationsReceived: recsReceived,
    reviewsGiven, savedItems: saved, lists,
  };
}
