"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, User, Bell, Settings, LogOut, Palette, ChevronRight, Sun, Moon, Monitor, Check, type LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme";
import { useAuth, type AuthUser } from "@/lib/store/auth";
import { signOut as authSignOut } from "@/lib/auth-client";
import { animateThemeChange } from "@/lib/theme-transition";

// "Profile" removed per the redesign — see components/dashboard/dash-top-bar.tsx.
const items = [
  { label: "Dashboard",        href: "/dashboard",            Icon: LayoutGrid },
  { label: "Notifications",    href: "/dashboard/notifications", Icon: Bell },
  { label: "Account Settings", href: "/dashboard/settings",   Icon: Settings },
];

const themeOptions: { value: "light" | "dark" | "system"; label: string; Icon: LucideIcon }[] = [
  { value: "light",  label: "Light",        Icon: Sun },
  { value: "dark",   label: "Dark",         Icon: Moon },
  { value: "system", label: "Match system", Icon: Monitor },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Theme picker row with a left flyout: Light / Dark / Match system. */
function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  function choose(value: "light" | "dark" | "system", e: React.MouseEvent) {
    if (value === "system") setTheme("system");
    else animateThemeChange(value, setTheme, { x: e.clientX, y: e.clientY });
    setOpen(false);
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors"
      >
        <Palette size={17} className="text-[#666] dark:text-white/70" />
        Theme
        <ChevronRight size={15} className="ml-auto text-[#9a9a9a]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-full top-0 mr-1.5 w-44 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-2 z-50"
        >
          {themeOptions.map(({ value, label, Icon }) => {
            const activeTheme = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={(e) => choose(value, e)}
                role="menuitemradio"
                aria-checked={activeTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors"
              >
                <Icon size={16} className="text-[#666] dark:text-white/70" />
                {label}
                {activeTheme && <Check size={15} className="ml-auto text-[#caa400]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const signOut = useAuth((s) => s.signOut);

  async function handleSignOut() {
    setOpen(false);
    await authSignOut();
    signOut();
    router.push("/");
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-10 h-10 rounded-full ring-2 ring-[#ffd716] ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e1e] overflow-hidden flex items-center justify-center bg-[#1e1e1e] text-[#ffd716] text-sm font-semibold"
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          initials(user.name)
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-56 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-2 z-50"
        >
          {items.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors"
            >
              <Icon size={17} className="text-[#666] dark:text-white/70" />
              {label}
            </Link>
          ))}

          <ThemeMenu />

          <div className="my-2 h-px bg-[#ececec] dark:bg-white/10" />

          <button
            type="button"
            onClick={handleSignOut}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
