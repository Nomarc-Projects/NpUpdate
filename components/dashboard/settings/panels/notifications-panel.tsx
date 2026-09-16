"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getNotificationPrefs, setNotificationPref, type NotificationPrefs } from "@/lib/services/notification-prefs";
import { NOTIFICATION_GROUPS, type NotificationPrefKey } from "@/lib/constants/notification-prefs";
import type { StackableRole } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

export function NotificationsPanel({ heldRoles }: { heldRoles: StackableRole[] }) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    getNotificationPrefs().then((p) => { setPrefs(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function toggle(key: NotificationPrefKey) {
    if (!prefs) return;
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next }); // optimistic
    setNotificationPref(key, next).catch(() => {
      setPrefs((p) => p && ({ ...p, [key]: !next })); // revert
      toast.error("Could not save preference");
    });
  }

  if (loading || !prefs) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-[#f0f0f0] dark:bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  const groups = NOTIFICATION_GROUPS.filter((g) => g.group === "general" || heldRoles.includes(g.group as StackableRole));

  return (
    <div className="space-y-8">
      {groups.map((group, i) => (
        <div key={group.group} className={i > 0 ? "pt-6 border-t border-[#f0f0f0] dark:border-white/10" : ""}>
          <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mb-4">{group.title}</h3>
          <div className="space-y-4">
            {group.toggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-[#1e1e1e] dark:text-white">{t.label}</p>
                  <p className="text-[12px] text-[#9a9a9a] mt-0.5">{t.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[t.key]}
                  onClick={() => toggle(t.key)}
                  className={cn("relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200", prefs[t.key] ? "bg-[#1e1e1e] dark:bg-[#ffd716]" : "bg-[#e3e3e3] dark:bg-white/15")}
                >
                  <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200", prefs[t.key] ? "translate-x-[22px]" : "translate-x-[2px]")} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
