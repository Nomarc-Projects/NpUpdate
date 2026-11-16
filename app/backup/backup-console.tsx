"use client";

import { useRef, useState } from "react";

type Meta = {
  product: string;
  version: string;
  database: string;
  host: string;
  tables: number;
  bytes: number | null;
  rows: number | null;
};

function fmtBytes(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v < 10 && u > 0 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

function fmtRows(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

/**
 * The backup dashboard: what the database looks like, and the one button that
 * matters. The download streams the SQL file while showing live progress —
 * a big production dump can be hundreds of MB, so the browser never buffers
 * the whole thing silently.
 */
export function BackupConsole({ meta }: { meta: Meta }) {
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const startedAt = useRef(0);

  async function download() {
    setBusy(true);
    setError(null);
    setDone(null);
    setReceived(0);
    startedAt.current = Date.now();
    try {
      const res = await fetch("/api/backup/download", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Download failed (${res.status}).`);
        return;
      }
      const filename =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "nomarc-backup.sql";

      const reader = res.body?.getReader();
      if (!reader) {
        setError("This browser cannot stream the download.");
        return;
      }
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done: finished, value } = await reader.read();
        if (finished) break;
        if (value) {
          chunks.push(value);
          setReceived((prev) => prev + value.length);
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(filename);
    } catch {
      setError("Download failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const stats = [
    { label: "Database", value: meta.database || "—" },
    { label: "Engine", value: meta.product === "cockroachdb" ? "CockroachDB" : "PostgreSQL" },
    { label: "Host", value: meta.host || "—" },
    { label: "Tables", value: String(meta.tables) },
    { label: "Rows (est.)", value: fmtRows(meta.rows) },
    { label: "Size (est.)", value: fmtBytes(meta.bytes) },
  ];

  return (
    <div className="w-full max-w-[560px]">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffd716] text-xl" aria-hidden>🗄️</span>
          <div>
            <h1 className="text-[24px] font-bold text-white leading-tight">Backup console</h1>
            <p className="text-[13px] text-white/50">System database · full dump</p>
          </div>
        </div>
        <span className="rounded-full border border-[#ffd716]/40 bg-[#ffd716]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#ffd716]">
          super admin
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/40">{s.label}</dt>
            <dd className="mt-1 truncate text-[14px] font-semibold text-white" title={s.value}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <button
          onClick={download}
          disabled={busy}
          className="w-full rounded-xl bg-[#ffd716] px-4 py-3.5 text-[15px] font-bold text-[#1e1e1e] transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? `Dumping… ${fmtBytes(received)}` : "⬇  Download full backup (.sql)"}
        </button>

        {busy && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[#ffd716]" />
          </div>
        )}

        {done && !busy && (
          <p className="mt-3 text-[13px] text-emerald-300">
            ✓ Saved <span className="font-semibold">{done}</span> ({fmtBytes(received)} in{" "}
            {Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))}s)
          </p>
        )}
        {error && !busy && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            {error}
          </p>
        )}

        <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">
          One self-contained SQL file: schema (created from the live database),
          every table&apos;s data, foreign keys and sequence positions. Keep it
          somewhere safe — it is a full copy of user data.
        </p>
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-white/70">How to restore this on another server</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[12.5px] leading-relaxed text-white/50">
          <li>
            Create an empty database on the new server and set{" "}
            <code className="text-white/70">DATABASE_URL</code>.
          </li>
          <li>
            Load the file: <code className="text-white/70">pssql &quot;$DATABASE_URL&quot; -f nomarc-backup-….sql</code>{" "}
            — or, inside the app repo, <code className="text-white/70">npm run db:restore -- nomarc-backup-….sql</code>.
          </li>
          <li>
            Carry the <em>secrets</em> over too — they are not in the database:
            <code className="text-white/70"> BETTER_AUTH_SECRET</code>,{" "}
            <code className="text-white/70">JWT_SECRET</code>, R2 storage keys, SMTP.
          </li>
          <li>
            Then deploy the app against the new <code className="text-white/70">DATABASE_URL</code>.
          </li>
        </ol>
        <p className="mt-3 text-[12px] text-white/35">
          Restoring over a <em>populated</em> database would duplicate rows — the
          file is built for an empty one.
        </p>
      </details>
    </div>
  );
}
