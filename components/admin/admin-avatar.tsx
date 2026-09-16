"use client";

import { ShieldCheck } from "lucide-react";

/**
 * One admin in the roster: an initials avatar that reveals who it is on hover.
 *
 * A CSS-only hover card rather than a JS tooltip — this sits in a server-rendered
 * sidebar and needs no state, and `group-hover` handles it. `title` carries the
 * same text so it also works for touch and screen readers, which a purely visual
 * hover card would leave out.
 *
 * Super admins get the yellow ring, so the tier is legible without hovering
 * every avatar to find out who holds it.
 */
function initials(name: string, email: string) {
  const src = (name || email || "").trim();
  if (!src) return "—";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

export function AdminAvatar({ name, email, role }: { name: string; email: string; role: "admin" | "super_admin" }) {
  const isSuper = role === "super_admin";
  const label = role === "super_admin" ? "Super Administrator" : "System Administrator";
  const display = name || email;

  return (
    <div className="group relative">
      <span
        title={`${display} — ${label}`}
        aria-label={`${display}, ${label}`}
        className={`flex h-9 w-9 cursor-default items-center justify-center rounded-full text-[11.5px] font-bold transition-transform group-hover:scale-105 ${
          isSuper
            ? "bg-[#1e1e1e] text-[#ffd716] ring-2 ring-[#ffd716] dark:bg-[#ffd716] dark:text-[#1e1e1e]"
            : "bg-[#1e1e1e] text-white dark:bg-white dark:text-[#1e1e1e]"
        }`}
      >
        {initials(name, email)}
      </span>

      {/* Hover card. pointer-events-none so it can never sit between the cursor
          and the avatar; left-aligned and width-capped so a long email cannot
          push it off the narrow sidebar. */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[220px] origin-top-left scale-95 rounded-xl border border-[#ececec] bg-white px-3 py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 dark:border-white/10 dark:bg-[#262626]">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">
          {isSuper && <ShieldCheck size={12} className="flex-shrink-0 text-[#caa400]" />}
          <span className="truncate">{name || "Unnamed"}</span>
        </p>
        <p className="text-[11px] text-[#9a9a9a]">{label}</p>
        {email && <p className="mt-0.5 truncate text-[11px] text-[#b3b3b3]">{email}</p>}
      </div>
    </div>
  );
}
