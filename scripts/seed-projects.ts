/**
 * Seeds sample PM projects with tasks, columns, milestones, and tags.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/seed-projects.ts
 *
 * Expects the PM tables to exist (migration 0006_project_management.sql).
 * Assigns projects to the seeded "pro@nomarc.test" user.
 */
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import {
  pmProject, pmProjectMember, pmColumn, pmTask, pmTag, pmTaskTag, pmMilestone,
} from "../lib/db/schema";

import { sql } from "drizzle-orm";

async function getUser(email: string): Promise<string> {
  const res = await db.execute(sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`);
  const row = (res.rows as { id: string }[])[0];
  if (!row) throw new Error(`User ${email} not found — run seed-auth.ts first`);
  return row.id;
}

const PROJECTS = [
  {
    name: "Ibeju-Lekki Estate Phase 1",
    description: "30-unit residential estate in Ibeju-Lekki. Scope includes substructure, superstructure, finishes, and external works. Target handover Q4 2026.",
    color: "#ffd716",
    startDate: "2026-03-01",
    dueDate: "2026-12-15",
    tags: [
      { name: "Structural", color: "#6366f1" },
      { name: "Urgent", color: "#ef4444" },
      { name: "Client Review", color: "#f59e0b" },
      { name: "Procurement", color: "#22c55e" },
    ],
    milestones: [
      { name: "Site possession", dueDate: "2026-03-15" },
      { name: "Foundation complete", dueDate: "2026-05-01" },
      { name: "Frame complete", dueDate: "2026-08-01" },
      { name: "Practical completion", dueDate: "2026-12-01" },
    ],
    tasks: [
      { title: "Complete topographic survey", status: "done", priority: "high", col: 3 },
      { title: "Soil investigation report", status: "done", priority: "high", col: 3 },
      { title: "Architectural drawings — Block A", status: "done", priority: "high", col: 3 },
      { title: "Structural design — Block A", status: "review", priority: "high", col: 2, tags: ["Structural"] },
      { title: "MEP layout — Block A", status: "in_progress", priority: "medium", col: 1, tags: ["Client Review"] },
      { title: "Submit building plan approval (LASBCA)", status: "in_progress", priority: "urgent", col: 1, tags: ["Urgent"] },
      { title: "Procure reinforcement steel (BRC)", status: "todo", priority: "high", col: 0, tags: ["Procurement"] },
      { title: "Concrete mix design approval", status: "todo", priority: "medium", col: 0, tags: ["Structural"] },
      { title: "Site clearing and demolition", status: "todo", priority: "medium", col: 0 },
      { title: "Piling works — Block A", status: "todo", priority: "high", col: 0, tags: ["Structural"] },
      { title: "Block A substructure concrete", status: "todo", priority: "high", col: 0, tags: ["Structural", "Urgent"] },
      { title: "Engage quantity surveyor for BOQ review", status: "in_progress", priority: "medium", col: 1 },
    ],
  },
  {
    name: "Eko Tower Renovation",
    description: "Interior fit-out and facade renovation of 12-storey commercial tower in Victoria Island. Focus on energy efficiency and modern finishes.",
    color: "#6366f1",
    startDate: "2026-04-01",
    dueDate: "2026-09-30",
    tags: [
      { name: "Design", color: "#8b5cf6" },
      { name: "MEP", color: "#06b6d4" },
      { name: "Finishes", color: "#ec4899" },
    ],
    milestones: [
      { name: "Design freeze", dueDate: "2026-05-01" },
      { name: "Facade panels delivered", dueDate: "2026-06-15" },
      { name: "Handover", dueDate: "2026-09-15" },
    ],
    tasks: [
      { title: "Client brief and space planning", status: "done", priority: "high", col: 3 },
      { title: "Facade material selection", status: "done", priority: "high", col: 3, tags: ["Design"] },
      { title: "HVAC system redesign", status: "in_progress", priority: "high", col: 1, tags: ["MEP"] },
      { title: "Electrical load assessment", status: "in_progress", priority: "medium", col: 1, tags: ["MEP"] },
      { title: "Floor finish samples — client approval", status: "review", priority: "medium", col: 2, tags: ["Finishes"] },
      { title: "Fire safety compliance audit", status: "todo", priority: "urgent", col: 0 },
      { title: "Lobby and reception design", status: "todo", priority: "medium", col: 0, tags: ["Design", "Finishes"] },
      { title: "Procurement — ACP panels", status: "todo", priority: "high", col: 0 },
    ],
  },
  {
    name: "Abuja Housing Masterplan",
    description: "Masterplan and concept design for a 200-unit affordable housing development in Abuja. Feasibility study, site analysis, and stakeholder engagement.",
    color: "#22c55e",
    startDate: "2026-05-15",
    dueDate: "2027-03-01",
    tags: [
      { name: "Feasibility", color: "#16a34a" },
      { name: "Stakeholder", color: "#eab308" },
    ],
    milestones: [
      { name: "Feasibility report submitted", dueDate: "2026-07-01" },
      { name: "Masterplan approved", dueDate: "2026-10-01" },
    ],
    tasks: [
      { title: "Site visit and survey", status: "done", priority: "high", col: 3, tags: ["Feasibility"] },
      { title: "Environmental impact assessment", status: "in_progress", priority: "high", col: 1, tags: ["Feasibility"] },
      { title: "Community engagement workshop", status: "todo", priority: "medium", col: 0, tags: ["Stakeholder"] },
      { title: "Draft masterplan layout", status: "todo", priority: "high", col: 0 },
      { title: "Cost estimate — infrastructure", status: "todo", priority: "medium", col: 0 },
      { title: "Present to state housing authority", status: "todo", priority: "medium", col: 0, tags: ["Stakeholder"] },
    ],
  },
];

const COL_NAMES = ["To do", "In progress", "Review", "Done"];
const COL_COLORS = ["#9a9a9a", "#3b82f6", "#f59e0b", "#22c55e"];

async function main() {
  const uid = await getUser("pro@nomarc.test");
  console.log(`Seeding projects for user ${uid}...`);

  for (const p of PROJECTS) {
    // check if already seeded
    const existing = await db.select({ id: pmProject.id }).from(pmProject).where(eq(pmProject.name, p.name)).limit(1);
    if (existing.length) {
      console.log(`• exists: ${p.name}`);
      continue;
    }

    // create project
    const [proj] = await db.insert(pmProject).values({
      ownerUserId: uid, name: p.name, description: p.description, color: p.color,
      startDate: p.startDate, dueDate: p.dueDate,
    }).returning({ id: pmProject.id });

    // add owner as member
    await db.insert(pmProjectMember).values({ projectId: proj.id, userId: uid, role: "owner" });

    // create columns
    const colIds: string[] = [];
    for (let i = 0; i < COL_NAMES.length; i++) {
      const [col] = await db.insert(pmColumn).values({
        projectId: proj.id, name: COL_NAMES[i], color: COL_COLORS[i], sortOrder: `a${i}`,
      }).returning({ id: pmColumn.id });
      colIds.push(col.id);
    }

    // create tags
    const tagMap = new Map<string, string>();
    for (const tag of p.tags) {
      const [t] = await db.insert(pmTag).values({ projectId: proj.id, name: tag.name, color: tag.color }).returning({ id: pmTag.id });
      tagMap.set(tag.name, t.id);
    }

    // create milestones
    for (const ms of p.milestones) {
      await db.insert(pmMilestone).values({ projectId: proj.id, name: ms.name, dueDate: ms.dueDate });
    }

    // create tasks
    for (let i = 0; i < p.tasks.length; i++) {
      const task = p.tasks[i];
      const [t] = await db.insert(pmTask).values({
        projectId: proj.id,
        columnId: colIds[task.col],
        title: task.title,
        priority: task.priority,
        status: task.status,
        sortOrder: String(i).padStart(4, "0"),
        createdBy: uid,
        completedAt: task.status === "done" ? new Date() : null,
      }).returning({ id: pmTask.id });

      // link tags
      if (task.tags) {
        for (const tagName of task.tags) {
          const tagId = tagMap.get(tagName);
          if (tagId) await db.insert(pmTaskTag).values({ taskId: t.id, tagId });
        }
      }
    }

    console.log(`✓ seeded: ${p.name} (${p.tasks.length} tasks, ${p.milestones.length} milestones)`);
  }

  console.log("\nDone. Projects visible at /dashboard/project-management");
  process.exit(0);
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
