"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Check } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "nomarc-pwa-dismissed";

type Phase = "idle" | "installing" | "success";

export function PwaInstallPrompt({ enabled }: { enabled: boolean }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  async function install() {
    if (!prompt || phase !== "idle") return;
    setPhase("installing");
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setPhase("success");
        toast.success("Nomarc installed!", { description: "Open it from your home screen anytime." });
        setTimeout(() => setVisible(false), 2200);
      } else {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    } finally {
      setPrompt(null);
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 110, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 110, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-[360px]"
        >
          <div className="relative overflow-hidden flex items-center gap-3 bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1e1e1e] rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/30 ring-1 ring-white/10 dark:ring-black/10">

            {/* Fill progress bar — slides in during install phase */}
            <AnimatePresence>
              {phase === "installing" && (
                <motion.div
                  className="absolute inset-0 bg-[#ffd716]/15 dark:bg-[#ffd716]/20 origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.4, ease: "easeInOut" }}
                />
              )}
              {phase === "success" && (
                <motion.div
                  className="absolute inset-0 bg-[#ffd716]/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            {/* App icon */}
            <div className="relative w-11 h-11 rounded-xl bg-[#ffd716] flex items-center justify-center flex-shrink-0 shadow-sm">
              <AnimatePresence mode="wait">
                {phase === "success" ? (
                  <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                    <Check size={20} className="text-[#1e1e1e]" />
                  </motion.span>
                ) : (
                  <motion.span key="phone" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                    <Smartphone size={20} className={`text-[#1e1e1e] transition-opacity ${phase === "installing" ? "opacity-50" : ""}`} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Text */}
            <div className="relative flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {phase === "success" ? (
                  <motion.div key="success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-[13px] font-bold leading-tight">Installed!</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Open Nomarc from your home screen</p>
                  </motion.div>
                ) : phase === "installing" ? (
                  <motion.div key="installing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-[13px] font-bold leading-tight">Installing…</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Almost there, hang tight</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-[13px] font-bold leading-tight">Install Nomarc</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Add to home screen for the best experience</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Install button */}
            {phase !== "success" && (
              <motion.button
                onClick={install}
                disabled={phase === "installing"}
                whileTap={{ scale: 0.93 }}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12px] font-bold hover:bg-[#e6c114] transition-colors flex-shrink-0 overflow-hidden disabled:cursor-wait"
              >
                {/* per-button fill during install */}
                {phase === "installing" && (
                  <motion.span
                    className="absolute inset-0 bg-[#1e1e1e]/10 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2.4, ease: "easeInOut" }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Download size={13} className={phase === "installing" ? "animate-bounce" : ""} />
                  {phase === "installing" ? "Installing" : "Install"}
                </span>
              </motion.button>
            )}

            {/* Dismiss */}
            {phase === "idle" && (
              <button onClick={dismiss} className="relative text-white/40 dark:text-black/30 hover:text-white dark:hover:text-black transition-colors flex-shrink-0 p-1">
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
