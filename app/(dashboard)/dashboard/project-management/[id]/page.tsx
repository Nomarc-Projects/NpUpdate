import { notFound, redirect } from "next/navigation";
import { fetchProject } from "@/lib/services/pm/projects";
import { ProjectWorkspace } from "@/components/pm/project-workspace";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { HelmCopilot } from "@/components/helm/helm-copilot";

type View = "board" | "list" | "calendar" | "timeline";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { view: rawView } = await searchParams;

  // Plan gate: bounce non-Plus users back to the (gated) PM home.
  const viewer = await getViewer();
  if (!can(viewer, "projectManagement")) redirect("/dashboard/project-management");

  const project = await fetchProject(id);
  if (!project) notFound();

  const validViews: View[] = ["board", "list", "calendar", "timeline"];
  const view: View = validViews.includes(rawView as View) ? (rawView as View) : "board";

  return (
    <div className="bg-[#f7f8fa] dark:bg-[#111] min-h-[calc(100vh-56px)] lg:min-h-screen">
      <div className="bg-white dark:bg-[#1a1a1a]">
        <ProjectWorkspace project={project} initialView={view} />
      </div>
      <HelmCopilot
        projectId={project.id}
        context={`Project: ${project.name}`}
        starters={[
          "What should I work on next here?",
          "Draft the remaining tasks for this project",
          "Flag any risks in this project's plan",
        ]}
      />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await fetchProject(id);
  return { title: project ? `${project.name} — Nomarc` : "Project — Nomarc" };
}
