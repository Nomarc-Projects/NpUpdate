"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, Briefcase, MessageSquare, Store, MoreHorizontal } from "lucide-react";

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  // In-dashboard catalog, not the public /exhibition-hub — that one is still
  // behind its coming-soon gate and is meant to stay withheld from the public
  // website only, not from signed-in members.
  { label: "Products", href: "/dashboard/products", icon: Store },
  { label: "More", href: "/dashboard/settings", icon: MoreHorizontal },
];

/**
 * Floating pill bar: one solid dark lozenge, inactive items icon-only, and the
 * active item expanded into a yellow pill carrying icon + label.
 *
 * The bar is not the same dark in both themes. In light mode `#1e1e1e` floats
 * over light page content; in dark mode the dashboard background is already
 * `#161616`, so the same fill would all but vanish — hence the lighter `#262626`
 * plus a hairline rim there.
 */
export function MobileBottomNav({ exhibitionEnabled }: { exhibitionEnabled: boolean }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/dashboard/messages");
  if (isMessages) return null;

  // The super-admin Exhibition Hub availability toggle decides whether the
  // in-dashboard Products doorway appears. Off = hidden from the nav bar.
  const items = exhibitionEnabled ? ITEMS : ITEMS.filter((i) => i.href !== "/dashboard/products");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden flex justify-center pointer-events-none px-4" aria-label="Mobile navigation">
      <div className="pointer-events-auto w-full max-w-[480px] mb-4">
        <div className="flex items-center justify-between rounded-full bg-[#1e1e1e] dark:bg-[#262626] border border-transparent dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-2 py-2">
          {items.map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="relative flex items-center justify-center"
              >
                {active ? (
                  <motion.div layoutId="mobile-nav-pill" transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ffd716] text-[#1e1e1e]">
                    <item.icon size={16} strokeWidth={2.2} />
                    <span className="text-[11px] font-bold">{item.label}</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-full text-white/55 dark:text-white/50 active:text-white transition-colors">
                    <item.icon size={18} strokeWidth={1.8} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
