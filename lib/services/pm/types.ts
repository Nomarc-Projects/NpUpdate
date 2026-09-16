export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type ProjectStatus = "active" | "archived" | "completed";
export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface PmMember {
  id: string;
  userId: string;
  role: MemberRole;
  name: string;
  avatarUrl?: string | null;
  email?: string;
}

export interface PmTag {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface PmAttachment {
  id: string;
  taskId: string;
  name: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface PmComment {
  id: string;
  taskId: string;
  authorUserId: string;
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  editedAt?: string | null;
  createdAt: string;
}

export interface PmSubtask {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  sortOrder: string;
}

export interface PmTask {
  id: string;
  projectId: string;
  columnId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  sortOrder: string;
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  estimateHours?: number | null;
  actualHours?: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignees: PmMember[];
  tags: PmTag[];
  subtasks: PmSubtask[];
  attachments: PmAttachment[];
  comments: PmComment[];
  _commentCount?: number;
  _attachmentCount?: number;
}

export interface PmColumn {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: string;
  tasks: PmTask[];
}

export interface PmMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
}

export interface PmProject {
  id: string;
  ownerUserId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: string;
  icon?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  members: PmMember[];
  milestones: PmMilestone[];
  columns: PmColumn[];
  _taskTotal?: number;
  _taskDone?: number;
  _taskOverdue?: number;
}

export interface PmProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: string;
  icon?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  memberCount: number;
  taskTotal: number;
  taskDone: number;
  taskOverdue: number;
  members: PmMember[];
  updatedAt: string;
}
