"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, FileText, X, Briefcase, MessageSquare, Star, UserPlus, BadgeCheck, ChevronLeft, ExternalLink, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  type NotificationRow,
} from "@/lib/services/notifications";

const ICONS: Record<string, LucideIcon> = {
  job_invite: UserPlus,
  application: Briefcase,
  application_status: Briefcase,
  message: MessageSquare,
  recommendation: Star,
  verification: BadgeCheck,
  quote: FileText,
};

export function NotificationBell({
  initialCount = 0,
  align = "right",
  buttonClassName,
}: {
  initialCount?: number;
  align?: "left" | "right";
  buttonClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const n = await getUnreadNotificationCount();
      setCount(n);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMyNotifications();
      setItems(rows);
      setCount(rows.filter((n) => !n.read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 15000);
    const onChange = () => {
      refreshCount();
      if (open) void load();
    };
    window.addEventListener("nm-unread-changed", onChange);
    return () => {
      clearInterval(t);
      window.removeEventListener("nm-unread-changed", onChange);
    };
  }, [refreshCount, open, load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const openDetail = async (n: NotificationRow) => {
    setSelected(n);
    if (!n.read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(n.id);
        router.refresh();
        window.dispatchEvent(new Event("nm-unread-changed"));
      } catch {}
    }
  };

  const markAll = async () => {
    const prev = items;
    setItems((l) => l.map((x) => ({ ...x, read: true })));
    setCount(0);
    try {
      await markAllNotificationsRead();
      router.refresh();
      window.dispatchEvent(new Event("nm-unread-changed"));
    } catch {
      setItems(prev);
      toast.error("Failed to mark notifications read");
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    const wasUnread = items.find((x) => x.id === id)?.read === false;
    setItems((l) => l.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
    if (wasUnread) setCount((c) => Math.max(0, c - 1));
    try {
      await deleteNotification(id);
      router.refresh();
      window.dispatchEvent(new Event("nm-unread-changed"));
    } catch {
      setItems(prev);
      toast.error("Failed to delete notification");
    }
  };

  const goToHref = (href: string) => {
    setOpen(false);
    setSelected(null);
    router.push(href);
  };

  const anyUnread = items.some((n) => !n.read);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => {
            if (o) setSelected(null);
            return !o;
          });
        }}
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors",
          buttonClassName,
        )}
      >
        <Bell size={16} />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white ring-1 ring-white dark:ring-[#1e1e1e]"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "absolute top-full mt-2 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]",
              align === "right" ? "right-0" : "left-0",
            )}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                {selected ? (
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Back to notifications"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : null}
                <h2 className="truncate text-[14px] font-bold text-[#1e1e1e] dark:text-white">
                  {selected ? "Notification" : "Notifications"}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {!selected && anyUnread ? (
                  <button
                    type="button"
                    onClick={() => void markAll()}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    title="Mark all read"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                ) : null}
                {selected ? (
                  <button
                    type="button"
                    onClick={() => void remove(selected.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#9a9a9a] hover:bg-[#fdecec] hover:text-[#e5484d] dark:hover:bg-[#e5484d]/10"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {selected ? (
                <div className="p-4">
                  {(() => {
                    const Icon = ICONS[selected.type] ?? Bell;
                    return (
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#1e1e1e] dark:bg-white/5 dark:text-white">
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{selected.title}</p>
                          {selected.body ? (
                            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4a4a4a] dark:text-white/70">{selected.body}</p>
                          ) : (
                            <p className="mt-1.5 text-[13px] text-[#9a9a9a]">No additional details.</p>
                          )}
                          <p className="mt-2 text-[11px] text-[#9a9a9a]">{selected.time}</p>
                          {selected.href ? (
                            <button
                              type="button"
                              onClick={() => goToHref(selected.href!)}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] hover:bg-[#f5cc00] transition-colors"
                            >
                              Open <ExternalLink size={13} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-2.5">
                      <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-[#f0f0f0] dark:bg-white/10 animate-pulse" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <div className="h-3 w-3/4 rounded bg-[#f0f0f0] dark:bg-white/10 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-[#f0f0f0] dark:bg-white/10 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10">
                    <Bell size={20} />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-[#1e1e1e] dark:text-white">You&apos;re all caught up</p>
                  <p className="mt-1 text-[12.5px] text-[#9a9a9a]">New messages, invites, and updates will appear here.</p>
                </div>
              ) : (
                <div className="p-2">
                  {items.map((n) => {
                    const Icon = ICONS[n.type] ?? Bell;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-xl p-2.5 transition-colors",
                          n.read ? "hover:bg-[#f7f7f7] dark:hover:bg-white/[0.04]" : "bg-[#fffdf2] hover:bg-[#fff7cc]/70 dark:bg-[#ffd716]/[0.06] dark:hover:bg-[#ffd716]/[0.1]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => void openDetail(n)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#1e1e1e] dark:bg-white/5 dark:text-white">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{n.title}</span>
                              {!n.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ffd716]" />}
                            </span>
                            {n.body ? <span className="mt-0.5 block text-[12.5px] text-[#6b6b6b] line-clamp-2 dark:text-white/60">{n.body}</span> : null}
                            <span className="mt-1 block text-[11px] text-[#9a9a9a]">{n.time}{n.href ? <span className="font-medium text-[#caa400]"> · Open</span> : null}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(n.id)}
                          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#b3b3b3] opacity-0 transition-opacity hover:bg-[#fdecec] hover:text-[#e5484d] group-hover:opacity-100 focus:opacity-100 dark:hover:bg-[#e5484d]/10"
                          aria-label="Delete notification"
                          title="Delete"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
