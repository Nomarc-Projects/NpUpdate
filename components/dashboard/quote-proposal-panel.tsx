"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Paperclip, Pencil, XCircle, MessageSquareWarning } from "lucide-react";
import { Field, inputClass, GhostButton, PrimaryButton, Modal } from "@/components/ui/modal";
import { FileUpload, type UploadItem } from "@/components/ui/file-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { uploadFile } from "@/lib/upload-client";
import {
  getProposals, sendQuoteProposal, withdrawQuoteProposal, respondToProposal, type Proposal,
} from "@/lib/services/quote-proposals";
import { createOrderFromQuote } from "@/lib/services/orders";

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * The priced half of a quote thread.
 *
 * Replaces the free-text reply that was never persisted: an exhibitor now sends
 * typed terms (quantity, total, validity, note, attachments) and the buyer gets
 * the three actions the design calls for — Accept, Decline, Request Changes —
 * instead of Accept alone.
 *
 * Prices are handled in naira here and converted to kobo by the service, which
 * is the only place the conversion happens.
 */
export function QuoteProposalPanel({
  quoteRequestId, productName, isBuyer, onChanged,
}: { quoteRequestId: string; productName: string; isBuyer: boolean; onChanged?: () => void }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");

  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  async function refresh() {
    try { setProposals(await getProposals(quoteRequestId)); }
    catch { setProposals([]); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [quoteRequestId]);

  // The live offer is the newest row still open; everything older is history.
  const live = proposals?.find((p) => p.status === "sent") ?? null;
  const settled = proposals?.find((p) => p.status === "accepted" || p.status === "declined") ?? null;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); await refresh(); onChanged?.(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work."); }
    finally { setBusy(false); }
  }

  function send() {
    const parsed = total.trim() ? Number(total.replace(/,/g, "")) : undefined;
    if (total.trim() && !Number.isFinite(parsed)) { toast.error("Enter the total price as a number."); return; }
    run(
      () => sendQuoteProposal({
        quoteRequestId, quantityQuoted: qty, totalPriceNaira: parsed,
        validUntil, note, attachments,
      }),
      "Quote sent",
    ).then(() => {
      setComposing(false);
      setQty(""); setTotal(""); setValidUntil(""); setNote(""); setAttachments([]);
    });
  }

  if (proposals === null) {
    return <div className="flex items-center gap-2 py-6 text-[13px] text-[#9a9a9a]"><Loader2 size={14} className="animate-spin" /> Loading quote…</div>;
  }

  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#f0f0f0] dark:border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40">Quote Proposal</p>
      </div>

      <div className="p-5">
        {/* ── the terms, once there are any ── */}
        {(live ?? settled) && !composing && (
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
            <Terms p={(live ?? settled)!} />
            {(live ?? settled)!.buyerNote && (
              <p className="mt-3 rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-[12.5px] text-[#4a4a4a] dark:text-white/70">
                <span className="font-semibold">Buyer note:</span> {(live ?? settled)!.buyerNote}
              </p>
            )}
            {settled && (
              <p className={`mt-3 text-[12.5px] font-semibold ${settled.status === "accepted" ? "text-[#16a34a]" : "text-[#e5484d]"}`}>
                {settled.status === "accepted" ? "Accepted by the buyer." : "Declined by the buyer."}
              </p>
            )}
          </div>
        )}

        {/* ── exhibitor: compose or manage ── */}
        {!isBuyer && (composing || !live ? (
          composing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Product"><input className={inputClass} value={productName} readOnly /></Field>
                <Field label="Quantity Quoted"><input className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50 Tons" /></Field>
                <Field label="Total Price (₦)"><input className={inputClass} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="45,000,000" inputMode="decimal" /></Field>
                <Field label="Validity"><DatePicker value={validUntil} onChange={setValidUntil} placeholder="dd / mm / yy" /></Field>
              </div>
              <Field label="Note">
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={3} className={inputClass + " resize-none"} placeholder="Enter any additional relevant info…" />
              </Field>
              <Field label="Attachments" hint="Optional — invoice or other files, up to 10MB each.">
                <FileUpload
                  accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                  maxSizeMB={10}
                  multiple
                  label="Browse files… or drag & drop a file here"
                  upload={(file) => uploadFile(file, "doc")}
                  onChange={(items: UploadItem[]) => setAttachments(items.map((i) => i.url).filter(Boolean) as string[])}
                />
              </Field>
              <div className="flex items-center justify-end gap-3">
                <GhostButton type="button" onClick={() => setComposing(false)}>Cancel</GhostButton>
                <PrimaryButton type="button" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send Quote"}</PrimaryButton>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffd716] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"
            >
              <CheckCircle2 size={14} /> Send Quote
            </button>
          )
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => { setQty(live.quantityQuoted ?? ""); setTotal(live.totalPrice != null ? String(live.totalPrice / 100) : ""); setValidUntil(live.validUntil ?? ""); setNote(live.note ?? ""); setComposing(true); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
            >
              <Pencil size={14} /> Edit Terms
            </button>
            <button
              onClick={() => run(() => withdrawQuoteProposal(live.id), "Quote withdrawn")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-semibold text-[#e5484d] transition-colors hover:border-[#e5484d] disabled:opacity-60 dark:border-white/15"
            >
              <XCircle size={14} /> Withdraw Quote
            </button>
          </div>
        ))}

        {/* ── buyer: the three verdicts ── */}
        {isBuyer && live && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => run(() => respondToProposal(live.id, "declined"), "Quote declined")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-semibold text-[#6b6b6b] transition-colors hover:border-[#e5484d] hover:text-[#e5484d] disabled:opacity-60 dark:border-white/15 dark:text-white/60"
            >
              <XCircle size={14} /> Decline
            </button>
            <button
              onClick={() => setChangesOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e3e3] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] disabled:opacity-60 dark:border-white/15 dark:text-white"
            >
              <MessageSquareWarning size={14} /> Request Changes
            </button>
            <button
              onClick={() => run(
                // Accepting is what turns the thread into an order — the same
                // step the old Accept & Order button performed.
                async () => { await respondToProposal(live.id, "accepted"); await createOrderFromQuote(quoteRequestId); },
                "Quote accepted — order created",
              )}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffd716] px-4 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Accept Quote
            </button>
          </div>
        )}

        {isBuyer && !live && !settled && (
          <p className="text-[13px] text-[#9a9a9a]">No quote yet — the supplier will send priced terms here.</p>
        )}
      </div>

      <Modal
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        subtitle="Tell the supplier what to revise so they can re-quote."
        maxWidth="max-w-[480px]"
        footer={
          <>
            <GhostButton type="button" onClick={() => setChangesOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              type="button"
              disabled={busy}
              onClick={() => {
                if (!live) return;
                run(() => respondToProposal(live.id, "changes_requested", changesNote), "Changes requested")
                  .then(() => { setChangesOpen(false); setChangesNote(""); });
              }}
            >
              Send request
            </PrimaryButton>
          </>
        }
      >
        <textarea
          value={changesNote}
          onChange={(e) => setChangesNote(e.target.value.slice(0, 1000))}
          rows={4}
          className={inputClass + " resize-none"}
          placeholder="e.g. Could you split delivery into two batches?"
        />
      </Modal>
    </div>
  );
}

function Terms({ p }: { p: Proposal }) {
  return (
    <div className="space-y-1.5 text-[13px]">
      {p.quantityQuoted && <Row label="Quantity Quoted" value={p.quantityQuoted} />}
      {p.totalPrice != null && <Row label="Total Price" value={naira(p.totalPrice)} />}
      {p.validUntil && <Row label="Validity" value={`Valid until ${fmtDate(p.validUntil)}`} />}
      {p.note && <p className="pt-1.5 text-[12.5px] text-[#4a4a4a] dark:text-white/70">{p.note}</p>}
      {p.attachments.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[12.5px] text-[#1e1e1e] hover:border-[#ffd716] dark:border-white/15 dark:bg-white/5 dark:text-white">
          <Paperclip size={13} className="text-[#9a9a9a]" /> <span className="truncate">{url.split("/").pop()}</span>
          <span className="ml-auto text-[#9a9a9a]">Download</span>
        </a>
      ))}
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <p><span className="font-semibold text-[#1e1e1e] dark:text-white">{label}:</span> <span className="text-[#4a4a4a] dark:text-white/70">{value}</span></p>
);
