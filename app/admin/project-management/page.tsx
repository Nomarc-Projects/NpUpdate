import { KanbanSquare, Users, CheckSquare, FolderOpen, AlertCircle, TrendingUp, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { MOCK_PROJECTS } from "@/lib/services/pm/mock-data";

const DISCIPLINE_BREAKDOWN = [
  { name: "Architecture",           count: 12, color: "#ffd716" },
  { name: "Structural Engineering", count: 8,  color: "#6366f1" },
  { name: "MEP Engineering",        count: 6,  color: "#22c55e" },
  { name: "Quantity Surveying",     count: 5,  color: "#f59e0b" },
  { name: "Project Management",     count: 4,  color: "#e5484d" },
  { name: "Interior Design",        count: 3,  color: "#06b6d4" },
];

const TEMPLATE_USAGE = [
  { name: "Construction Programme", uses: 47 },
  { name: "Preliminaries BoQ",      uses: 38 },
  { name: "Professional Fees Agreement", uses: 31 },
  { name: "Site Inspection Report", uses: 29 },
  { name: "RFI Template",           uses: 22 },
];

export default function AdminProjectManagementPage() {
  const totalProjects = MOCK_PROJECTS.length;
  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active").length;
  const totalTasks = MOCK_PROJECTS.reduce((s, p) => s + p.taskTotal, 0);
  const doneTasks  = MOCK_PROJECTS.reduce((s, p) => s + p.taskDone,  0);
  const overdue    = MOCK_PROJECTS.reduce((s, p) => s + p.taskOverdue, 0);

  const kpis = [
    { label: "Total projects",  value: totalProjects, icon: FolderOpen, color: "text-[#6366f1] bg-[#e0e7ff] dark:bg-[#6366f1]/15" },
    { label: "Active",          value: activeProjects, icon: TrendingUp, color: "text-[#22c55e] bg-[#dcfce7] dark:bg-[#22c55e]/15" },
    { label: "Tasks created",   value: totalTasks,    icon: CheckSquare, color: "text-[#caa400] bg-[#fff7cc] dark:bg-[#ffd716]/10" },
    { label: "Overdue tasks",   value: overdue,       icon: AlertCircle, color: "text-[#e5484d] bg-[#fce8e8] dark:bg-[#e5484d]/15" },
  ];

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[1000px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]">
              <KanbanSquare size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Project Management</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">Platform-wide overview of all professional projects.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#ffd716]/15 text-[11px] font-bold text-[#caa400]">Plus+ feature</span>
        </div>

        <div className="p-6 space-y-6">

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${k.color}`}><k.icon size={16} /></div>
                <p className="text-2xl font-bold text-[#1e1e1e] dark:text-white tabular-nums">{k.value}</p>
                <p className="text-[12px] text-[#9a9a9a]">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Progress summary */}
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
            <div className="flex items-center justify-between text-[12px] text-[#9a9a9a] mb-2">
              <span className="font-semibold text-[#1e1e1e] dark:text-white">Platform task completion</span>
              <span>{doneTasks}/{totalTasks} tasks done ({totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%)</span>
            </div>
            <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-[#ffd716] transition-all" style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }} />
            </div>
          </div>

          {/* All projects table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">All projects</h2>
            </div>
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#9a9a9a] border-b border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]">
                    <th className="px-4 py-3 font-semibold">Project</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Owner</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Due</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PROJECTS.map((p) => {
                    const pct = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : 0;
                    const statusCls = p.status === "active" ? "bg-[#dcfce7] text-[#16803c]" : p.status === "archived" ? "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]" : "bg-[#e0edff] text-[#1d4ed8]";
                    return (
                      <tr key={p.id} className="border-b border-[#f5f5f5] dark:border-white/5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                            <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate max-w-[180px]">{p.name}</span>
                          </div>
                          {p.taskOverdue > 0 && <p className="text-[11px] text-[#e5484d] mt-0.5 pl-[18px]">{p.taskOverdue} overdue</p>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#9a9a9a] hidden sm:table-cell">
                          {p.members[0]?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/5 overflow-hidden flex-shrink-0">
                              <div className="h-full rounded-full bg-[#ffd716]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-[#9a9a9a]">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#9a9a9a] hidden md:table-cell">
                          {p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusCls}`}>{p.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Projects by discipline */}
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-3">By discipline</h2>
              <div className="space-y-2.5">
                {DISCIPLINE_BREAKDOWN.map((d) => {
                  const max = DISCIPLINE_BREAKDOWN[0].count;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[12px] text-[#6b6b6b] dark:text-white/60 flex-1 truncate">{d.name}</span>
                      <div className="w-20 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: d.color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-[#1e1e1e] dark:text-white w-5 text-right">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most-used templates */}
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a]">Top templates used</h2>
                <Link href="/admin/templates" className="text-[11px] font-semibold text-[#caa400] hover:underline">Manage →</Link>
              </div>
              <div className="space-y-2.5">
                {TEMPLATE_USAGE.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-[#9a9a9a] w-4">{i + 1}</span>
                    <span className="text-[12px] text-[#6b6b6b] dark:text-white/60 flex-1 truncate">{t.name}</span>
                    <span className="text-[11px] font-semibold text-[#1e1e1e] dark:text-white">{t.uses} uses</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
