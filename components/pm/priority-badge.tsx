import type { Priority } from "@/lib/services/pm/types";

const MAP: Record<Priority, { label: string; className: string; dot: string }> = {
  low:    { label: "Low",    className: "text-[#6b6b6b] dark:text-white/50", dot: "bg-[#d1d5db]" },
  medium: { label: "Medium", className: "text-[#b45309]",                    dot: "bg-[#f59e0b]" },
  high:   { label: "High",   className: "text-[#c2410c]",                    dot: "bg-[#f97316]" },
  urgent: { label: "Urgent", className: "text-[#b91c1c]",                    dot: "bg-[#e5484d]" },
};

export function PriorityBadge({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const m = MAP[priority] ?? MAP.medium;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${m.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {showLabel && m.label}
    </span>
  );
}
