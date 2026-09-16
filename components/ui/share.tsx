"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Share2, Facebook, Instagram, Linkedin, Mail, Link as LinkIcon,
  X, QrCode, Upload,
} from "lucide-react";
import { BrandedQR } from "@/components/ui/qr-code";
import { cn } from "@/lib/utils";

/* ─── share targets ─────────────────────────────────────────────── */

function WhatsApp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.042zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

type Target = { key: string; label: string; href?: string; color: string; icon: React.ReactNode; copy?: boolean };

function buildTargets(url: string, title: string): Target[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { key: "facebook", label: "Facebook", color: "#1877f2", icon: <Facebook size={18} />, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "instagram", label: "Instagram", color: "#e1306c", icon: <Instagram size={18} />, copy: true },
    { key: "whatsapp", label: "Whatsapp", color: "#25d366", icon: <WhatsApp size={18} />, href: `https://wa.me/?text=${t}%20${u}` },
    { key: "linkedin", label: "LinkedIn", color: "#0a66c2", icon: <Linkedin size={18} />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: "email", label: "Email", color: "#6b7280", icon: <Mail size={18} />, href: `mailto:?subject=${t}&body=${u}` },
  ];
}

function resolveUrl(url?: string) {
  if (url) return url;
  if (typeof window !== "undefined") return window.location.href;
  return "https://nomarcprojects.com";
}

function useCopy(url: string) {
  return async (msg = "Link copied to clipboard") => {
    try { await navigator.clipboard.writeText(url); toast.success(msg); }
    catch { toast.error("Couldn't copy the link"); }
  };
}

/* ─── ShareMenu: short/long trigger, hover reveals a vertical stack ─ */

export function ShareMenu({ url, title = "Nomarc Projects", variant = "icon", className }: {
  url?: string; title?: string; variant?: "icon" | "pill"; className?: string;
}) {
  const resolved = resolveUrl(url);
  const targets = buildTargets(resolved, title).filter((x) => x.key !== "instagram");
  const copy = useCopy(resolved);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(false), 160); };

  return (
    <div className={cn("relative inline-flex", className)} onMouseEnter={enter} onMouseLeave={leave}>
      {variant === "pill" ? (
        <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f1f1f3] dark:bg-white/[0.06] text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:bg-[#e7e7ea] dark:hover:bg-white/10 transition-colors">
          <Share2 size={15} /> Share
        </button>
      ) : (
        <button aria-label="Share" className="w-9 h-9 flex items-center justify-center rounded-full text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f1f1f3] dark:hover:bg-white/10 transition-colors">
          <Share2 size={16} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="absolute top-full right-0 mt-2 z-50 flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-white dark:bg-[#262626] border border-[#ececec] dark:border-white/10 shadow-xl"
          >
            {targets.map((tg) => (
              <a
                key={tg.key}
                href={tg.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tg.label}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#6b6b6b] dark:text-white/70 hover:text-white transition-colors"
                style={{ ["--c" as string]: tg.color }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tg.color, e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "", e.currentTarget.style.color = "")}
              >
                {tg.icon}
              </a>
            ))}
            <div className="w-6 h-px my-0.5 bg-[#ececec] dark:bg-white/10" />
            <button onClick={() => copy()} aria-label="Copy link" className="w-9 h-9 flex items-center justify-center rounded-full text-[#6b6b6b] dark:text-white/70 hover:bg-[#1e1e1e] hover:text-white dark:hover:bg-white dark:hover:text-[#1e1e1e] transition-colors">
              <LinkIcon size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── ShareDialog: centered "Share this article" modal ──────────── */

export function ShareDialog({ url, title = "Nomarc Projects", open, onClose }: {
  url?: string; title?: string; open: boolean; onClose: () => void;
}) {
  const resolved = resolveUrl(url);
  const targets = buildTargets(resolved, title);
  const copy = useCopy(resolved);
  const [qr, setQr] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-[440px] rounded-3xl bg-white dark:bg-[#1a1a1a] p-7 sm:p-8 text-center shadow-2xl"
          >
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><X size={17} /></button>

            <div className="w-16 h-16 mx-auto rounded-full bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#1e1e1e] dark:text-white">
              <Upload size={26} />
            </div>
            <h3 className="mt-4 text-[22px] font-bold text-[#1e1e1e] dark:text-white">Share this article</h3>
            <p className="mt-1.5 text-[13.5px] text-[#9a9a9a]">Spread the word. Share with your network.</p>

            <div className="mt-6 rounded-2xl bg-[#f5f5f4] dark:bg-white/[0.04] p-5">
              <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-4">Share Via</p>
              <div className="grid grid-cols-5 gap-2">
                {targets.map((tg) => {
                  const inner = (
                    <>
                      <span className="w-12 h-12 rounded-full bg-[#1e1e1e] text-white flex items-center justify-center transition-transform group-hover:scale-110" style={{ color: "#fff" }}>
                        <span style={{ color: tg.color }}>{tg.icon}</span>
                      </span>
                      <span className="mt-1.5 block text-[11px] font-medium text-[#6b6b6b] dark:text-white/60">{tg.label}</span>
                    </>
                  );
                  return tg.copy ? (
                    <button key={tg.key} onClick={() => copy("Link copied — paste it into your Instagram story or bio")} className="group flex flex-col items-center">{inner}</button>
                  ) : (
                    <a key={tg.key} href={tg.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">{inner}</a>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button onClick={() => copy()} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors">
                <LinkIcon size={15} /> Copy Link
              </button>
              <button onClick={() => setQr((q) => !q)} className="inline-flex items-center gap-2 text-[12.5px] text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                <QrCode size={14} /> {qr ? "Hide" : "Show"} QR code
              </button>
              <AnimatePresence>
                {qr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden flex flex-col items-center"
                  >
                    <BrandedQR url={resolved} size={172} showActions className="mt-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ─── ShareTrigger: a button that opens the ShareDialog ─────────── */

export function ShareTrigger({ url, title, variant = "icon", className }: {
  url?: string; title?: string; variant?: "icon" | "pill"; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "pill" ? (
        <button onClick={() => setOpen(true)} className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f1f1f3] dark:bg-white/[0.06] text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:bg-[#e7e7ea] dark:hover:bg-white/10 transition-colors", className)}>
          <Share2 size={15} /> Share
        </button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Share" className={cn("w-10 h-10 flex items-center justify-center rounded-full bg-[#f1f1f3] dark:bg-white/[0.06] text-[#1e1e1e] dark:text-white hover:bg-[#e7e7ea] dark:hover:bg-white/10 transition-colors", className)}>
          <Share2 size={17} />
        </button>
      )}
      <ShareDialog url={url} title={title} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
