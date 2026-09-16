"use client";
import Link from "next/link";
import { Calendar, CheckCircle2, AlertCircle, MoreVertical, Archive, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { PmProjectSummary } from "@/lib/services/pm/types";
import { MemberAvatars } from "./member-avatars";

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

export function ProjectCard({ project }: { project: PmProjectSummary }) {
  const [menu, setMenu] = useState(false);
  const pct = project.taskTotal > 0 ? Math.round((project.taskDone / project.taskTotal) * 100) : 0;
  const overdue = isOverdue(project.dueDate);

  return (
    <Link href={`/dashboard/project-management/${project.id}`} className="block">
      <div className="group rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 hover:border-[#ffd716]/40 hover:shadow-sm transition-all cursor-pointer">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex-shrink-0" style={{ background: project.color + "22" }}>
              <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ background: project.color + "33" }}>
                <div className="w-3 h-3 rounded-sm" style={{ background: project.color }} />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white truncate group-hover:text-[#1e1e1e] dark:group-hover:text-[#ffd716] transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-[12px] text-[#9a9a9a] truncate mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="relative flex-shrink-0" onClick={(e) => e.preventDefault()}>
            <button onClick={() => setMenu((m) => !m)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#b3b3b3] hover:bg-[#f5f5f5] dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical size={15} />
            </button>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#262626] shadow-lg py-1 text-[13px]">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[#1e1e1e] dark:text-white/80 hover:bg-[#f7f7f7] dark:hover:bg-white/5">
                      <Archive size={14} /> Archive
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10">
                      <Trash2 size={14} /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-[#9a9a9a] mb-1.5">
            <span>{pct}% complete</span>
            <span>{project.taskDone}/{project.taskTotal} tasks</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: project.color }} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-3">
          <MemberAvatars members={project.members} max={4} size={6} />
          <div className="flex items-center gap-3 text-[11px]">
            {project.taskOverdue > 0 && (
              <span className="flex items-center gap-1 text-[#e5484d]">
                <AlertCircle size={12} /> {project.taskOverdue} overdue
              </span>
            )}
            {project.dueDate && (
              <span className={`flex items-center gap-1 ${overdue ? "text-[#e5484d]" : "text-[#9a9a9a]"}`}>
                <Calendar size={12} /> {fmtDate(project.dueDate)}
              </span>
            )}
            {project.status === "completed" && (
              <span className="flex items-center gap-1 text-[#22c55e]">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
