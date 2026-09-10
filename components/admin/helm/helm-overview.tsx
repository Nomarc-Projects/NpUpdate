"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  MessagesSquare, Users, Timer, Zap, ShieldCheck, ThumbsDown, ThumbsUp,
  Cpu, Wrench, TrendingUp, Database, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import type { HelmOverview } from "@/lib/services/helm-admin";

const PLAN_PILL: Record<string, string> = {
  free: "bg-[#f0f0f0] text-[#6b6b6b] dark:bg-white/10 dark:text-white/60",
  plus: "bg-[#e0edff] text-[#1d4ed8] dark:bg-[#6366f1]/20 dark:text-[#818cf8]",
  pro: "bg-[#fff7cc] text-[#8a7400] dark:bg-[#ffd716]/15 dark:text-[#ffd716]",
  premium: "bg-[#1e1e1e] text-white dark:bg-white dark:text-[#1e1e1e]",
};

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function StatTile({ icon: Icon, label, value, sub, accent, suffix }: {
  icon: LucideIcon; label: string; value: number; sub: string; accent: string; suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 hover:border-[#ffd716] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-[#9a9a9a] dark:text-white/50">{label}</p>
          <NumberTicker
            value={value}
            suffix={suffix}
            className="mt-1 block text-2xl font-black text-[#1e1e1e] dark:text-white"
          />
          <p className="text-[11px] text-[#aaa] dark:text-white/40 mt-1 truncate">{sub}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", accent)}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, iconClass, children, action }: {
  title: string; icon: LucideIcon; iconClass?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconClass ?? "text-[#ffd716]"} />
          <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function HelmOverviewView({ data }: { data: HelmOverview }) {
  const maxDaily = useMemo(() => Math.max(1, ...data.daily.map((d) => d.total)), [data.daily]);
  const maxDiscipline = useMemo(
    () => Math.max(1, ...data.topDisciplines.map((d) => d.messages)),
    [data.topDisciplines],
  );
  const maxTool = useMemo(() => Math.max(1, ...data.topTools.map((t) => t.count)), [data.topTools]);
  const hasActivity = data.totalMessages > 0 || data.meteredMessages > 0;

  const periodLabel = new Date(`${data.period}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {data.unavailable && (
        <div className="rounded-2xl border border-[#ffd716]/50 bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] p-4 sm:p-5 flex items-start gap-3">
          <Database size={18} className="text-[#b89500] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Nomabot tables not created yet</p>
            <p className="text-[12px] text-[#6b6b6b] dark:text-white/60 mt-1 leading-relaxed">
              Analytics will populate once migration{" "}
              <span className="font-mono text-[11px] bg-[#f0f0f0] dark:bg-white/10 px-1 rounded">0016_helm_ai.sql</span>{" "}
              is applied. Everything below is showing zeros, not an error.
            </p>
          </div>
        </div>
      )}

      {/* headline meters */}
      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" y={14}>
        <StatTile
          icon={MessagesSquare}
          label="Messages this month"
          value={data.messagesThisPeriod}
          sub={`${compact(data.totalMessages)} all-time · ${periodLabel}`}
          accent="bg-[#fff7cc] text-[#b89500] dark:bg-[#ffd716]/10"
        />
        <StatTile
          icon={Users}
          label="Active users (30d)"
          value={data.activeUsers30d}
          sub={`${data.activeUsersPeriod} metered this month`}
          accent="bg-[#dbeafe] text-[#3b82f6] dark:bg-[#3b82f6]/10"
        />
        <StatTile
          icon={Timer}
          label="Avg latency"
          value={data.avgLatencyMs}
          suffix="ms"
          sub="Per metered exchange"
          accent="bg-[#f3e8ff] text-[#8b5cf6] dark:bg-[#8b5cf6]/10"
        />
        <StatTile
          icon={Zap}
          label="Cache hit rate"
          value={data.cacheHitRate}
          suffix="%"
          sub={`${compact(data.meteredMessages)} metered exchanges`}
          accent="bg-[#dcfce7] text-[#16a34a] dark:bg-[#16a34a]/10"
        />
      </Reveal>

      {/* grounding + feedback */}
      <Reveal className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 sm:gap-5" y={14} delay={0.04}>
        <Panel title="Answer volume — last 14 days" icon={TrendingUp} iconClass="text-[#16a34a]">
          {hasActivity ? (
            <>
              <div className="flex items-end gap-1 sm:gap-1.5 h-[132px]">
                {data.daily.map((d) => (
                  <div key={d.date} className="group relative flex-1 flex flex-col justify-end h-full min-w-0">
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap rounded-md bg-[#1e1e1e] dark:bg-white px-2 py-1 text-[11px] font-medium text-white dark:text-[#1e1e1e] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      {d.label} · {d.total} msg{d.total === 1 ? "" : "s"}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-[#ffd716]/35 group-hover:bg-[#ffd716]/60 transition-colors"
                      style={{ height: `${(d.total / maxDaily) * 100}%`, minHeight: d.total > 0 ? 4 : 2 }}
                    >
                      <div
                        className="w-full rounded-t-md bg-[#ffd716] transition-all"
                        style={{ height: d.total > 0 ? `${(d.assistant / Math.max(1, d.total)) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-[#6b6b6b] dark:text-white/60">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ffd716]" /> Assistant
                  </span>
                  <span className="flex items-center gap-1.5 text-[11.5px] text-[#6b6b6b] dark:text-white/60">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ffd716]/35" /> User
                  </span>
                </div>
                <span className="text-[11.5px] text-[#9a9a9a] tabular-nums">
                  {data.daily[0]?.label} – {data.daily[data.daily.length - 1]?.label}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[#9a9a9a] py-10 text-center">No Nomabot conversations yet.</p>
          )}
        </Panel>

        <div className="space-y-4 sm:space-y-5">
          <Panel title="Grounding" icon={ShieldCheck} iconClass="text-[#3b82f6]">
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-black text-[#1e1e1e] dark:text-white tabular-nums">{data.groundedRate}%</p>
              <p className="text-[11.5px] text-[#9a9a9a] text-right">
                {compact(data.groundedMessages)} of {compact(data.assistantMessages)}
                <br />
                answers cited a source
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-[#3b82f6] transition-all duration-700"
                style={{ width: `${data.groundedRate}%` }}
              />
              <div className="h-full flex-1 bg-[#f59e0b]/40" />
            </div>
            <p className="text-[11.5px] text-[#9a9a9a] mt-2.5 leading-relaxed">
              Ungrounded answers are the corpus-gap signal — they land in{" "}
              <Link href="/admin/helm/review" className="font-semibold text-[#caa400] hover:underline">
                answer review
              </Link>
              .
            </p>
          </Panel>

          <Panel title="Feedback" icon={ThumbsUp} iconClass="text-[#16a34a]">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3.5">
                <ThumbsUp size={15} className="text-[#16a34a]" />
                <p className="text-xl font-black text-[#1e1e1e] dark:text-white mt-2 tabular-nums">{data.upvotes}</p>
                <p className="text-[11px] text-[#9a9a9a]">Helpful</p>
              </div>
              <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3.5">
                <ThumbsDown size={15} className="text-[#ef4444]" />
                <p className="text-xl font-black text-[#1e1e1e] dark:text-white mt-2 tabular-nums">{data.downvotes}</p>
                <p className="text-[11px] text-[#9a9a9a]">Reported</p>
              </div>
            </div>
            <Link
              href="/admin/helm/review"
              className="mt-3 flex items-center justify-between rounded-xl border border-[#ececec] dark:border-white/10 px-3.5 py-3 hover:border-[#ffd716] transition-colors group"
            >
              <div>
                <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{data.reviewQueue}</p>
                <p className="text-[11.5px] text-[#9a9a9a]">In the review queue</p>
              </div>
              <ArrowUpRight size={16} className="text-[#c9c9c9] group-hover:text-[#caa400] transition-colors" />
            </Link>
          </Panel>
        </div>
      </Reveal>

      {/* disciplines / tools / tokens */}
      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5" y={14} delay={0.08}>
        <Panel title="Top disciplines" icon={Cpu} iconClass="text-[#8b5cf6]">
          {data.topDisciplines.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] py-8 text-center">No conversations yet.</p>
          ) : (
            <div className="space-y-3.5">
              {data.topDisciplines.map((d) => (
                <div key={d.discipline}>
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white truncate">{d.label}</p>
                    <p className="text-[11.5px] text-[#9a9a9a] flex-shrink-0 tabular-nums">
                      {d.messages} msgs · {d.conversations} threads
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#8b5cf6] transition-all duration-700"
                      style={{ width: `${Math.max(3, (d.messages / maxDiscipline) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-4 sm:space-y-5">
          <Panel title="Tools invoked" icon={Wrench} iconClass="text-[#f59e0b]">
            {data.topTools.length === 0 ? (
              <p className="text-[13px] text-[#9a9a9a] py-6 text-center">No tool calls recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topTools.map((t) => (
                  <div key={t.tool} className="flex items-center gap-3">
                    <span className="font-mono text-[11.5px] text-[#6b6b6b] dark:text-white/60 w-32 truncate flex-shrink-0">
                      {t.tool}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#f59e0b] transition-all duration-700"
                        style={{ width: `${Math.max(3, (t.count / maxTool) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums w-10 text-right">
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Token spend & proposals" icon={Database} iconClass="text-[#06b6d4]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Input tokens", value: compact(data.inputTokens) },
                { label: "Output tokens", value: compact(data.outputTokens) },
                { label: "Proposals pending", value: String(data.proposalsPending) },
                { label: "Proposals applied", value: String(data.proposalsApplied) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3 text-center">
                  <p className="text-[16px] font-black text-[#1e1e1e] dark:text-white tabular-nums">{s.value}</p>
                  <p className="text-[10.5px] text-[#9a9a9a] mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Reveal>

      {/* heaviest users */}
      <Reveal y={14} delay={0.12}>
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10">
            <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Heaviest users · {periodLabel}</h2>
            <Link href="/admin/helm/quotas" className="text-[12.5px] font-medium text-[#caa400] hover:underline">
              Manage quotas →
            </Link>
          </div>
          {data.topUsers.length === 0 ? (
            <p className="text-[13px] text-[#9a9a9a] px-6 py-10 text-center">No metered usage this month.</p>
          ) : (
            <>
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_110px_110px] gap-2 px-5 sm:px-6 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
                {["User", "Plan", "Messages", "Avg latency"].map((h) => (
                  <span key={h} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">
                    {h}
                  </span>
                ))}
              </div>
              <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                {data.topUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="sm:grid sm:grid-cols-[1fr_100px_110px_110px] gap-2 flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-[#9a9a9a] truncate">{u.email}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize w-fit flex-shrink-0",
                        PLAN_PILL[u.plan] ?? PLAN_PILL.free,
                      )}
                    >
                      {u.plan}
                    </span>
                    <span className="hidden sm:block text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">
                      {u.messages.toLocaleString()}
                    </span>
                    <span className="hidden sm:block text-[12.5px] text-[#6b6b6b] dark:text-white/60 tabular-nums">
                      {u.latencyMs ? `${u.latencyMs} ms` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
