"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  RefreshCw, FileText, CheckCircle2, Clock, AlertTriangle, Layers, Search,
  PlugZap, Cpu, Server, Boxes, Info,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { reindexHelmKnowledge } from "@/lib/services/helm-admin";
import type { HelmDocumentRow, HelmDocumentStats, HelmKnowledgeStatus } from "@/lib/services/helm-admin";

const STATUS: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  indexed: { label: "Indexed", color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/15", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/15", icon: Clock },
  failed: { label: "Failed", color: "text-[#ef4444]", bg: "bg-[#fee2e2] dark:bg-[#ef4444]/15", icon: AlertTriangle },
};

function fileSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** `user:abc123` → `user`, so the namespace column stays readable. */
function namespaceKind(ns: string) {
  const [kind] = ns.split(":");
  return kind || ns;
}

export function HelmKnowledgeView({
  status,
  documents,
  stats,
}: {
  status: HelmKnowledgeStatus;
  documents: HelmDocumentRow[];
  stats: HelmDocumentStats;
}) {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const connected = status.configured && !!status.health?.ok;

  const filtered = useMemo(
    () =>
      documents.filter((d) => {
        if (filter !== "all" && d.indexStatus !== filter) return false;
        if (search) {
          const q = search.toLowerCase();
          return `${d.name} ${d.namespace} ${d.ownerName} ${d.ownerEmail}`.toLowerCase().includes(q);
        }
        return true;
      }),
    [documents, filter, search],
  );

  function runReindex(namespace: string, key: string) {
    if (!status.configured) {
      toast.error("Nomabot is not connected yet — nothing to reindex.");
      return;
    }
    setBusy(key);
    start(async () => {
      const res = await reindexHelmKnowledge(namespace);
      setBusy(null);
      if (res.ok) {
        toast.success(`Reindexed — ${res.chunks.toLocaleString()} chunks written.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Reindex failed.");
      }
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── VM state ─────────────────────────────────────────────── */}
      <Reveal y={14}>
        <div
          className={cn(
            "rounded-2xl border bg-white dark:bg-[#1e1e1e] p-5 sm:p-6",
            connected ? "border-[#ececec] dark:border-white/10" : "border-[#ffd716]/50",
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  connected
                    ? "bg-[#dcfce7] text-[#16a34a] dark:bg-[#16a34a]/10"
                    : "bg-[#fff7cc] text-[#b89500] dark:bg-[#ffd716]/10",
                )}
              >
                <PlugZap size={19} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Nomabot brain (OCI VM)</h2>
                  <span
                    className={cn(
                      "text-[10.5px] font-bold px-2 py-0.5 rounded-full",
                      connected
                        ? "bg-[#dcfce7] text-[#16803c] dark:bg-[#16a34a]/15 dark:text-[#4ade80]"
                        : "bg-[#fff3cd] text-[#b45309] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]",
                    )}
                  >
                    {!status.configured ? "Not connected yet" : connected ? "Connected" : "Unreachable"}
                  </span>
                </div>
                <p className="text-[12.5px] text-[#9a9a9a] mt-1 leading-relaxed max-w-lg">
                  {!status.configured
                    ? "The VM transport isn't configured in this environment, so the knowledge base is read-only. Set HELM_API_URL and the Cloudflare Access token pair to bring it online."
                    : connected
                      ? "Retrieval is live. Reindex after changing the curated corpus so answers pick up the new sources."
                      : (status.error ?? "The VM did not respond to a health check.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={!status.configured}
                className="rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716] disabled:opacity-50 transition-colors"
              >
                <option value="">Everything</option>
                <option value="corpus">Curated corpus</option>
                <option value="user">User documents</option>
                <option value="project">Project documents</option>
              </select>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => runReindex(scope, "global")}
                disabled={!status.configured || busy !== null}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={13} className={cn(busy === "global" && "animate-spin")} />
                {busy === "global" ? "Reindexing…" : "Reindex"}
              </motion.button>
            </div>
          </div>

          {/* health detail */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#f0f0f0] dark:border-white/10">
            {[
              {
                icon: Cpu,
                label: "Embedding model",
                value: status.health?.embeddingModel ?? (status.configured ? "Unknown" : "Not configured"),
                ok: !!status.health?.embeddingModel,
              },
              {
                icon: Server,
                label: "Chat providers",
                value: status.health?.chatProviders.length
                  ? status.health.chatProviders.join(", ")
                  : status.configured
                    ? "None reported"
                    : "Not configured",
                ok: !!status.health?.chatProviders.length,
              },
              {
                icon: Boxes,
                label: "Vector store",
                value: connected ? "Connected" : status.configured ? "Unreachable" : "Not configured",
                ok: connected,
              },
            ].map((h) => (
              <div key={h.label} className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3.5 flex items-start gap-2.5">
                <h.icon size={15} className={cn("mt-0.5 flex-shrink-0", h.ok ? "text-[#16a34a]" : "text-[#9a9a9a]")} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider">{h.label}</p>
                  <p className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5 break-words">
                    {h.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── index stats ──────────────────────────────────────────── */}
      <Reveal className="grid grid-cols-2 lg:grid-cols-5 gap-3" y={14} delay={0.04}>
        {[
          { label: "Sources", value: stats.total, icon: FileText, color: "text-[#6b6b6b] dark:text-white/60" },
          { label: "Indexed", value: stats.indexed, icon: CheckCircle2, color: "text-[#16a34a]" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-[#f59e0b]" },
          { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-[#ef4444]" },
          { label: "Chunks", value: stats.chunks, icon: Layers, color: "text-[#8b5cf6]" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 flex items-center gap-3"
          >
            <s.icon size={18} className={cn("flex-shrink-0", s.color)} />
            <div className="min-w-0">
              <p className="text-[18px] font-black text-[#1e1e1e] dark:text-white tabular-nums">
                {s.value.toLocaleString()}
              </p>
              <p className="text-[10.5px] text-[#9a9a9a]">{s.label}</p>
            </div>
          </div>
        ))}
      </Reveal>

      {/* ── sources ──────────────────────────────────────────────── */}
      <Reveal y={14} delay={0.08}>
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources by name, namespace or owner…"
              className="w-full sm:max-w-[380px] pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["all", "indexed", "pending", "failed"].map((key) => {
              const count = key === "all" ? documents.length : documents.filter((d) => d.indexStatus === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all capitalize",
                    filter === key
                      ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]"
                      : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]",
                  )}
                >
                  {key === "all" ? "All" : key} {count}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
          <div className="hidden lg:grid lg:grid-cols-[1fr_150px_120px_90px_90px_100px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
            {["Source", "Owner", "Namespace", "Chunks", "Status", ""].map((h, i) => (
              <span
                key={i}
                className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30"
              >
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <FileText size={26} className="mx-auto text-[#d4d4d4] dark:text-white/20" />
              <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white mt-3">
                {documents.length === 0 ? "No indexed sources yet" : "No sources match that filter"}
              </p>
              <p className="text-[12px] text-[#9a9a9a] mt-1 max-w-sm mx-auto leading-relaxed">
                {documents.length === 0
                  ? "Documents professionals give Nomabot appear here with their index status and chunk count. The curated corpus itself lives on the VM."
                  : "Try a different status or clear the search."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
              {filtered.map((d) => {
                const st = STATUS[d.indexStatus] ?? STATUS.pending;
                const StatusIcon = st.icon;
                return (
                  <div
                    key={d.id}
                    className="lg:grid lg:grid-cols-[1fr_150px_120px_90px_90px_100px] gap-2 px-5 py-3.5 lg:items-center hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{d.name}</p>
                      <p className="text-[11px] text-[#9a9a9a]">
                        {fileSize(d.sizeBytes)} · {shortDate(d.createdAt)}
                        {d.mimeType ? ` · ${d.mimeType}` : ""}
                      </p>
                      {d.error && (
                        <p className="text-[11px] text-[#ef4444] mt-1 flex items-start gap-1">
                          <Info size={11} className="mt-0.5 flex-shrink-0" />
                          <span className="break-words">{d.error}</span>
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 mt-2 lg:mt-0">
                      <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 truncate">{d.ownerName}</p>
                      <p className="text-[11px] text-[#b0b0b0] truncate lg:hidden">{d.ownerEmail}</p>
                    </div>

                    <div className="mt-2 lg:mt-0">
                      <span className="inline-block font-mono text-[11px] text-[#6b6b6b] dark:text-white/60 bg-[#f5f5f5] dark:bg-white/5 px-2 py-0.5 rounded">
                        {namespaceKind(d.namespace)}
                      </span>
                    </div>

                    <span className="hidden lg:block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white tabular-nums">
                      {d.chunkCount.toLocaleString()}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full w-fit mt-2 lg:mt-0",
                        st.color,
                        st.bg,
                      )}
                    >
                      <StatusIcon size={11} /> {st.label}
                    </span>

                    <div className="mt-2 lg:mt-0 lg:text-right">
                      <button
                        onClick={() => runReindex(d.namespace, d.id)}
                        disabled={!status.configured || busy !== null}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[11.5px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw size={11} className={cn(busy === d.id && "animate-spin")} />
                        Reindex
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/10 text-[11.5px] text-[#9a9a9a]">
            Showing {filtered.length} of {documents.length} sources · {stats.namespaces} namespace
            {stats.namespaces === 1 ? "" : "s"}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
