import { KanbanSquare, Plus, Archive } from "lucide-react";
import { listProjects } from "@/lib/services/pm/projects";
import { PmHomeClient } from "@/components/pm/pm-home-client";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { FeatureLockedScreen } from "@/components/dashboard/feature-gate-page";
import { HelmCopilot } from "@/components/helm/helm-copilot";

export default async function ProjectManagementPage() {
  // Plan gate: Project Management requires the Plus plan. Non-subscribers get the
  // upgrade screen and we never fetch their projects.
  const viewer = await getViewer();
  if (!can(viewer, "projectManagement")) {
    return <FeatureLockedScreen config={{
      cap: "projectManagement",
      name: "Project Management",
      tagline: "Plan, track and deliver your construction projects",
      description: "A full Kanban + list + timeline project workspace — tasks, milestones, team members and activity, built for construction delivery.",
      iconName: "kanbanSquare",
      requiredPlan: "plus",
      points: [
        { title: "Kanban & list views", desc: "Organise work into columns, drag tasks across stages, and track progress." },
        { title: "Milestones & deadlines", desc: "Set milestones, due dates and see what's at risk at a glance." },
        { title: "Team collaboration", desc: "Add members, assign tasks, comment and keep an activity trail." },
        { title: "Templates to project", desc: "Spin up projects from business templates in one click." },
      ],
    }} />;
  }

  const projects = await listProjects("me");
  const active = projects.filter((p) => p.status !== "archived");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[1100px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]">
              <KanbanSquare size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Project Management</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">{active.length} active project{active.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <PmHomeClient showNewButton projects={projects} />
        </div>

        <div className="p-6">
          <PmHomeClient projects={projects} active={active} archived={archived} />
        </div>
      </div>
      <HelmCopilot
        context="Project Management"
        starters={[
          "Draft a phased programme for a new project",
          "Suggest a task breakdown for a site setup",
          "What milestones should a fit-out project have?",
        ]}
      />
    </div>
  );
}
