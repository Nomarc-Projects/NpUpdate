import type { PmMember } from "@/lib/services/pm/types";

export function MemberAvatars({ members, max = 4, size = 6 }: { members: PmMember[]; max?: number; size?: number }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  const px = size * 4;
  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <div
          key={m.id}
          title={m.name}
          style={{ width: px, height: px }}
          className="rounded-full border-2 border-white dark:border-[#1e1e1e] bg-[#ffd716] flex items-center justify-center text-[#1e1e1e] font-bold overflow-hidden flex-shrink-0"
        >
          {m.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatarUrl} alt={m.name} style={{ width: px, height: px }} className="object-cover" />
          ) : (
            <span style={{ fontSize: px * 0.38 }}>{m.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}
      {rest > 0 && (
        <div
          style={{ width: px, height: px }}
          className="rounded-full border-2 border-white dark:border-[#1e1e1e] bg-[#f0f0f0] dark:bg-white/10 flex items-center justify-center text-[#6b6b6b] dark:text-white/60 font-semibold flex-shrink-0"
        >
          <span style={{ fontSize: px * 0.34 }}>+{rest}</span>
        </div>
      )}
    </div>
  );
}
