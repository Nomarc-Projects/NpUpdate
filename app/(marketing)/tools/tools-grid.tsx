"use client";

import { useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Share2, FileSearch, X, Sparkles, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { useAuth } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

type Audience = "professional" | "exhibitor";
type Preview = "list" | "people" | "ai" | "seal" | "grid" | "doc";
type Tool = { name: string; desc: string; href: string; audiences: Audience[]; preview: Preview; soon?: boolean };
type Category = { label: string; Icon: LucideIcon; tools: Tool[] };

const CATEGORIES: Category[] = [
  {
    label: "Career Growth", Icon: Briefcase,
    tools: [
      { name: "Job Board", desc: "Verified opportunities across the industry.", href: "/dashboard/jobs", audiences: ["professional"], preview: "list" },
      { name: "Hire Professionals", desc: "Source candidates from the verified directory.", href: "/dashboard/find-professionals", audiences: ["professional", "exhibitor"], preview: "people" },
      { name: "AI Assistant", desc: "Smarter resumes, applications and shortlists.", href: "#", audiences: ["professional"], preview: "ai", soon: true },
    ],
  },
  {
    label: "Network", Icon: Share2,
    tools: [
      { name: "Newsfeed", desc: "Industry news and platform updates.", href: "#", audiences: ["professional", "exhibitor"], preview: "list", soon: true },
      { name: "Exhibition Hub", desc: "Source materials and connect directly with suppliers.", href: "/exhibition-hub", audiences: ["professional", "exhibitor"], preview: "grid" },
      { name: "Property Listings", desc: "Discover properties and project pipelines.", href: "#", audiences: ["professional"], preview: "grid", soon: true },
    ],
  },
  {
    label: "Project management", Icon: FileSearch,
    tools: [
      { name: "Project Management", desc: "Tasks, milestones and team coordination.", href: "#", audiences: ["professional"], preview: "doc", soon: true },
      { name: "Professional Practice Templates", desc: "Contracts, BOQs, programmes and reports ready to go.", href: "#", audiences: ["professional", "exhibitor"], preview: "doc", soon: true },
    ],
  },
];

const AUDIENCE_LABEL: Record<Audience, string> = { professional: "Professional", exhibitor: "Exhibitor" };

/* ─── 2D preview animations (light/dark via currentColor + theme classes) ── */

function ToolPreview({ type }: { type: Preview }) {
  const bar = "rounded-full bg-[#ffd716]";
  const soft = "rounded-full bg-[#e9e9e9] dark:bg-white/10";
  switch (type) {
    case "list":
      return (
        <div className="space-y-2 w-full px-1">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="flex items-center gap-2"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, repeat: Infinity, repeatType: "reverse", repeatDelay: 1, duration: 0.5 }}>
              <span className="w-6 h-6 rounded-lg bg-[#ffd716]/30 flex-shrink-0" />
              <span className={cn(soft, "h-2 flex-1")} />
              <span className={cn(bar, "h-2 w-8")} />
            </motion.div>
          ))}
        </div>
      );
    case "people":
      return (
        <div className="flex items-center justify-center gap-2">
          {["#ffd716", "#22c55e", "#6366f1", "#f97316"].map((c, i) => (
            <motion.span key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1e1e1e]" style={{ backgroundColor: c }}
              initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} transition={{ delay: i * 0.1, type: "spring", stiffness: 320, damping: 16, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.1 }} />
          ))}
        </div>
      );
    case "ai":
      return (
        <div className="flex flex-col items-center gap-2">
          <Sparkles size={20} className="text-[#ffd716]" />
          <div className="flex items-center gap-1.5 rounded-full bg-[#f5f5f5] dark:bg-white/10 px-3 py-2">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#caa400]"
                animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        </div>
      );
    case "seal":
      return (
        <div className="relative flex items-center justify-center">
          <motion.span className="absolute w-12 h-12 rounded-full border-2 border-dashed border-[#ffd716]"
            animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
          <motion.span className="w-9 h-9 rounded-full bg-[#ffd716] flex items-center justify-center text-[#1e1e1e]"
            animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </motion.span>
        </div>
      );
    case "grid":
      return (
        <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.span key={i} className="w-5 h-5 rounded-md bg-[#ffd716]/70"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: (i % 3) * 0.15 + Math.floor(i / 3) * 0.1 }} />
          ))}
        </div>
      );
    case "doc":
      return (
        <div className="mx-auto w-16 rounded-lg bg-white dark:bg-[#262626] border border-[#ececec] dark:border-white/10 p-2 space-y-1.5 shadow-sm">
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} className="flex items-center gap-1.5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.2, duration: 0.4 }}>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
              <span className="h-1.5 flex-1 rounded-full bg-[#e9e9e9] dark:bg-white/10" />
            </motion.div>
          ))}
        </div>
      );
  }
}

/* ─── Signup prompt ─────────────────────────────────────────────── */

function SignupPrompt({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="relative w-full max-w-[400px] rounded-3xl bg-white dark:bg-[#1a1a1a] p-7 text-center shadow-2xl">
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"><X size={17} /></button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Sparkles size={24} /></div>
          <h3 className="mt-4 text-[18px] font-bold text-[#1e1e1e] dark:text-white">Sign up to use {tool.name}</h3>
          <p className="mt-1.5 text-[13px] text-[#9a9a9a]">{tool.soon ? "Launching soon — create an account to get early access." : "Create your free account to get started."}</p>
          <div className="mt-5 space-y-2">
            {tool.audiences.map((a, i) => (
              <Link key={a} href="/signup" className={cn("block w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors", i === 0 ? "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]" : "border border-[#e3e3e3] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:border-[#ffd716]")}>
                Sign up as {AUDIENCE_LABEL[a]}
              </Link>
            ))}
          </div>
          <Link href="/login" className="mt-4 inline-block text-[12.5px] text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">Already have an account? Log in</Link>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

/* ─── Card ──────────────────────────────────────────────────────── */

function ToolCard({ tool, onOpen, go }: { tool: Tool; onOpen: (t: Tool) => void; go: (href: string) => string }) {
  const [hover, setHover] = useState(false);
  // Live tools with a real route navigate straight there; the rest open the
  // "sign up to use X" prompt.
  const navigable = !tool.soon && tool.href !== "#";
  const cls = "group relative block text-left rounded-xl border border-[#e9e9e9] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-6 transition-all hover:border-[#ffd716] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden";
  const inner = (
    <>
      {/* hover hint — top-right, shown *before* you hover (subtly blinking) to
          invite the interaction, then fades out once the card is hovered. */}
      <span className="absolute top-6 right-5 flex items-center gap-1.5">
        <span className="hidden [@media(hover:hover)]:inline text-[10px] font-semibold uppercase tracking-wide text-[#caa400] animate-pulse group-hover:opacity-0 transition-opacity">hover</span>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#ffd716] opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffd716]" />
        </span>
      </span>

      <h3 className="text-lg font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-2 pr-8">
        {tool.name}
        {tool.soon && <span className="rounded-full bg-[#ffd716]/20 px-2 py-0.5 text-[10px] font-bold text-[#8a7400] dark:text-[#ffd716]">Soon</span>}
      </h3>

      {/* desc ⇄ preview crossfade on hover */}
      <div className="relative mt-2 h-[68px]">
        <AnimatePresence mode="wait">
          {hover ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 flex items-center justify-center">
              <ToolPreview type={tool.preview} />
            </motion.div>
          ) : (
            <motion.p key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 text-sm text-[#898989] leading-relaxed">
              {tool.desc}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  if (navigable) {
    return (
      <Link href={go(tool.href)} className={cls} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={() => onOpen(tool)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className={cls}>
      {inner}
    </button>
  );
}

export function ToolsGrid() {
  const [active, setActive] = useState<Tool | null>(null);
  const isSignedIn = useAuth((s) => s.isSignedIn);
  // The live tools all resolve to dashboard routes behind the auth middleware,
  // so signed-out visitors get the sign-up path first (same rule as the
  // homepage category cards) instead of bouncing off /login.
  const go = (href: string) =>
    !isSignedIn && href.startsWith("/dashboard") ? `/signup?redirect=${encodeURIComponent(href)}` : href;
  return (
    <section className="pb-24">
      <div className="max-w-[1180px] mx-auto px-6 space-y-16">
        {CATEGORIES.map(({ label, Icon, tools }) => (
          <Reveal key={label}>
            <div className="flex justify-center">
              <div className="w-full">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#ffe88a] border border-[#f3d34d] pl-2 pr-4 py-1.5">
                  <span className="w-6 h-6 rounded-full bg-[#1e1e1e] flex items-center justify-center"><Icon size={13} className="text-[#ffd716]" strokeWidth={2.2} /></span>
                  <span className="text-sm font-medium text-[#1e1e1e]">{label}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tools.map((tool) => <ToolCard key={tool.name} tool={tool} onOpen={setActive} go={go} />)}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      {active && <SignupPrompt tool={active} onClose={() => setActive(null)} />}
    </section>
  );
}
