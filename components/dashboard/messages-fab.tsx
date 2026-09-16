"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { getUnreadCount } from "@/lib/services/messaging";

export function MessagesFab() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [shaking, setShaking] = useState(false);
  const prevUnread = useRef(0);
  const shakeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMessages = pathname.startsWith("/dashboard/messages");

  function triggerShake() {
    setShaking(false);
    // double-rAF to force re-trigger if already shaking
    requestAnimationFrame(() => requestAnimationFrame(() => setShaking(true)));
    setTimeout(() => setShaking(false), 750);
  }

  useEffect(() => {
    let alive = true;

    function poll() {
      getUnreadCount()
        .then((n) => {
          if (!alive) return;
          setUnread(n);
          // shake on new message arriving
          if (n > prevUnread.current) triggerShake();
          prevUnread.current = n;
        })
        .catch(() => {});
    }

    poll();
    const t = setInterval(poll, 15000);

    // periodic attention shake every ~8s when there are unread messages
    shakeTimer.current = setInterval(() => {
      if (prevUnread.current > 0) triggerShake();
    }, 8000);

    return () => {
      alive = false;
      clearInterval(t);
      if (shakeTimer.current) clearInterval(shakeTimer.current);
    };
  }, []);

  if (isMessages) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 22, delay: 0.5 }}
        className="fixed bottom-24 right-4 z-30 md:bottom-6 md:right-6"
      >
        <Link
          href="/dashboard/messages"
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#ffd716] text-[#1e1e1e] shadow-lg shadow-[#ffd716]/25 hover:bg-[#e6c114] hover:shadow-xl hover:shadow-[#ffd716]/30 hover:scale-105 transition-all active:scale-95 ${shaking ? "nm-fab-shake" : ""}`}
        >
          <MessageSquare size={22} strokeWidth={2} />

          {/* unread count badge */}
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#e5484d] text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white"
              >
                {unread > 99 ? "99+" : unread}
              </motion.span>
            )}
          </AnimatePresence>

          {/* pulse ring when unread */}
          {unread > 0 && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#ffd716]/30 pointer-events-none" />
          )}
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
