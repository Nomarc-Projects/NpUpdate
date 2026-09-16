"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Check, X, HelpCircle, Calendar, MapPin, Package, MessageSquare, ChevronRight, ChevronLeft, CheckCircle2, Circle, Download } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { respondToQuote, type QuoteRow } from "@/lib/services/rfq";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { cn } from "@/lib/utils";

function quotesExport(rows: QuoteRow[], tab: string, fmt: "csv" | "xls") {
  const cols = ["Product", tab === "received" ? "From" : "To", "Quantity", "Required by", "Delivery", "Status", "Date"];
  const data = rows.map((q) => [q.productName, q.counterpartyName, q.quantity ?? "", q.requiredBy ?? "", q.deliveryLocation ?? "", q.status, q.date]);
  const date = new Date().toISOString().slice(0, 10);
  const url = (type: string, content: string) => { const u = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = u; a.download = `nomarc-quotes-${date}.${fmt}`; a.click(); URL.revokeObjectURL(u); };
  if (fmt === "csv") { const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`; url("text/csv", [cols, ...data].map((r) => r.map(esc).join(",")).join("\n")); }
  else { const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); const b = [cols, ...data].map((r, i) => `<tr>${r.map((v) => `<t${i === 0 ? "h" : "d"}>${esc(v)}</t${i === 0 ? "h" : "d"}>`).join("")}</tr>`).join(""); url("application/vnd.ms-excel", `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border="1">${b}</table></body></html>`); }
}
const Q_PER = ["10", "25", "50"];
import { createOrderFromQuote } from "@/lib/services/orders";
import { Pagination } from "@/components/ui/pagination";
import { r2Url } from "@/lib/r2-public";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#fef3c7] text-[#92400e]" },
  quoted: { label: "Quoted", cls: "bg-[#dcfce7] text-[#16803c]" },
  clarify: { label: "Needs info", cls: "bg-[#e0f2fe] text-[#0369a1]" },
  declined: { label: "Declined", cls: "bg-[#fde8e8] text-[#c0392b]" },
  accepted: { label: "Accepted", cls: "bg-[#16803c] text-white" },
};

export function QuotesView({ incoming = [], sent = [], canReceive = false }: { incoming?: QuoteRow[]; sent?: QuoteRow[]; canReceive?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">(canReceive ? "received" : "sent");
  // The redesign's chips. "New" is an untouched request, "Pending" one already
  // in play, "Archived" a thread either side has cleared.
  const [filter, setFilter] = useState<"all" | "new" | "pending" | "archived">("all");
  const [inList, setInList] = useState(incoming);
  const [respond, setRespond] = useState<{ q: QuoteRow; mode: "quoted" | "declined" | "clarify" } | null>(null);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<QuoteRow | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(0);

  function acceptQuote(q: QuoteRow) {
    setAccepting(true);
    createOrderFromQuote(q.id).then(() => { toast.success("Order placed from quote"); setDetail(null); router.push("/dashboard/my-orders"); })
      .catch((e) => { toast.error(e instanceof Error ? e.message : "Couldn't place order"); }).finally(() => setAccepting(false));
  }

  function submitResponse() {
    if (!respond) return;
    const { q, mode } = respond;
    setInList((l) => l.map((x) => (x.id === q.id ? { ...x, status: mode } : x)));
    setRespond(null); setMsg("");
    toast.success(mode === "quoted" ? "Quote sent" : mode === "declined" ? "Request declined" : "Clarification requested");
    respondToQuote(q.id, mode, msg).then(() => router.refresh()).catch((e) => { setInList(incoming); toast.error(e instanceof Error ? e.message : "Failed"); });
  }

  const source = tab === "received" ? inList : sent;
  const rows = source.filter((q) => {
    if (filter === "archived") return q.archived;
    if (q.archived) return false;
    if (filter === "new") return q.status === "pending";
    if (filter === "pending") return q.status === "quoted" || q.status === "clarify";
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = rows.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="max-w-[920px]">
        <DashBanner image={r2Url("site/photo-1450101499163-c8848c66ca85.jpg")}>
          <BannerContent
            eyebrow="RFQ"
            title="Quote Requests"
            subtitle={canReceive ? "Respond to buyers and track the quotes you've requested." : "Track the material quotes you've requested."}
            actions={rows.length > 0 ? (
              <>
                <button onClick={() => quotesExport(rows, tab, "csv")} className={bannerBtn}><Download size={13} /> CSV</button>
                <button onClick={() => quotesExport(rows, tab, "xls")} className={cn(bannerBtn, "hidden sm:inline-flex")}><Download size={13} /> Excel</button>
              </>
            ) : undefined}
          />
        </DashBanner>

        <div className="mt-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          {canReceive && (
            <div className="flex gap-1.5 mb-4">
              {(["received", "sent"] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setPage(0); }} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium capitalize transition-colors ${tab === t ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>{t === "received" ? "Received" : "Sent"}</button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
            {([["all", "All"], ["new", "New"], ["pending", "Pending"], ["archived", "Archived"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setFilter(k); setPage(0); }}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${filter === k ? "bg-[#ffd716] text-[#1e1e1e]" : "border border-[#e5e5e5] text-[#6b6b6b] hover:bg-[#f5f5f5] dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
              <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><FileText size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">{tab === "received" ? "No quote requests yet" : "No requests sent yet"}</h3>
              <p className="mt-1.5 max-w-sm text-[13px] text-[#9a9a9a]">{tab === "received" ? "When buyers request quotes on your products, they'll appear here." : "Request a quote from any product in the Exhibition Hub."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map((q) => (
                <div key={q.id} onClick={() => setDetail(q)} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4 sm:p-5 cursor-pointer hover:border-[#ffd716] transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#1e1e1e] dark:text-white flex-shrink-0"><Package size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white truncate">{q.productName}</p>
                    <p className="text-[12px] text-[#9a9a9a]">{tab === "received" ? "From" : "To"} {q.counterpartyName} • {q.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[q.status]?.cls ?? "bg-[#f0f0f0] text-[#6b6b6b]"}`}>{STATUS[q.status]?.label ?? q.status}</span>
                  <ChevronRight size={16} className="text-[#c9c9c9]" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[#6b6b6b] dark:text-white/60">
                {q.quantity && <span className="inline-flex items-center gap-1.5"><Package size={13} /> {q.quantity}</span>}
                {q.requiredBy && <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Required by {q.requiredBy}</span>}
                {q.deliveryLocation && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {q.deliveryLocation}</span>}
              </div>
              {q.message && <p className="mt-2.5 text-[13px] text-[#6b6b6b] dark:text-white/60">{q.message}</p>}
              {tab === "received" && q.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-[#f0f0f0] dark:border-white/10 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setRespond({ q, mode: "quoted" }); setMsg(""); }} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><Check size={14} /> Send quote</button>
                  <button onClick={() => { setRespond({ q, mode: "clarify" }); setMsg(""); }} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"><HelpCircle size={14} /> Ask for details</button>
                  <button onClick={() => { setRespond({ q, mode: "declined" }); setMsg(""); }} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"><X size={14} /> Decline</button>
                </div>
              )}
            </div>
          ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-[13px] text-[#9a9a9a]">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Per page</span>
                <div className="w-[70px]"><SelectMenu value={String(perPage)} options={Q_PER} onChange={(v) => { setPerPage(Number(v)); setPage(0); }} /></div>
                <span className="hidden sm:inline">· {rows.length} total</span>
              </div>
              <div className="flex items-center gap-1">
                <Pagination page={safePage + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <Modal open={!!respond} onClose={() => setRespond(null)}
        title={respond?.mode === "quoted" ? "Send a quote" : respond?.mode === "clarify" ? "Request more details" : "Decline request"}
        subtitle={respond?.q.productName}>
        <div className="space-y-4">
          <Field label={respond?.mode === "quoted" ? "Your quote / price & terms" : respond?.mode === "clarify" ? "What do you need to know?" : "Reason (optional)"}>
            <textarea rows={4} className={inputClass} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={respond?.mode === "quoted" ? "e.g. ₦450,000 per ton, 7-day delivery, MOQ 10 tons…" : respond?.mode === "clarify" ? "e.g. What grade and delivery window?" : "Let the buyer know why…"} />
          </Field>
          <div className="flex justify-end gap-2"><GhostButton onClick={() => setRespond(null)}>Cancel</GhostButton><PrimaryButton onClick={submitResponse}>Send</PrimaryButton></div>
        </div>
      </Modal>

      {/* detail slide-over */}
      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 z-[110]">
            <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="absolute right-0 top-0 h-full w-full max-w-[440px] bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
                <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Quote request</h3>
                <button onClick={() => setDetail(null)} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={18} /></button>
              </div>
              <div className="px-5 py-5 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400] flex-shrink-0"><Package size={20} /></span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white truncate">{detail.productName}</p>
                    <p className="text-[12px] text-[#9a9a9a]">{tab === "received" ? "From" : "To"} {detail.counterpartyName}</p>
                  </div>
                </div>
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS[detail.status]?.cls ?? "bg-[#f0f0f0] text-[#6b6b6b]"}`}>{STATUS[detail.status]?.label ?? detail.status}</span>

                <div className="grid grid-cols-2 gap-3">
                  {detail.quantity && <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3"><p className="text-[11px] text-[#9a9a9a] flex items-center gap-1"><Package size={12} /> Quantity</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{detail.quantity}</p></div>}
                  {detail.requiredBy && <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3"><p className="text-[11px] text-[#9a9a9a] flex items-center gap-1"><Calendar size={12} /> Required by</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{detail.requiredBy}</p></div>}
                  {detail.deliveryLocation && <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3 col-span-2"><p className="text-[11px] text-[#9a9a9a] flex items-center gap-1"><MapPin size={12} /> Delivery</p><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5">{detail.deliveryLocation}</p></div>}
                </div>

                {detail.message && <div><p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1">Message</p><p className="text-[13px] text-[#6b6b6b] dark:text-white/60 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] p-3">{detail.message}</p></div>}

                {/* timeline */}
                <div>
                  <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Progress</p>
                  <ol className="ml-1">
                    {[["Requested", true], ["Reviewed by supplier", detail.status !== "pending"], [detail.status === "declined" ? "Declined" : "Quoted", detail.status === "quoted" || detail.status === "declined" || detail.status === "accepted"], ["Accepted", detail.status === "accepted"]].map(([label, done], i, arr) => (
                      <li key={i} className="relative pl-6 pb-3 last:pb-0">
                        {i < arr.length - 1 && <span className={`absolute left-[7px] top-4 bottom-0 w-px ${done ? "bg-[#ffd716]" : "bg-[#e3e3e3] dark:bg-white/10"}`} />}
                        <span className="absolute left-0 top-0.5">{done ? <CheckCircle2 size={15} className="text-[#caa400]" /> : <Circle size={15} className="text-[#d4d4d4] dark:text-white/20" />}</span>
                        <p className={`text-[12.5px] ${done ? "text-[#1e1e1e] dark:text-white font-medium" : "text-[#9a9a9a]"}`}>{label as string}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {tab === "received" && detail.status === "pending" && (
                    <button onClick={() => { setRespond({ q: detail, mode: "quoted" }); setMsg(""); setDetail(null); }} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><Check size={15} /> Send quote</button>
                  )}
                  {tab === "sent" && detail.status === "quoted" && (
                    <button onClick={() => acceptQuote(detail)} disabled={accepting} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-60"><Check size={15} /> {accepting ? "Placing order…" : "Accept & place order"}</button>
                  )}
                  <button onClick={() => router.push("/dashboard/messages")} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors"><MessageSquare size={15} /> Message {tab === "received" ? "buyer" : "supplier"}</button>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function QuotesSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6">
      <div className="max-w-[920px]">
        {/* banner skeleton */}
        <S cls="rounded-2xl h-[110px] sm:h-[118px] w-full" />
        <div className="mt-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex gap-1.5 mb-4">{[80, 64].map((w, i) => <S key={i} cls="h-8 rounded-full" style={{ width: w }} />)}</div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <S cls="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="space-y-1.5"><S cls="h-4 w-36" /><S cls="h-3 w-44" /></div>
                  </div>
                  <S cls="h-6 w-20 rounded-full flex-shrink-0" />
                </div>
                <div className="mt-3 flex gap-5"><S cls="h-3 w-20" /><S cls="h-3 w-28" /></div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
