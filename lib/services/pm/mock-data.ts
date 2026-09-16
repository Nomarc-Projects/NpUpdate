import type { PmProjectSummary, PmProject, PmColumn, PmTask } from "./types";

const AVATAR = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffd716&textColor=1e1e1e`;

export const MOCK_MEMBERS = [
  { id: "m1", userId: "u1", role: "owner" as const, name: "Sandra James", avatarUrl: AVATAR("SJ") },
  { id: "m2", userId: "u2", role: "member" as const, name: "Tunde Bakare", avatarUrl: AVATAR("TB") },
  { id: "m3", userId: "u3", role: "member" as const, name: "Amaka Obi", avatarUrl: AVATAR("AO") },
  { id: "m4", userId: "u4", role: "viewer" as const, name: "Emeka Eze", avatarUrl: AVATAR("EE") },
];

export const MOCK_PROJECTS: PmProjectSummary[] = [
  {
    id: "proj-1",
    name: "Ibeju-Lekki Estate Phase 1",
    description: "72-unit residential development — structural & MEP coordination",
    status: "active",
    color: "#ffd716",
    dueDate: "2026-09-30",
    startDate: "2026-01-15",
    memberCount: 4,
    taskTotal: 38,
    taskDone: 14,
    taskOverdue: 3,
    members: MOCK_MEMBERS,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj-2",
    name: "Victoria Island Office Fit-out",
    description: "Grade A commercial interior — 4 floors, 3,200 sqm",
    status: "active",
    color: "#6366f1",
    dueDate: "2026-07-01",
    startDate: "2026-03-01",
    memberCount: 2,
    taskTotal: 21,
    taskDone: 9,
    taskOverdue: 1,
    members: MOCK_MEMBERS.slice(0, 2),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj-3",
    name: "Abuja Civic Centre Renovation",
    description: "Heritage building restoration + modern extension",
    status: "active",
    color: "#22c55e",
    dueDate: "2026-12-31",
    startDate: "2026-05-01",
    memberCount: 3,
    taskTotal: 15,
    taskDone: 2,
    taskOverdue: 0,
    members: MOCK_MEMBERS.slice(0, 3),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj-4",
    name: "Port Harcourt Mixed-Use Tower",
    description: "25-storey tower — residential floors 8–25, retail podium",
    status: "archived",
    color: "#9a9a9a",
    dueDate: "2025-12-01",
    startDate: "2025-01-01",
    memberCount: 4,
    taskTotal: 52,
    taskDone: 52,
    taskOverdue: 0,
    members: MOCK_MEMBERS,
    updatedAt: "2025-12-01T00:00:00Z",
  },
];

const TAGS = [
  { id: "tag-1", projectId: "proj-1", name: "Structural", color: "#6366f1" },
  { id: "tag-2", projectId: "proj-1", name: "MEP", color: "#22c55e" },
  { id: "tag-3", projectId: "proj-1", name: "Client approval", color: "#f59e0b" },
  { id: "tag-4", projectId: "proj-1", name: "Blocked", color: "#e5484d" },
];

function task(
  id: string,
  colId: string,
  title: string,
  priority: PmTask["priority"],
  status: PmTask["status"],
  sortOrder: string,
  extras: Partial<PmTask> = {}
): PmTask {
  return {
    id,
    projectId: "proj-1",
    columnId: colId,
    title,
    description: null,
    priority,
    status,
    sortOrder,
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignees: [],
    tags: [],
    subtasks: [],
    attachments: [],
    comments: [],
    _commentCount: 0,
    _attachmentCount: 0,
    ...extras,
  };
}

export const MOCK_PROJECT: PmProject = {
  id: "proj-1",
  ownerUserId: "u1",
  name: "Ibeju-Lekki Estate Phase 1",
  description: "72-unit residential development — structural & MEP coordination",
  status: "active",
  color: "#ffd716",
  startDate: "2026-01-15",
  dueDate: "2026-09-30",
  isTemplate: false,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: new Date().toISOString(),
  members: MOCK_MEMBERS,
  milestones: [
    { id: "ms-1", projectId: "proj-1", name: "Schematic Design Complete", dueDate: "2026-03-01", completed: true, completedAt: "2026-02-28T10:00:00Z", createdAt: "2026-01-15T00:00:00Z" },
    { id: "ms-2", projectId: "proj-1", name: "Planning Approval", dueDate: "2026-05-15", completed: false, createdAt: "2026-01-15T00:00:00Z" },
    { id: "ms-3", projectId: "proj-1", name: "Construction Documents Issued", dueDate: "2026-07-01", completed: false, createdAt: "2026-01-15T00:00:00Z" },
    { id: "ms-4", projectId: "proj-1", name: "Practical Completion", dueDate: "2026-09-30", completed: false, createdAt: "2026-01-15T00:00:00Z" },
  ],
  columns: [
    {
      id: "col-1",
      projectId: "proj-1",
      name: "Backlog",
      color: "#9a9a9a",
      sortOrder: "a",
      tasks: [
        task("t-1", "col-1", "Review geotechnical report", "high", "todo", "a0",
          { assignees: [MOCK_MEMBERS[1]], tags: [TAGS[0]], dueDate: "2026-06-20", _commentCount: 2 }),
        task("t-2", "col-1", "Prepare site survey brief", "medium", "todo", "a1",
          { assignees: [MOCK_MEMBERS[2]], tags: [TAGS[0]], dueDate: "2026-06-25" }),
        task("t-3", "col-1", "Coordinate with LASG building authority", "high", "todo", "a2",
          { tags: [TAGS[2]], dueDate: "2026-06-18", _commentCount: 5 }),
      ],
    },
    {
      id: "col-2",
      projectId: "proj-1",
      name: "In Progress",
      color: "#6366f1",
      sortOrder: "b",
      tasks: [
        task("t-4", "col-2", "Structural grid layout — Block A", "urgent", "in_progress", "b0",
          { assignees: [MOCK_MEMBERS[0], MOCK_MEMBERS[1]], tags: [TAGS[0]], dueDate: "2026-06-15", estimateHours: 40, actualHours: 22, _commentCount: 8, _attachmentCount: 3 }),
        task("t-5", "col-2", "MEP schematic — ground floor", "high", "in_progress", "b1",
          { assignees: [MOCK_MEMBERS[2]], tags: [TAGS[1]], dueDate: "2026-06-22", estimateHours: 30, actualHours: 10 }),
        task("t-6", "col-2", "BoQ — Phase 1 earthworks", "medium", "in_progress", "b2",
          { assignees: [MOCK_MEMBERS[3]], dueDate: "2026-06-30", estimateHours: 16, actualHours: 4, _commentCount: 1 }),
      ],
    },
    {
      id: "col-3",
      projectId: "proj-1",
      name: "In Review",
      color: "#f59e0b",
      sortOrder: "c",
      tasks: [
        task("t-7", "col-3", "Foundation design — piled raft option", "high", "review", "c0",
          { assignees: [MOCK_MEMBERS[0]], tags: [TAGS[0], TAGS[2]], dueDate: "2026-06-10", _commentCount: 12, _attachmentCount: 5 }),
        task("t-8", "col-3", "Client brief — unit configurations", "medium", "review", "c1",
          { assignees: [MOCK_MEMBERS[1]], tags: [TAGS[2]], _commentCount: 3 }),
      ],
    },
    {
      id: "col-4",
      projectId: "proj-1",
      name: "Done",
      color: "#22c55e",
      sortOrder: "d",
      tasks: [
        task("t-9", "col-4", "Concept design presentations", "medium", "done", "d0",
          { assignees: [MOCK_MEMBERS[0]], completedAt: "2026-03-01T10:00:00Z", _commentCount: 6 }),
        task("t-10", "col-4", "Topographical survey", "low", "done", "d1",
          { completedAt: "2026-02-15T10:00:00Z" }),
        task("t-11", "col-4", "Environmental impact assessment", "high", "done", "d2",
          { assignees: [MOCK_MEMBERS[1]], completedAt: "2026-04-01T10:00:00Z", _commentCount: 4 }),
        task("t-12", "col-4", "Project charter sign-off", "medium", "done", "d3",
          { completedAt: "2026-01-20T10:00:00Z" }),
      ],
    },
  ],
  _taskTotal: 38,
  _taskDone: 14,
  _taskOverdue: 3,
};

export async function getProjects(_userId: string): Promise<PmProjectSummary[]> {
  return MOCK_PROJECTS;
}

export async function getProject(_projectId: string): Promise<PmProject | null> {
  return MOCK_PROJECT;
}
