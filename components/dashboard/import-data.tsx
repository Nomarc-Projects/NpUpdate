"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Reusable bulk-import modal: download a sample → drag-drop a CSV → live
 * progress with added/success/failed stats. Config-driven so any dashboard
 * (products, users, taxonomy, leads…) can reuse it by supplying columns, a
 * sample row, the required key, and an async `importRow` handler.
 */
export type ImportConfig = {
  title: string;
  subtitle: string;
  noun: string;            // "products", "users"…
  columns: string[];       // CSV header, e.g. ["Name","SKU",…]
  sample: string[];        // one example row aligned to columns
  requiredKey: string;     // lowercase column that must be present, e.g. "name"
  templateName: string;    // download filename, e.g. "nomarc-products-template.csv"
  importRow: (row: Record<string, string>) => Promise<unknown>;
};

function parseLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

type Phase = "upload" | "running" | "done";

export function ImportData({ config, onClose, onDone }: { config: ImportConfig; onClose: () => void; onDone?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, added: 0, failed: 0 });
  const [errors, setErrors] = useState<string[]>([]);

  function downloadTemplate() {
    const esc = (c: string) => `"${c.replace(/"/g, '""')}"`;
    const csv = [config.columns, config.sample].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = config.templateName; a.click(); URL.revokeObjectURL(url);
  }
  function pick(f?: File | null) {
    if (!f) return;
    if (!/\.(csv|xls|xlsx)$/i.test(f.name)) { toast.error("Use a .csv, .xls or .xlsx file"); return; }
    if (f.size > 25 * 1024 * 1024) { toast.error("Max file size is 25 MB"); return; }
    setFile(f);
  }
  async function run() {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { toast.error("Excel files: please save as CSV and re-upload"); return; }
    const rows = parseCsv(await file.text()).filter((r) => (r[config.requiredKey] || "").trim());
    if (rows.length === 0) { toast.error(`No ${config.noun} rows found. Check the template columns.`); return; }
    setPhase("running"); setStats({ total: rows.length, added: 0, failed: 0 }); setProgress(0); setErrors([]);
    let added = 0, failed = 0;
    for (let i = 0; i < rows.length; i++) {
      try { await config.importRow(rows[i]); added++; }
      catch (e) { failed++; setErrors((er) => [...er, `Row ${i + 2}: ${e instanceof Error ? e.message : "failed"}`]); }
      setStats({ total: rows.length, added, failed });
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setPhase("done");
    onDone?.();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={phase === "running" ? undefined : onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full sm:max-w-[540px] max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10">
          <div>
            <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{config.title}</h3>
            <p className="text-[12px] text-[#9a9a9a]">{config.subtitle}</p>
          </div>
          {phase !== "running" && <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>}
        </div>

        <div className="px-5 sm:px-6 py-5">
          {phase === "upload" && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                onClick={() => fileRef.current?.click()}
                className={cn("rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center py-10 px-6 cursor-pointer transition-colors", drag ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]" : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]")}
              >
                <div className="w-12 h-12 rounded-xl bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] mb-3"><FileSpreadsheet size={24} /></div>
                {file ? (
                  <>
                    <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">{file.name}</p>
                    <p className="text-[12px] text-[#9a9a9a] mt-0.5">{(file.size / 1024).toFixed(0)} KB · click to choose another</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-medium text-[#1e1e1e] dark:text-white inline-flex items-center gap-1.5"><UploadCloud size={16} /> Drag & drop or <span className="text-[#caa400]">choose file</span></p>
                    <p className="text-[12px] text-[#9a9a9a] mt-1">Supported: .CSV .XLS .XLSX · Max 25 MB</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#ececec] dark:border-white/10 p-3.5">
                <div className="w-9 h-9 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] flex-shrink-0"><FileSpreadsheet size={17} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Sample file</p>
                  <p className="text-[12px] text-[#9a9a9a]">Download a starting point with the right columns.</p>
                </div>
                <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors flex-shrink-0"><Download size={13} /> Download</button>
              </div>
            </>
          )}

          {phase !== "upload" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] flex-shrink-0"><FileSpreadsheet size={20} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{file?.name}</p>
                  <p className="text-[12px] text-[#9a9a9a]">{phase === "running" ? "Import in progress…" : "Import complete"}</p>
                </div>
                <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden mb-5">
                <motion.div className="h-full rounded-full bg-[#ffd716]" animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3"><p className="text-lg font-bold text-[#1e1e1e] dark:text-white">{stats.total}</p><p className="text-[11px] text-[#9a9a9a]">Rows</p></div>
                <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3"><div className="flex items-center justify-between"><p className="text-lg font-bold text-[#16a34a]">{stats.added}</p><CheckCircle2 size={16} className="text-[#16a34a]" /></div><p className="text-[11px] text-[#9a9a9a]">Added</p></div>
                <div className="rounded-xl border border-[#ececec] dark:border-white/10 p-3"><div className="flex items-center justify-between"><p className="text-lg font-bold text-[#e5484d]">{stats.failed}</p><AlertTriangle size={16} className={stats.failed ? "text-[#e5484d]" : "text-[#d4d4d4]"} /></div><p className="text-[11px] text-[#9a9a9a]">Failed</p></div>
              </div>
              {errors.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#e5484d]/30 bg-[#fdecec] dark:bg-[#e5484d]/10 p-3 max-h-32 overflow-y-auto">
                  <p className="text-[12px] font-semibold text-[#c0392b] dark:text-[#f87171] mb-1">{errors.length} row(s) skipped</p>
                  {errors.slice(0, 8).map((e, i) => <p key={i} className="text-[11.5px] text-[#c0392b] dark:text-[#f87171]">{e}</p>)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
          {phase === "upload" && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white">Cancel</button>
              <button onClick={run} disabled={!file} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-50">Import</button>
            </>
          )}
          {phase === "running" && <span className="inline-flex items-center gap-2 text-[13px] text-[#9a9a9a]"><Loader2 size={15} className="animate-spin" /> Importing… don&apos;t close this window</span>}
          {phase === "done" && (
            <>
              <button onClick={() => { setFile(null); setPhase("upload"); setProgress(0); }} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white">Import another</button>
              <button onClick={onClose} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors">Done <ArrowRight size={15} /></button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
