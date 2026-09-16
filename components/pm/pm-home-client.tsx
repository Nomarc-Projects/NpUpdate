"use client";
import { useState } from "react";
import { Plus, Archive, ChevronDown, ChevronUp } from "lucide-react";
import type { PmProjectSummary } from "@/lib/services/pm/types";
import { ProjectCard } from "./project-card";
import { NewProjectModal } from "./new-project-modal";

interface Props {
  projects?: PmProjectSummary[];
  active?: PmProjectSummary[];
  archived?: PmProjectSummary[];
  showNewButton?: boolean;
}

export function PmHomeClient({ projects = [], active = [], archived = [], showNewButton }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (showNewButton) {
    return (
      <>
        <button
          data-tour="pm-new-project"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"
        >
          <Plus size={15} /> New project
        </button>
        <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-[#1e1e1e] dark:text-white">No projects yet</h3>
          <p className="mt-2 max-w-sm text-[13px] text-[#9a9a9a] leading-relaxed">
            Create your first project workspace to start managing tasks, milestones, and team coordination.
          </p>
          <button
            onClick={() => setNewOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"
          >
            <Plus size={16} /> Create your first project
          </button>
        </div>
        <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
      </>
    );
  }

  return (
    <>
      {/* Active projects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {active.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="flex items-center gap-2 text-[12px] font-semibold text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
          >
            <Archive size={13} /> Archived ({archived.length})
            {showArchived ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showArchived && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
              {archived.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      )}

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
