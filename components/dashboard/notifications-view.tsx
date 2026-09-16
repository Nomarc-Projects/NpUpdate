"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Briefcase, MessageSquare, Star, UserPlus, BadgeCheck, CheckCheck, X, FileText, type LucideIcon } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead, deleteNotification, type NotificationRow } from "@/lib/services/notifications";

const ICONS: Record<string, LucideIcon> = {
  job_invite: UserPlus, application: Briefcase, application_status: Briefcase,
  message: MessageSquare, recommendation: Star, verification: BadgeCheck, quote: FileText,
};

export function NotificationsView({ notifications = [] }: { notifications?: NotificationRow[] }) {
  const router = useRouter();
  const [list, setList] = useState(notifications);
  const [tab, setTab] = useState<"All" | "Unread">("All");
  const shown = tab === "Unread" ? list.filter((n) => !n.read) : list;
  const anyUnread = list.some((n) => !n.read);

  const open = (n: NotificationRow) => {
    if (!n.read) { setList((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))); markNotificationRead(n.id).then(() => router.refresh()).catch(() => {}); }
    if (n.href) router.push(n.href);
  };
  const markAll = () => {
    setList((l) => l.map((x) => ({ ...x, read: true })));
    markAllNotificationsRead().then(() => router.refresh()).catch(() => toast.error("Failed"));
  };
  const remove = (id: string) => {
    const prev = list; setList((l) => l.filter((x) => x.id !== id));
    deleteNotification(id).then(() => router.refresh()).catch(() => { setList(prev); toast.error("Failed"); });
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[760px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]"><Bell size={18} /></div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Notifications</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">Updates on messages, invites, applications and more.</p>
            </div>
          </div>
          {anyUnread && <button onClick={markAll} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:text-[#caa400]"><CheckCheck size={15} /> Mark all read</button>}
        </div>
        <div className="p-6">
          <div className="flex gap-1.5 mb-4">
            {(["All", "Unread"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${tab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>{t}</button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Bell size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">You&apos;re all caught up</h3>
              <p className="mt-1.5 max-w-sm text-[13px] text-[#9a9a9a]">When something needs your attention — a new message, invite, or application update — it&apos;ll show up here.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {shown.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <div key={n.id} className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${n.read ? "border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02]" : "border-[#ffd716]/40 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]"}`}>
                    <span className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#1e1e1e] dark:text-white flex-shrink-0"><Icon size={16} /></span>
                    <button onClick={() => open(n)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-2">{n.title}{!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#ffd716] flex-shrink-0" />}</p>
                      {n.body && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-[#9a9a9a] mt-1">{n.time}{n.href && <span className="text-[#caa400] font-medium"> · View</span>}</p>
                    </button>
                    <button onClick={() => remove(n.id)} className="text-[#b3b3b3] hover:text-[#e5484d] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><X size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function NotificationsSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[760px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <S cls="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5">
              <S cls="h-4 w-28" />
              <S cls="h-3 w-52 max-w-full" />
            </div>
          </div>
          <S cls="h-8 w-28 rounded-lg flex-shrink-0" />
        </div>
        <div className="p-6">
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {[64, 72, 72, 80].map((w, i) => <S key={i} cls="h-8 rounded-full" style={{ width: w }} />)}
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-[#ececec] dark:border-white/10 p-3.5">
                <S cls="w-9 h-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <S cls="h-3.5 w-3/4" />
                  <S cls="h-3 w-1/2" />
                  <S cls="h-3 w-16" />
                </div>
                <S cls="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
