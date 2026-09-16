/**
 * Seeds a handful of sample professionals (Better Auth users + profiles + skills
 * + experience + education + certs) so the Find Professionals directory is real.
 * Idempotent. Run: doppler run -p nomarc -c dev -- npx tsx scripts/seed-directory.ts
 */
import { sql, inArray, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import { profile, profileSkill, workExperience, education, certification } from "../lib/db/schema";

type Pro = {
  name: string; email: string; headline: string; location: string; availability: string;
  avatarUrl: string; bio: string; verified: boolean; successScore: number; years: number;
  skills: string[]; specializations: string[];
  experience: { title: string; company: string; startDate: string; endDate?: string; current?: boolean; location?: string }[];
  education: { school: string; degree?: string; field?: string; startYear?: number; endYear?: number }[];
  certifications: { name: string; issuer?: string; year?: number }[];
};

const PROS: Pro[] = [
  {
    name: "Samir Hassan", email: "samir.dir@nomarc.test", headline: "BIM Specialist", location: "Abuja, Nigeria",
    availability: "open_to_work", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "BIM specialist with 7 years coordinating multidisciplinary models on large commercial builds across Nigeria. I turn fragmented drawings into clash-free, constructible models.",
    verified: true, successScore: 88, years: 7,
    skills: ["Navisworks", "Revit", "AutoCAD", "Dynamo", "MS Project"], specializations: ["BIM Coordination", "Clash Detection"],
    experience: [{ title: "BIM Specialist", company: "GreenHouse Constructions", startDate: "2020-02-01", current: true, location: "Abuja" }, { title: "CAD Coordinator", company: "Arcline", startDate: "2016-06-01", endDate: "2020-01-01" }],
    education: [{ school: "Ahmadu Bello University", degree: "B.Eng", field: "Civil Engineering", startYear: 2011, endYear: 2015 }],
    certifications: [{ name: "Autodesk Revit Professional", issuer: "Autodesk", year: 2021 }],
  },
  {
    name: "Funke Ola-Bello", email: "funke.dir@nomarc.test", headline: "Interior Designer", location: "Lagos, Nigeria",
    availability: "open_to_work", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    bio: "Interior designer crafting warm, functional residential and hospitality spaces. I balance aesthetics with budget and locally sourced finishes.",
    verified: true, successScore: 84, years: 6,
    skills: ["SketchUp", "Blender", "D5 Render", "AutoCAD", "Adobe Suite"], specializations: ["Residential Interiors", "Hospitality"],
    experience: [{ title: "Interior Designer", company: "InteByDee", startDate: "2019-03-01", current: true, location: "Lagos" }],
    education: [{ school: "Yaba College of Technology", degree: "HND", field: "Interior Design", startYear: 2012, endYear: 2016 }],
    certifications: [],
  },
  {
    name: "Ngozi Obi", email: "ngozi.dir@nomarc.test", headline: "Structural Engineer", location: "Enugu, Nigeria",
    availability: "", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    bio: "Structural engineer specialising in reinforced concrete and steel frames for mid-rise developments. COREN-registered.",
    verified: true, successScore: 79, years: 9,
    skills: ["ETABS", "STAAD.Pro", "AutoCAD", "Prokon"], specializations: ["RC Design", "Steel Structures"],
    experience: [{ title: "Structural Engineer", company: "Foundations Ltd", startDate: "2017-01-01", current: true, location: "Enugu" }],
    education: [{ school: "University of Nigeria, Nsukka", degree: "B.Eng", field: "Civil Engineering", startYear: 2008, endYear: 2013 }],
    certifications: [{ name: "COREN Registered Engineer", issuer: "COREN", year: 2018 }],
  },
  {
    name: "Emeka Nwankwo", email: "emeka.dir@nomarc.test", headline: "Quantity Surveyor", location: "Port Harcourt, Nigeria",
    availability: "open_to_work", avatarUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80",
    bio: "Quantity surveyor with a decade of cost planning, BoQ preparation and contract administration on oil-and-gas and commercial projects.",
    verified: false, successScore: 72, years: 10,
    skills: ["CostX", "Cubicost", "Excel", "Procore"], specializations: ["Cost Planning", "Contract Administration"],
    experience: [{ title: "Senior Quantity Surveyor", company: "DeltaBuild", startDate: "2015-05-01", current: true, location: "Port Harcourt" }],
    education: [{ school: "Federal University of Technology, Owerri", degree: "B.Tech", field: "Quantity Surveying", startYear: 2006, endYear: 2011 }],
    certifications: [{ name: "NIQS Member", issuer: "Nigerian Institute of Quantity Surveyors", year: 2016 }],
  },
  {
    name: "Aisha Bello", email: "aisha.dir@nomarc.test", headline: "Project Manager", location: "Abuja, Nigeria",
    availability: "hiring", avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
    bio: "Construction project manager delivering residential estates on time and on budget. PMP-certified, strong in stakeholder coordination.",
    verified: false, successScore: 68, years: 8,
    skills: ["MS Project", "Primavera P6", "Procore", "Lean Construction"], specializations: ["Residential Estates", "Stakeholder Management"],
    experience: [{ title: "Project Manager", company: "Urban Nest Developments", startDate: "2018-08-01", current: true, location: "Abuja" }],
    education: [{ school: "Bayero University Kano", degree: "B.Sc", field: "Building", startYear: 2009, endYear: 2014 }],
    certifications: [{ name: "PMP", issuer: "PMI", year: 2019 }],
  },
  {
    name: "Daniel Okafor", email: "daniel.dir@nomarc.test", headline: "3D Visualizer", location: "Remote",
    availability: "open_to_work", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    bio: "Architectural 3D visualizer producing photoreal exteriors and interiors. I help firms win pitches with imagery clients can feel.",
    verified: false, successScore: 64, years: 4,
    skills: ["3ds Max", "Corona", "V-Ray", "Photoshop", "Lumion"], specializations: ["Architectural Visualization", "Animation"],
    experience: [{ title: "3D Visualizer", company: "Freelance", startDate: "2021-01-01", current: true, location: "Remote" }],
    education: [{ school: "Covenant University", degree: "B.Sc", field: "Architecture", startYear: 2015, endYear: 2020 }],
    certifications: [],
  },
];

async function main() {
  // create auth users (idempotent)
  for (const p of PROS) {
    try {
      // `role` is not an accepted sign-up input (it gates the admin console);
      // set it directly after the account exists.
      const created = await auth.api.signUpEmail({ body: { name: p.name, email: p.email, password: "Password123!" } });
      if (created?.user?.id) {
        await db.execute(sql`UPDATE "user" SET role = 'professional' WHERE id = ${created.user.id}`);
      }
      console.log(`✓ user ${p.email}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/exist|already|unique/i.test(msg)) console.log(`• user exists ${p.email}`);
      else { console.error(`✗ ${p.email}: ${msg}`); }
    }
  }

  const emails = PROS.map((p) => p.email);
  const res = await db.execute(sql`select id, email from "user" where email in (${sql.join(emails.map((e) => sql`${e}`), sql`, `)})`);
  const idByEmail = new Map((res.rows as { id: string; email: string }[]).map((r) => [r.email, r.id]));
  const ids = [...idByEmail.values()];

  // clear prior app rows for these users
  await db.delete(workExperience).where(inArray(workExperience.userId, ids));
  await db.delete(education).where(inArray(education.userId, ids));
  await db.delete(profileSkill).where(inArray(profileSkill.userId, ids));
  await db.delete(certification).where(inArray(certification.userId, ids));
  await db.delete(profile).where(inArray(profile.userId, ids));

  for (const p of PROS) {
    const uid = idByEmail.get(p.email);
    if (!uid) continue;
    await db.insert(profile).values({
      userId: uid, headline: p.headline, bio: p.bio, location: p.location, availability: p.availability || null,
      avatarUrl: p.avatarUrl, yearsExperience: p.years, successScore: p.successScore, verified: p.verified, completeness: 90,
    });
    for (const s of p.skills) await db.insert(profileSkill).values({ userId: uid, name: s, kind: "skill" });
    for (const s of p.specializations) await db.insert(profileSkill).values({ userId: uid, name: s, kind: "specialization" });
    for (const e of p.experience) await db.insert(workExperience).values({ userId: uid, title: e.title, company: e.company, startDate: e.startDate, endDate: e.current ? null : e.endDate ?? null, current: !!e.current, location: e.location ?? null });
    for (const e of p.education) await db.insert(education).values({ userId: uid, school: e.school, degree: e.degree ?? null, field: e.field ?? null, startYear: e.startYear ?? null, endYear: e.endYear ?? null });
    for (const c of p.certifications) await db.insert(certification).values({ userId: uid, name: c.name, issuer: c.issuer ?? null, year: c.year ?? null });
    console.log(`  + profile ${p.name}`);
  }
  console.log("directory seeded");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
