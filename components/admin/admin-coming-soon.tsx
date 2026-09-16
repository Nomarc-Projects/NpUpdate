import { Hammer, type LucideIcon } from "lucide-react";

export function AdminComingSoon({ title, blurb, icon: Icon = Hammer, points }: { title: string; blurb: string; icon?: LucideIcon; points?: string[] }) {
  return (
    <div className="px-6 md:px-8 py-8 max-w-[820px]">
      <h1 className="text-2xl font-bold text-[#1e1e1e] dark:text-white flex items-center gap-3">{title}<span className="text-[10px] font-bold text-[#8a7400] bg-[#ffd716]/20 px-2 py-0.5 rounded-full align-middle">Coming soon</span></h1>
      <p className="text-sm text-[#9a9a9a] mt-1 max-w-[560px]">{blurb}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Icon size={22} /></div>
        <p className="mt-4 text-sm font-semibold text-[#1e1e1e] dark:text-white">This module is on the roadmap</p>
        {points && (
          <ul className="mt-4 inline-block text-left space-y-1.5">
            {points.map((p) => <li key={p} className="text-[13px] text-[#6b6b6b] dark:text-white/60 flex items-start gap-2"><span className="text-[#caa400] mt-0.5">•</span> {p}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
