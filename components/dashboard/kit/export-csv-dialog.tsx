"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { FileDown } from "lucide-react";

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(","))].join("\n");
}

/**
 * "Export to CSV" confirm dialog (images 54/62/68) — generic over any row
 * shape; the caller supplies the already-flattened export rows for the
 * current selection.
 */
export function ExportCsvDialog<T extends Record<string, string | number>>({
  open,
  onClose,
  rows,
  filename,
  count,
}: {
  open: boolean;
  onClose: () => void;
  rows: T[];
  filename: string;
  count: number;
}) {
  const [exporting, setExporting] = useState(false);

  function doExport() {
    setExporting(true);
    try {
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
      onClose();
    } catch {
      toast.error("Couldn't export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Export to CSV (${count} selection${count === 1 ? "" : "s"})`} maxWidth="max-w-md">
      <p className="text-[13.5px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
        This will generate a CSV file containing information for your selected {count === 1 ? "record" : "records"}.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={doExport} disabled={exporting}>
          <FileDown size={15} className="mr-1.5 inline" /> {exporting ? "Exporting…" : "Export"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
