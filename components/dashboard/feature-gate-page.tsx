"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lock, ArrowRight, CheckCircle, Clock, Zap,
  Sparkles, KanbanSquare, FolderOpen, Boxes, FileCheck, Trophy, ShieldCheck, BarChart3, BadgeCheck,
} from "lucide-react";
import { useViewer } from "@/lib/use-viewer";
import { evaluate, requirementLabel, PLAN_LABEL, type Capability, type Plan } from "@/lib/entitlements";

export type FeaturePoint = { title: string; desc: string };

/**
 * Icons a Server Component may request, by name.
 *
 * A component reference is a function, and functions cannot cross the
 * server/client boundary — passing `icon: Sparkles` from a server page threw
 * "Functions cannot be passed directly to Client Components" and crashed
 * every gated feature page. Server callers pass `iconName`; it's resolved to
 * a component here, on the client.
 */
const ICONS = {
  sparkles: Sparkles,
  kanbanSquare: KanbanSquare,
  folderOpen: FolderOpen,
  boxes: Boxes,
  fileCheck: FileCheck,
  trophy: Trophy,
  shieldCheck: ShieldCheck,
  barChart3: BarChart3,
  badgeCheck: BadgeCheck,
} as const;

export type FeatureIconName = keyof typeof ICONS;

export type FeatureConfig = {
  cap: Capability;
  name: string;
  tagline: string;
  description: string;
  iconName: FeatureIconName;
  requiredPlan: Plan;
  points: FeaturePoint[];
  comingSoonNote?: string;
};

// Both ladders. free/plus/pro/premium are the professional tiers;
// sme/exhibitor/key_player the exhibitor ones. Every slug in `Plan` needs an
// entry, so a tier added to either ladder fails the build rather than silently
// rendering an unstyled badge.
const PLAN_COLOR: Record<Plan, string> = {
  free: "text-[#6b6b6b] bg-[#f0f0f0]",
  plus: "text-[#b45309] bg-[#fef3c7]",
  pro: "text-[#6d28d9] bg-[#ede9fe]",
  premium: "text-[#0f766e] bg-[#ccfbf1]",
  sme: "text-[#b45309] bg-[#fef3c7]",
  exhibitor: "text-[#6d28d9] bg-[#ede9fe]",
  key_player: "text-[#0f766e] bg-[#ccfbf1]",
};

/* ── Locked gate ── */
/** Standalone locked/upgrade screen — render this from a server page that has
 *  already decided the viewer lacks the required plan (for BUILT features that
 *  shouldn't even fetch/expose their data to non-subscribers). */
export function FeatureLockedScreen({ config }: { config: FeatureConfig }) {
  return <LockedGate config={config} />;
}
function LockedGate({ config }: { config: FeatureConfig }) {
  const Icon = ICONS[config.iconName];
  const planLabel = PLAN_LABEL[config.requiredPlan];
  const planColor = PLAN_COLOR[config.requiredPlan];

  return (
    <div className="px-5 sm:px-8 py-10 max-w-[820px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* hero */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* icon with glow */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-[#ffd716]/30 blur-xl scale-110" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 border border-[#ffd716]/40 flex items-center justify-center">
              <Icon size={36} className="text-[#caa400]" />
            </div>
          </div>

          {/* plan badge */}
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full mb-4 ${planColor}`}>
            <Lock size={11} /> Requires {planLabel} plan
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e1e1e] dark:text-white mb-3">{config.name}</h1>
          <p className="text-[15px] text-[#6b6b6b] dark:text-white/60 leading-relaxed max-w-[500px]">{config.description}</p>
        </div>

        {/* feature points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {config.points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 relative overflow-hidden"
            >
              {/* subtle lock overlay */}
              <div className="absolute top-3 right-3">
                <Lock size={12} className="text-[#c3c3c3] dark:text-white/20" />
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/10 flex items-center justify-center mb-3">
                <Zap size={14} className="text-[#caa400]" />
              </div>
              <h3 className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1">{p.title}</h3>
              <p className="text-[12px] text-[#9a9a9a] leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* upgrade CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border border-[#ffd716]/40 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div>
            <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Unlock {config.name}</p>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-0.5">
              {requirementLabel({ kind: "plan", plan: config.requiredPlan })} or higher to access this feature.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/plans"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"
            >
              Upgrade to {planLabel} <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>

        <p className="mt-4 text-center text-[12px] text-[#b3b3b3]">
          <Link href="/dashboard/plans" className="hover:text-[#ffd716] transition-colors">View all plans and pricing →</Link>
        </p>
      </motion.div>
    </div>
  );
}

/* ── Coming soon (user has access, feature not yet live) ── */
function ComingSoon({ config }: { config: FeatureConfig }) {
  const Icon = ICONS[config.iconName];

  return (
    <div className="px-5 sm:px-8 py-10 max-w-[820px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* hero */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-[#ffd716]/30 blur-xl scale-110" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 border border-[#ffd716]/40 flex items-center justify-center">
              <Icon size={36} className="text-[#caa400]" />
            </div>
          </div>

          {/* access confirmed */}
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#16803c] bg-[#dcfce7] px-3 py-1 rounded-full mb-4">
            <CheckCircle size={12} /> Access included in your plan
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e1e1e] dark:text-white mb-3">{config.name}</h1>
          <p className="text-[15px] text-[#6b6b6b] dark:text-white/60 leading-relaxed max-w-[500px]">{config.description}</p>
        </div>

        {/* coming soon card */}
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-8 text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#f0f0f0] dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Clock size={22} className="text-[#9a9a9a]" />
          </div>
          <h2 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white mb-2">Coming soon</h2>
          <p className="text-[13px] text-[#9a9a9a] leading-relaxed max-w-[420px] mx-auto">
            {config.comingSoonNote ?? `${config.name} is in active development. As a ${PLAN_LABEL[config.requiredPlan]} member, you'll be among the first to get access when it launches.`}
          </p>
        </div>

        {/* what's included preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {config.points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
              className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle size={15} className="text-[#16803c] mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{p.title}</h3>
                  <p className="text-[12px] text-[#9a9a9a] mt-0.5 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Shell ── */
export function FeatureGatePage({ config }: { config: FeatureConfig }) {
  const viewer = useViewer();
  const access = evaluate(viewer, config.cap);

  if (access.state === "hidden") {
    return (
      <div className="flex items-center justify-center py-24 text-[#9a9a9a] text-sm">
        This feature is not available for your account type.
      </div>
    );
  }

  return access.state === "locked"
    ? <LockedGate config={config} />
    : <ComingSoon config={config} />;
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function FeatureGateSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-8 py-10 max-w-[820px] mx-auto">
      <div className="flex flex-col items-center text-center mb-10">
        <S cls="w-20 h-20 rounded-2xl mb-5" />
        <S cls="h-6 w-36 rounded-full mb-4" />
        <S cls="h-8 w-72 max-w-full" />
        <S cls="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
            <S cls="w-7 h-7 rounded-lg mb-3" />
            <S cls="h-4 w-40" /><S cls="mt-1.5 h-3 w-full" /><S cls="mt-1 h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center"><S cls="h-12 w-44 rounded-full" /></div>
    </div>
  );
}
