"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KebabItem = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Red destructive styling (Delete, Reject, …). */
  danger?: boolean;
  /** Omit the item entirely — lets callers build one state-conditional list declaratively. */
  hidden?: boolean;
};

const MENU_WIDTH = 192; // w-48
const GAP = 6;

/**
 * The three-dot row/card action menu used everywhere in the redesign (projects,
 * catalog, recommendations, campaigns, admin tables) — its item set is often
 * STATE-CONDITIONAL (different actions for pending/active/rejected, …), so
 * callers just filter/build `items` per row and this renders + positions it.
 *
 * The menu is rendered into a PORTAL on document.body rather than absolutely
 * inside its trigger's parent. Most of its callers sit in a table wrapped in
 * `overflow-x-auto`, and an absolutely-positioned child cannot escape an
 * ancestor's overflow clip — so on the campaigns table the menu was cut off
 * inside the scroll container and its lower items were unreachable. A portal has
 * no clipping ancestor, and being fixed-positioned it can also flip above the
 * trigger when there is no room below, which is what makes it usable on a phone.
 */
export function KebabMenu({
  items,
  align = "right",
  triggerClassName,
  className,
}: {
  items: KebabItem[];
  align?: "left" | "right";
  triggerClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const visible = items.filter((i) => !i.hidden);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const height = visible.length * 36 + 12; // rows + py-1.5
    // Flip above when the menu would run past the bottom of the viewport.
    const below = r.bottom + GAP;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - GAP - height) : below;
    const rawLeft = align === "right" ? r.right - MENU_WIDTH : r.left;
    // Never let it hang off either edge on a narrow screen.
    const left = Math.min(Math.max(8, rawLeft), Math.max(8, window.innerWidth - MENU_WIDTH - 8));
    setPos({ top, left });
  }, [align, visible.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Reposition rather than drift: the trigger moves when the table scrolls
  // sideways or the window resizes. `capture` catches scrolls on the inner
  // container, not just the page.
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  if (!visible.length) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-[#ececec] text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5",
          triggerClassName,
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreVertical size={16} />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && pos && (
            <>
              <div className="fixed inset-0 z-[190]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => e.stopPropagation()}
                style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
                className="fixed z-[200] rounded-xl border border-[#ececec] bg-white py-1.5 text-[13px] shadow-lg dark:border-white/10 dark:bg-[#262626]"
              >
                {visible.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.label}
                      role="menuitem"
                      onClick={() => { setOpen(false); it.onClick(); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors",
                        it.danger
                          ? "text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10"
                          : "text-[#1e1e1e] hover:bg-[#f5f5f5] dark:text-white dark:hover:bg-white/5",
                      )}
                    >
                      <Icon size={14} className={it.danger ? "" : "text-[#9a9a9a]"} />
                      {it.label}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
