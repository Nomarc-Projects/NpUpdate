"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Clock, ArrowDownToLine, X, Building2,
  CheckCircle2, TrendingUp, Coins, Loader2,
  Copy, ChevronRight, AlertCircle, RefreshCw, Trash2,
  Download, Search, MoreVertical, Pencil, GripHorizontal, Star, Mail,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Field, inputClass } from "@/components/ui/modal";
import { naira } from "@/lib/sample-catalog";
import { NumberTicker } from "@/components/ui/number-ticker";
import { saveVendorPaymentAccount, deleteVendorPaymentAccount, requestPayout, type WalletView as WV, type PaymentAccount } from "@/lib/services/payouts";
import { guessBanks } from "@/lib/nuban";
import { NIGERIAN_BANKS } from "@/lib/constants/nigerian-banks";
import { getBankLogoUrl, getBankKeywords } from "@/lib/bank-domains";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store/auth";
import { ReceiptPrinterIntro } from "@/components/ui/receipt-printer";
import { generateQRSVG } from "@/components/ui/qr-code";
import { PRODUCTION_ORIGIN, CLIENT_SITE_ORIGIN } from "@/lib/site-url";
import { r2Url } from "@/lib/r2-public";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Entry = WV["entries"][number];

/* ─── Balance ticker — large integer + small grey decimal ──────────────── */
function BalanceTicker({ value, className }: { value: number; className?: string }) {
  const intPart = Math.floor(value);
  const decPart = String(Math.round((value - intPart) * 100)).padStart(2, "0");
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <NumberTicker value={intPart} prefix="₦" decimalPlaces={0} />
      <span className="font-black text-[0.52em] text-[#b0b0b0] dark:text-white/30 ml-[1px] tracking-tight">.{decPart}</span>
    </span>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, accent, cta, onCta, ctaDisabled,
}: {
  label: string; value: number; sub?: string; icon: typeof Wallet;
  accent?: string; cta?: string; onCta?: () => void; ctaDisabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: hovered ? -3 : 0, boxShadow: hovered ? "0 14px 40px rgba(0,0,0,0.16)" : "0 4px 18px rgba(0,0,0,0.10)" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 flex flex-col gap-3 cursor-default"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold text-[#9a9a9a] dark:text-white/50 leading-none">{label}</p>
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 overflow-hidden",
          hovered ? "bg-[#ffd716]/15" : "bg-[#f4f4f4] dark:bg-white/5"
        )}>
          <motion.span
            animate={hovered
              ? { scale: 1.25, rotate: [0, -14, 11, -7, 5, 0], y: [0, -4, 0] }
              : { scale: 1, rotate: 0, y: 0 }
            }
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <Icon size={16} className={hovered ? "text-[#b89500]" : "text-[#bbb] dark:text-white/30"} />
          </motion.span>
        </div>
      </div>
      <div>
        <BalanceTicker value={value} className={cn("text-[22px] sm:text-2xl font-black leading-tight", accent ?? "text-[#1e1e1e] dark:text-white")} />
        {sub && <p className="text-[11px] text-[#aaa] dark:text-white/40 mt-1">{sub}</p>}
      </div>
      {cta && (
        <button onClick={onCta} disabled={ctaDisabled}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] active:scale-[0.97] transition-all disabled:opacity-40 mt-auto"
        >
          <ArrowDownToLine size={13} /> {cta}
        </button>
      )}
    </motion.div>
  );
}

/* ─── Bank logo ──────────────────────────────────────────────────────────── */
function BankLogo({ bankCode, bankName }: { bankCode: string | null; bankName: string | null }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getBankLogoUrl(bankCode);
  if (!logoUrl || failed) {
    return <Building2 size={18} className="text-white/50" />;
  }
  return (
    <img
      src={logoUrl}
      alt={bankName ?? ""}
      className="w-5 h-5 rounded object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/* ─── Card palette per slot ──────────────────────────────────────────────── */
const CARD_PALETTE = [
  // Slot 0 — violet-indigo (primary)
  { bg: "linear-gradient(140deg,#312e81 0%,#4338ca 52%,#5b21b6 100%)", blob1: "rgba(139,92,246,0.38)", blob2: "rgba(79,70,229,0.22)", dot: "rgba(196,181,253,0.07)", accent: "#a5b4fc" },
  // Slot 1 — ocean blue
  { bg: "linear-gradient(140deg,#1e3a8a 0%,#1d4ed8 52%,#0369a1 100%)", blob1: "rgba(59,130,246,0.38)", blob2: "rgba(14,165,233,0.22)", dot: "rgba(147,197,253,0.07)", accent: "#93c5fd" },
  // Slot 2 — emerald-teal
  { bg: "linear-gradient(140deg,#064e3b 0%,#047857 52%,#0f766e 100%)", blob1: "rgba(16,185,129,0.38)", blob2: "rgba(20,184,166,0.22)", dot: "rgba(110,231,183,0.07)", accent: "#6ee7b7" },
];
const CARD_H = 172;
const STACK_Y = 9;        // px peek per card in stack
const SPREAD_Y = 88;      // visible portion per card when fanned
const WALLET_FOOT = 56;   // wallet body visible below card stack

function fmtAcct(n: string) { return n.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"); }

/* ─── Primary star badge with burst animation ────────────────────────────── */
function PrimaryStarBadge({ isPrimary }: { isPrimary: boolean }) {
  const [justSet, setJustSet] = useState(false);
  const prev = useRef(isPrimary);
  useEffect(() => {
    if (!prev.current && isPrimary) { setJustSet(true); setTimeout(() => setJustSet(false), 800); }
    prev.current = isPrimary;
  }, [isPrimary]);

  const BURST_ANGLES = [0, 60, 120, 180, 240, 300];
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      <motion.div
        animate={justSet ? { scale: [1, 1.9, 1.4, 1], rotate: [0, 22, -15, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <Star
          size={14}
          fill={isPrimary ? "#ffd716" : "none"}
          strokeWidth={isPrimary ? 0 : 1.6}
          className={isPrimary ? "text-[#ffd716]" : "text-white/25"}
        />
      </motion.div>
      <AnimatePresence>
        {justSet && BURST_ANGLES.map((deg) => (
          <motion.span
            key={deg}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: 0, x: Math.cos(deg * Math.PI / 180) * 16, y: Math.sin(deg * Math.PI / 180) * 16, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#ffd716] pointer-events-none"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Email-verify modal for "Set as primary" ────────────────────────────── */
const DEMO_PRIMARY_CODE = "123456";
function maskEmail(e: string) {
  const [n, d] = e.split("@");
  return `${n.slice(0, 2)}${"*".repeat(Math.max(2, n.length - 2))}@${d}`;
}
function PrimaryVerifyModal({
  account, userEmail, onConfirm, onClose,
}: { account: PaymentAccount; userEmail: string; onConfirm: () => void; onClose: () => void }) {
  const [step, setStep] = useState<"confirm" | "verify">("confirm");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSend() {
    setBusy(true);
    setTimeout(() => { setBusy(false); setStep("verify"); toast.success("Code sent (demo: 123456)"); }, 900);
  }
  function handleVerify() {
    if (code !== DEMO_PRIMARY_CODE) { toast.error("Incorrect code — try again"); return; }
    onConfirm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative w-full sm:max-w-sm bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#ffd716]/15 flex items-center justify-center mb-3">
              <Star size={18} fill="#ffd716" className="text-[#ffd716]" />
            </div>
            <h3 className="text-[16px] font-bold text-white">Set as primary account</h3>
            <p className="text-[12.5px] text-white/50 mt-0.5">
              {account.bankName} · ···{account.accountNumber?.slice(-4)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {step === "confirm" ? (
          <>
            <div className="rounded-xl bg-white/5 border border-white/8 px-4 py-3 flex items-center gap-3">
              <Mail size={15} className="text-[#ffd716] flex-shrink-0" />
              <div>
                <p className="text-[11px] text-white/40 font-medium">Verification code will be sent to</p>
                <p className="text-[13px] text-white font-semibold">{maskEmail(userEmail)}</p>
              </div>
            </div>
            <p className="text-[12px] text-white/40 -mt-2">
              Changing your primary payout account requires email verification for security.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] text-white/50 hover:text-white hover:border-white/20 transition-colors">Cancel</button>
              <motion.button
                onClick={handleSend} disabled={busy} whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {busy ? "Sending…" : "Send code"}
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[12.5px] text-white/60 mb-3">Enter the 6-digit code sent to <span className="text-white font-medium">{maskEmail(userEmail)}</span></p>
              <input
                type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-[20px] font-mono font-bold tracking-[0.5em] text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffd716]/60 text-center"
              />
              <p className="text-[11px] text-[#ffd716]/60 mt-2 text-center">Demo mode — enter <span className="font-bold text-[#ffd716]">123456</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("confirm")} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[13px] text-white/50 hover:text-white transition-colors">Back</button>
              <motion.button
                onClick={handleVerify} disabled={code.length !== 6} whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] disabled:opacity-40 transition-colors"
              >
                Confirm
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Three-dot card menu ─────────────────────────────────────────────────── */
function CardMenu({
  onEdit, onRemove, canRemove, isPrimary, onSetPrimary,
}: { onEdit: () => void; onRemove: () => void; canRemove: boolean; isPrimary: boolean; onSetPrimary: () => void }) {
  const [open, setOpen] = useState(false);
  const [delStep, setDelStep] = useState(0);

  function handleDel(e: React.MouseEvent) {
    e.stopPropagation();
    if (delStep === 0) {
      setDelStep(1);
      setTimeout(() => setDelStep(0), 3500);
    } else {
      onRemove();
      setOpen(false);
      setDelStep(0);
    }
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { setOpen((o) => !o); setDelStep(0); }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
      >
        <MoreVertical size={14} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setOpen(false); setDelStep(0); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -6 }}
              transition={{ type: "spring", stiffness: 480, damping: 30 }}
              className="absolute right-0 top-8 w-44 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Primary status row */}
              {isPrimary ? (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-[#ffd716]/80 border-b border-white/[0.06]">
                  <Star size={12} fill="#ffd716" className="text-[#ffd716]" /> Primary account
                </div>
              ) : (
                <button
                  onClick={() => { onSetPrimary(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-white/80 hover:bg-white/8 transition-colors border-b border-white/[0.06]"
                >
                  <Star size={13} className="text-white/40" /> Set as primary
                </button>
              )}
              <button
                onClick={() => { onEdit(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-white/80 hover:bg-white/8 transition-colors"
              >
                <Pencil size={13} className="text-[#ffd716]" /> Edit details
              </button>
              {canRemove && (
                <motion.button
                  onClick={handleDel}
                  animate={delStep === 1 ? { backgroundColor: "rgba(239,68,68,0.18)" } : { backgroundColor: "transparent" }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] transition-colors border-t border-white/[0.06]",
                    delStep === 1 ? "text-red-400" : "text-red-400/60 hover:text-red-400 hover:bg-white/5"
                  )}
                >
                  <Trash2 size={13} />
                  {delStep === 1 ? "Confirm — tap to delete" : "Remove account"}
                </motion.button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Single draggable card ──────────────────────────────────────────────── */
function BankCardItem({
  account, index, total, spread, isDragging, isDropTarget,
  onDragStart, onDragEnd, onEdit, onRemove, canRemove, deleting,
  onDragMove, onDragCommit, isPrimary, onSetPrimary,
}: {
  account: PaymentAccount; index: number; total: number; spread: boolean;
  isDragging: boolean; isDropTarget: boolean;
  onDragStart: () => void; onDragEnd: () => void;
  onEdit: () => void; onRemove: () => void; canRemove: boolean; deleting: boolean;
  onDragMove: (offsetY: number) => void;
  onDragCommit: (offsetY: number) => void;
  isPrimary: boolean; onSetPrimary: () => void;
}) {
  const pal = CARD_PALETTE[index % CARD_PALETTE.length];

  function copyAcct(e: React.MouseEvent) {
    e.stopPropagation();
    if (account.accountNumber) navigator.clipboard.writeText(account.accountNumber).then(() => toast.success("Copied"));
  }

  const stackY = index * STACK_Y;
  const stackRot = -(index * 2.5);
  const stackScale = 1 - index * 0.028;
  const spreadY = index * SPREAD_Y;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.07}
      dragSnapToOrigin
      onDragStart={onDragStart}
      onDrag={(_, info) => { if (spread) onDragMove(info.offset.y); }}
      onDragEnd={(_, info) => { onDragCommit(info.offset.y); onDragEnd(); }}
      animate={{
        y: spread ? spreadY : stackY,
        rotate: spread ? 0 : stackRot,
        scale: isDragging ? 1.04 : spread ? 1 : stackScale,
        opacity: deleting ? 0.4 : 1,
      }}
      transition={{ type: "spring", stiffness: 290, damping: 26, mass: 0.85 }}
      style={{
        position: "absolute", width: "100%",
        zIndex: isDragging ? 100 : total - index,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      className="touch-none select-none"
      whileDrag={{ scale: 1.04, zIndex: 100 }}
    >
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: pal.bg, minHeight: CARD_H }}
        animate={{
          boxShadow: isDragging
            ? "0 28px 65px rgba(0,0,0,0.75),0 10px 24px rgba(0,0,0,0.45)"
            : isDropTarget
              ? "0 0 0 2px #ffd716, 0 8px 32px rgba(255,215,22,0.35)"
              : spread
                ? "0 10px 36px rgba(0,0,0,0.4)"
                : `0 ${4 + index * 2}px ${14 + index * 5}px rgba(0,0,0,0.32)`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        {/* Colour blobs */}
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none" style={{ background: pal.blob1 }} />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ background: pal.blob2 }} />

        {/* Dot-grid texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px,${pal.dot} 1px,transparent 0)`, backgroundSize: "18px 18px" }} />

        {/* Diagonal gloss sheen */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 48%,rgba(255,255,255,0.03) 100%)" }} />

        <div className="relative z-10 p-4 sm:p-5 flex flex-col gap-3" style={{ minHeight: CARD_H }}>

          {/* Row 1: bank logo + name + controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/12 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <BankLogo bankCode={account.bankCode} bankName={account.bankName} />
              </div>
              <span className="text-[12.5px] font-bold text-white/85 tracking-wide truncate max-w-[140px]">{account.bankName}</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <PrimaryStarBadge isPrimary={isPrimary} />
              <CardMenu onEdit={onEdit} onRemove={onRemove} canRemove={canRemove} isPrimary={isPrimary} onSetPrimary={onSetPrimary} />
            </div>
          </div>

          {/* Account number — large mono, centre of card */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[8.5px] font-bold text-white/28 uppercase tracking-[0.2em] mb-1.5">Account Number</p>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-mono font-bold text-white tracking-[0.12em] leading-none">
                {fmtAcct(account.accountNumber ?? "")}
              </span>
              <motion.button onClick={copyAcct} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                className="text-white/22 hover:text-[#ffd716] transition-colors flex-shrink-0">
                <Copy size={11} />
              </motion.button>
            </div>
          </div>

          {/* Row 3: name + settlement badge */}
          <div className="flex items-end justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold text-white/22 uppercase tracking-[0.18em] mb-0.5">Account Name</p>
              <p className="text-[11.5px] font-bold text-white leading-tight truncate max-w-[140px]">{account.accountName}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <p className="text-[7.5px] font-bold text-white/22 uppercase tracking-[0.18em]">Type</p>
              <span className="text-[9.5px] font-bold text-[#ffd716] px-2 py-[2px] rounded-full"
                style={{ background: "rgba(255,215,22,0.12)", border: "1px solid rgba(255,215,22,0.22)" }}>
                Settlement
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Stacked card deck ───────────────────────────────────────────────────── */
function BankCardStack({
  accounts, deletingId, onEdit, onRemove, onReorder, primaryAccountId, onSetPrimaryRequest,
}: {
  accounts: PaymentAccount[]; deletingId: string | null;
  onEdit: (a: PaymentAccount) => void; onRemove: (id: string) => void;
  onReorder?: (newOrder: PaymentAccount[]) => void;
  primaryAccountId: string | null;
  onSetPrimaryRequest: (account: PaymentAccount) => void;
}) {
  const [spread, setSpread] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const total = localAccounts.length;

  // Sync when parent adds or removes accounts
  useEffect(() => { setLocalAccounts(accounts); }, [accounts]);

  const draggingIndex = draggingId ? localAccounts.findIndex((a) => a.id === draggingId) : -1;

  function handleDragMove(offsetY: number) {
    if (!spread || draggingIndex < 0) return;
    const absY = draggingIndex * SPREAD_Y + offsetY;
    const slot = Math.max(0, Math.min(total - 1, Math.round(absY / SPREAD_Y)));
    setPendingSlot(slot !== draggingIndex ? slot : null);
  }

  function handleDragCommit(id: string, offsetY: number) {
    if (spread && draggingIndex >= 0) {
      const absY = draggingIndex * SPREAD_Y + offsetY;
      const targetSlot = Math.max(0, Math.min(total - 1, Math.round(absY / SPREAD_Y)));
      if (targetSlot !== draggingIndex) {
        const newOrder = [...localAccounts];
        const [moved] = newOrder.splice(draggingIndex, 1);
        newOrder.splice(targetSlot, 0, moved);
        setLocalAccounts(newOrder);
        onReorder?.(newOrder);
        toast.success("Account order updated");
      }
    }
    setPendingSlot(null);
  }

  const stackH = CARD_H + (total - 1) * STACK_Y;
  const spreadH = CARD_H + (total - 1) * SPREAD_Y;
  const walletTop = Math.round(CARD_H * 0.44);

  if (total === 0) return null;

  return (
    <div
      onMouseEnter={() => setSpread(true)}
      onMouseLeave={() => { if (!draggingId) setSpread(false); }}
      onClick={() => { if (!draggingId) setSpread((s) => !s); }}
      className="relative cursor-pointer"
    >
      {/* Wallet body — sits behind cards, visible below them */}
      <motion.div
        className="absolute left-0 right-0 rounded-[20px] overflow-hidden pointer-events-none bg-[#e0e0e0] dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#0e0e0e]"
        animate={{
          top: spread ? spreadH : walletTop,
          height: spread ? 0 : stackH + WALLET_FOOT - walletTop,
          opacity: spread ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        style={{ zIndex: 0 }}
      >
        <div className="absolute inset-0 dark:block hidden" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.025) 1px,transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="absolute top-0 inset-x-4 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="absolute top-px inset-x-0 h-4 bg-gradient-to-b from-black/5 dark:from-black/20 to-transparent" />
      </motion.div>

      {/* Card stack — on top of wallet body */}
      <motion.div
        className="relative overflow-visible"
        animate={{ height: spread ? spreadH + 12 : stackH + WALLET_FOOT }}
        transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.9 }}
        style={{ zIndex: 1 }}
      >
        {localAccounts.map((account, i) => (
          <BankCardItem
            key={account.id}
            account={account}
            index={i}
            total={total}
            spread={spread}
            isDragging={draggingId === account.id}
            isDropTarget={pendingSlot === i && draggingId !== account.id}
            onDragStart={() => setDraggingId(account.id)}
            onDragEnd={() => { setDraggingId(null); if (!spread) setSpread(false); }}
            onDragMove={handleDragMove}
            onDragCommit={(offsetY) => handleDragCommit(account.id, offsetY)}
            onEdit={() => onEdit(account)}
            onRemove={() => onRemove(account.id)}
            canRemove={total > 1}
            deleting={deletingId === account.id}
            isPrimary={account.id === primaryAccountId}
            onSetPrimary={() => onSetPrimaryRequest(account)}
          />
        ))}
      </motion.div>

      {/* Spread hint */}
      <AnimatePresence>
        {!spread && total > 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[10px] text-[#b0b0b0] dark:text-white/25 mt-1 select-none pointer-events-none"
          >
            <GripHorizontal size={11} className="inline mr-1 -mt-px" />
            Hover to fan · drag to inspect
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Status badge ─────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:      { label: "Paid",      color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/15" },
    available: { label: "Available", color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/15" },
    held:      { label: "Held",      color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/15" },
    pending:   { label: "Pending",   color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/15" },
    failed:    { label: "Failed",    color: "text-[#e5484d]", bg: "bg-[#fee2e2] dark:bg-[#e5484d]/15" },
  };
  const cfg = map[status] ?? { label: status, color: "text-[#9a9a9a]", bg: "bg-[#f0f0f0] dark:bg-white/10" };
  return <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize", cfg.color, cfg.bg)}>{cfg.label}</span>;
}

/* ─── Entry type icon ────────────────────────────────────────────────────── */
function EntryIcon({ type }: { type: string }) {
  const map: Record<string, { icon: typeof Wallet; color: string; bg: string }> = {
    payment: { icon: Coins, color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/20" },
    sale:    { icon: Coins, color: "text-[#16a34a]", bg: "bg-[#dcfce7] dark:bg-[#16a34a]/20" },
    payout:  { icon: ArrowDownToLine, color: "text-[#0ea5e9]", bg: "bg-[#e0f2fe] dark:bg-[#0ea5e9]/20" },
    escrow:  { icon: Clock, color: "text-[#f59e0b]", bg: "bg-[#fef3c7] dark:bg-[#f59e0b]/20" },
    commission: { icon: Coins, color: "text-[#a855f7]", bg: "bg-[#f3e8ff] dark:bg-[#a855f7]/20" },
    refund:  { icon: RefreshCw, color: "text-[#e5484d]", bg: "bg-[#fee2e2] dark:bg-red-500/20" },
  };
  const cfg = map[type] ?? { icon: Wallet, color: "text-[#9a9a9a]", bg: "bg-[#f0f0f0] dark:bg-white/10" };
  const Icon = cfg.icon;
  return <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", cfg.bg)}><Icon size={15} className={cfg.color} /></div>;
}

/* ─── Payout detail slide-over ───────────────────────────────────────────── */
function PayoutDetail({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [showPrinter, setShowPrinter] = useState(true);

  const TYPE_CFG: Record<string, { icon: typeof Wallet; label: string; hexColor: string }> = {
    payment:    { icon: Coins,           label: "Payment Received",   hexColor: "#ffd716" },
    sale:       { icon: Coins,           label: "Sale Credit",        hexColor: "#ffd716" },
    payout:     { icon: ArrowDownToLine, label: "Bank Withdrawal",    hexColor: "#0ea5e9" },
    escrow:     { icon: Clock,           label: "Held in Escrow",     hexColor: "#f59e0b" },
    commission: { icon: Coins,           label: "Commission",         hexColor: "#a855f7" },
    refund:     { icon: RefreshCw,       label: "Refund",             hexColor: "#e5484d" },
  };
  const cfg = TYPE_CFG[entry.type] ?? { icon: Wallet, label: entry.type, hexColor: "#ffd716" };
  const Icon = cfg.icon;
  const isDebit = entry.amount < 0;
  const receiptNum = `RCP-${entry.id.slice(0, 8).toUpperCase()}`;
  const amtDisplay = `${isDebit ? "−" : "+"}${naira(Math.abs(entry.amount))}`;
  const receiptUrl = `${CLIENT_SITE_ORIGIN}/receipts/${entry.id}`;

  async function downloadReceipt() {
    const qrSvg = await generateQRSVG(receiptUrl, 200);
    const amtColor = isDebit ? "#e5484d" : "#1e1e1e";
    const statusColor = entry.status === "paid" ? "#16a34a" : entry.status === "pending" ? "#f59e0b" : "#9a9a9a";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nomarc Receipt ${receiptNum}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f0f0;display:flex;justify-content:center;padding:36px 16px;min-height:100vh}
.wrap{position:relative;width:100%;max-width:420px}
.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;overflow:hidden;border-radius:20px}
.wm img{width:62%;opacity:.045;transform:rotate(-25deg)}
.card{position:relative;z-index:1;background:#fff;border-radius:20px;overflow:visible;box-shadow:0 12px 48px rgba(0,0,0,.13)}
/* header */
.hdr{background:#1e1e1e;padding:28px 28px 32px;position:relative;overflow:hidden;border-radius:20px 20px 0 0}
.hdr::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.055) 1px,transparent 0);background-size:24px 24px}
.hdr-blob{position:absolute;right:-32px;top:-32px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.04)}
.hdr-inner{position:relative;z-index:1}
.pill{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.11);border-radius:100px;padding:6px 14px;font-size:11.5px;font-weight:600;color:#fff;margin-bottom:16px}
.pill-dot{width:8px;height:8px;border-radius:50%;background:${cfg.hexColor};flex-shrink:0}
.amt{font-size:40px;font-weight:900;color:${amtColor};letter-spacing:-1.5px;line-height:1}
.hdr-meta{display:flex;align-items:center;gap:10px;margin-top:10px}
.hdr-date{font-size:12px;color:rgba(255,255,255,.45)}
.status-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;background:rgba(255,255,255,.12);color:#fff;text-transform:capitalize}
/* tear */
.tear{height:18px;background:#f0f0f0;position:relative}
.tear::before,.tear::after{content:'';position:absolute}
.tear-inner{position:absolute;inset:0;background:#fff;clip-path:polygon(0 0,2.5% 100%,5% 0,7.5% 100%,10% 0,12.5% 100%,15% 0,17.5% 100%,20% 0,22.5% 100%,25% 0,27.5% 100%,30% 0,32.5% 100%,35% 0,37.5% 100%,40% 0,42.5% 100%,45% 0,47.5% 100%,50% 0,52.5% 100%,55% 0,57.5% 100%,60% 0,62.5% 100%,65% 0,67.5% 100%,70% 0,72.5% 100%,75% 0,77.5% 100%,80% 0,82.5% 100%,85% 0,87.5% 100%,90% 0,92.5% 100%,95% 0,97.5% 100%,100% 0)}
.notch-l,.notch-r{position:absolute;top:-12px;width:24px;height:24px;border-radius:50%;background:#f0f0f0;z-index:2}
.notch-l{left:-12px}.notch-r{right:-12px}
/* body */
.body{padding:22px 28px 24px;background:#fff}
.rcpt-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
.rcpt-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#b0b0b0;margin-bottom:4px}
.rcpt-num{font-size:17px;font-weight:900;color:#1e1e1e;letter-spacing:.04em}
.mark{width:38px;height:38px;border-radius:12px;background:#fff7cc;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#b89500}
/* items table */
.items-hdr{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:0 0 8px;border-bottom:1px solid #f0f0f0;font-size:10.5px;font-weight:700;color:#b0b0b0;text-transform:uppercase;letter-spacing:.07em}
.items-row{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:12px 0;border-bottom:1px solid #f8f8f8;align-items:start}
.item-num{font-size:13px;color:#c0c0c0;padding-top:1px}
.item-name{font-size:13px;color:#1e1e1e;font-weight:500}
.item-sub{font-size:11px;color:#a0a0a0;margin-top:3px}
.item-price{font-size:13px;font-weight:700;color:${amtColor};text-align:right}
/* total box */
.total-box{background:#f8f8f8;border-radius:14px;padding:16px 18px;margin-top:16px}
.total-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #eeeeee}
.total-label{font-size:14px;font-weight:700;color:#1e1e1e}
.total-value{font-size:20px;font-weight:900;color:${amtColor}}
.sub-row{display:flex;justify-content:space-between;align-items:center}
.sub-row+.sub-row{margin-top:7px}
.sub-label{font-size:12px;color:#9a9a9a}
.sub-value{font-size:12px;color:#9a9a9a;text-align:right;text-transform:capitalize;font-weight:500}
.sub-value.status{color:${statusColor};font-weight:700}
/* Nomarc chip */
.chip{display:flex;align-items:center;gap:12px;background:#f5f5f5;border-radius:14px;padding:13px 16px;margin-top:14px}
.chip-icon{width:40px;height:40px;border-radius:12px;background:#ffd716;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#1e1e1e;flex-shrink:0}
.chip-t{font-size:13px;font-weight:700;color:#1e1e1e}
.chip-s{font-size:11px;color:#9a9a9a;margin-top:2px}
/* separator */
.sep{position:relative;margin:20px -28px 0;height:18px;background:#f0f0f0}
.sep-inner{position:absolute;inset:0;background:#fff;clip-path:polygon(0 0,2.5% 100%,5% 0,7.5% 100%,10% 0,12.5% 100%,15% 0,17.5% 100%,20% 0,22.5% 100%,25% 0,27.5% 100%,30% 0,32.5% 100%,35% 0,37.5% 100%,40% 0,42.5% 100%,45% 0,47.5% 100%,50% 0,52.5% 100%,55% 0,57.5% 100%,60% 0,62.5% 100%,65% 0,67.5% 100%,70% 0,72.5% 100%,75% 0,77.5% 100%,80% 0,82.5% 100%,85% 0,87.5% 100%,90% 0,92.5% 100%,95% 0,97.5% 100%,100% 0)}
.sep-notch-l,.sep-notch-r{position:absolute;top:-12px;width:24px;height:24px;border-radius:50%;background:#f0f0f0;z-index:2}
.sep-notch-l{left:-12px}.sep-notch-r{right:-12px}
/* QR area */
.qr-area{padding:22px 0 8px;display:flex;flex-direction:column;align-items:center;gap:6px}
.qr-area svg{max-width:200px;height:auto}
.qr-label{font-size:10.5px;color:#c0c0c0;text-align:center}
/* footer */
.footer{padding:14px 0 6px;text-align:center}
.footer-domain{font-size:11px;color:#c8c8c8}
.footer-legal{font-size:9.5px;color:#d8d8d8;margin-top:5px;max-width:300px;margin-left:auto;margin-right:auto}
@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}.wrap{max-width:100%}}
</style></head><body>
<div class="wrap">
  <div class="wm"><img src="${PRODUCTION_ORIGIN}/logos/wordmark-on-light.png" alt="Nomarc Projects"></div>
  <div class="card">
    <div class="hdr">
      <div class="hdr-blob"></div>
      <div class="hdr-inner">
        <div class="pill"><span class="pill-dot"></span>${cfg.label}</div>
        <p class="amt">${amtDisplay}</p>
        <div class="hdr-meta"><span class="hdr-date">${entry.date}</span><span class="status-badge">${entry.status}</span></div>
      </div>
    </div>
    <div class="tear"><div class="notch-l"></div><div class="notch-r"></div><div class="tear-inner"></div></div>
    <div class="body">
      <div class="rcpt-row">
        <div><p class="rcpt-label">Receipt No.</p><p class="rcpt-num">${receiptNum}</p></div>
        <div class="mark">N</div>
      </div>
      <div class="items-hdr"><span>№</span><span>Item</span><span>Price</span></div>
      <div class="items-row">
        <span class="item-num">1</span>
        <div>
          <p class="item-name">${cfg.label}</p>
          <p class="item-sub">Ref: #${entry.id.slice(0, 16).toUpperCase()}</p>
          ${entry.note ? `<p class="item-sub">${entry.note}</p>` : ""}
        </div>
        <span class="item-price">${amtDisplay}</span>
      </div>
      <div class="total-box">
        <div class="total-main"><span class="total-label">Total</span><span class="total-value">${amtDisplay}</span></div>
        <div class="sub-row"><span class="sub-label">Status</span><span class="sub-value status">${entry.status}</span></div>
        <div class="sub-row"><span class="sub-label">Fee</span><span class="sub-value">₦0.00</span></div>
      </div>
      <div class="chip"><div class="chip-icon">N</div><div><p class="chip-t">Nomarc Wallet</p><p class="chip-s">Transaction via Nomarc Projects</p></div></div>
      <div class="sep"><div class="sep-notch-l"></div><div class="sep-notch-r"></div><div class="sep-inner"></div></div>
      <div class="qr-area">${qrSvg}<p class="qr-label">Scan to verify this receipt</p></div>
      <div class="footer">
        <p class="footer-domain">nomarcprojects.com · © 2026</p>
        <p class="footer-legal">This receipt confirms that the transaction was completed. If you didn't authorize this, contact support@nomarcprojects.com immediately.</p>
      </div>
    </div>
  </div>
</div>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 700);
  }

  return (
    <>
      {/* 3D printer animation intro */}
      {showPrinter && (
        <ReceiptPrinterIntro
          variant="receipt"
          amountStr={amtDisplay}
          label={cfg.label}
          typeColor={cfg.hexColor}
          onDismiss={() => setShowPrinter(false)}
        />
      )}

      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="relative z-10 w-full max-w-[400px] h-full overflow-y-auto bg-[#f5f5f5] dark:bg-[#111] shadow-2xl flex flex-col"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40">Transaction Receipt</p>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                <X size={17} />
              </button>
            </div>

            {/* Receipt card */}
            <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-lg border border-black/[0.04] dark:border-white/[0.06]">
              {/* Branded header */}
              <div className="bg-[#1e1e1e] dark:bg-[#ffd716] px-6 pt-7 pb-10 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)", backgroundSize: "22px 22px" }} />
                <div className="pointer-events-none absolute -right-6 -top-6 w-40 h-40 rounded-full bg-white/[0.04] dark:bg-black/[0.07]" />
                <div className="pointer-events-none absolute left-8 -bottom-8 w-28 h-28 rounded-full bg-white/[0.03] dark:bg-black/[0.05]" />
                <div className="relative z-10">
                  {/* Type pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 dark:bg-black/15 mb-4">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.hexColor }} />
                    <Icon size={12} style={{ color: cfg.hexColor }} />
                    <span className="text-[11.5px] font-semibold text-white dark:text-[#1e1e1e]">{cfg.label}</span>
                  </div>
                  {/* Amount */}
                  <p className={cn("text-[42px] font-black leading-none tracking-tight", isDebit ? "text-[#ff6b6b]" : "text-[#ffd716] dark:text-[#1e1e1e]")}>
                    {amtDisplay}
                  </p>
                  <div className="flex items-center gap-2.5 mt-3">
                    <p className="text-[12.5px] text-white/50 dark:text-[#1e1e1e]/60">{entry.date}</p>
                    <StatusBadge status={entry.status} />
                  </div>
                </div>
              </div>

              {/* Zigzag tear with side notches */}
              <div className="h-4 bg-[#f5f5f5] dark:bg-[#111] relative">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f5f5f5] dark:bg-[#111]" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f5f5f5] dark:bg-[#111]" />
                <div className="absolute inset-0 bg-white dark:bg-[#1a1a1a]" style={{ clipPath: "polygon(0 0,2.5% 100%,5% 0,7.5% 100%,10% 0,12.5% 100%,15% 0,17.5% 100%,20% 0,22.5% 100%,25% 0,27.5% 100%,30% 0,32.5% 100%,35% 0,37.5% 100%,40% 0,42.5% 100%,45% 0,47.5% 100%,50% 0,52.5% 100%,55% 0,57.5% 100%,60% 0,62.5% 100%,65% 0,67.5% 100%,70% 0,72.5% 100%,75% 0,77.5% 100%,80% 0,82.5% 100%,85% 0,87.5% 100%,90% 0,92.5% 100%,95% 0,97.5% 100%,100% 0)" }} />
              </div>

              {/* Receipt body */}
              <div className="px-6 pt-5 pb-6 bg-white dark:bg-[#1a1a1a] relative">
                {/* Faint watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <span className="text-[80px] font-black text-[#f5f5f5] dark:text-white/[0.03] -rotate-12 select-none">N</span>
                </div>

                {/* Receipt number + Nomarc mark */}
                <div className="relative flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b0b0] dark:text-white/30 mb-1">Receipt No.</p>
                    <p className="text-[17px] font-black text-[#1e1e1e] dark:text-white tracking-wide">{receiptNum}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#ffd716] flex items-center justify-center shadow-sm">
                    <span className="text-[16px] font-black text-[#1e1e1e]">N</span>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-[#ececec] dark:border-white/10 mb-4" />
                <dl className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[12px] text-[#9a9a9a] dark:text-white/50">Transaction ID</dt>
                    <button
                      onClick={() => { navigator.clipboard.writeText(entry.id).then(() => toast.success("ID copied")); }}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1e1e1e] dark:text-white hover:text-[#b89500] dark:hover:text-[#ffd716] transition-colors group"
                    >
                      #{entry.id.slice(0, 12).toUpperCase()}
                      <Copy size={11} className="text-[#ccc] group-hover:text-[#b89500] dark:group-hover:text-[#ffd716] transition-colors" />
                    </button>
                  </div>
                  {([["Type", cfg.label], ["Date", entry.date], ["Status", entry.status], ...(entry.note ? [["Note", entry.note]] : [])] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <dt className="text-[12px] text-[#9a9a9a] dark:text-white/50 flex-shrink-0">{label}</dt>
                      <dd className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white text-right capitalize">{value}</dd>
                    </div>
                  ))}
                </dl>
                {/* Nomarc Wallet chip */}
                <div className="mt-5 pt-4 border-t-2 border-dashed border-[#ececec] dark:border-white/10">
                  <div className="flex items-center gap-3 rounded-xl bg-[#fafafa] dark:bg-white/[0.04] border border-[#f0f0f0] dark:border-white/[0.06] px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-black text-[#1e1e1e]">N</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">Nomarc Wallet</p>
                      <p className="text-[11px] text-[#9a9a9a] dark:text-white/40">Transaction via Nomarc Projects</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-[#f5f5f5] dark:border-white/[0.06] flex items-center justify-between">
                  <p className="text-[10px] text-[#c8c8c8] dark:text-white/25">Nomarc Projects</p>
                  <p className="text-[10px] text-[#c8c8c8] dark:text-white/25">© 2026 · nomarcprojects.com</p>
                </div>
              </div>
            </div>

            {/* Download */}
            <div className="px-4 py-5 mt-auto">
              <motion.button
                onClick={downloadReceipt}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#ffd716] text-[#1e1e1e] text-[13.5px] font-bold shadow-md hover:bg-[#e6c114] transition-colors"
              >
                <Download size={15} /> Download Receipt
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
}

/* ─── Add/update bank modal ─────────────────────────────────────────────── */
function BankModal({
  editing, existingCount, onClose, onSaved,
}: {
  editing: PaymentAccount | null;
  existingCount: number;
  onClose: () => void;
  onSaved: (saved: PaymentAccount) => void;
}) {
  const userName = useAuth((s) => s.user?.name);
  const [accountNumber, setAccountNumber] = useState(editing?.accountNumber ?? "");
  const [bankCode, setBankCode] = useState(editing?.bankCode ?? "");
  const [bankName, setBankName] = useState(editing?.bankName ?? "");
  const [accountName, setAccountName] = useState(editing?.accountName ?? "");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Local list rather than a /api/paystack/banks fetch: that route and the
  // account-name resolver beside it were removed with on-platform payouts, and
  // now live in the standalone paystack-bank-verify repo. No request, so no
  // loading state and no empty dropdown when the network is slow.
  const banks = NIGERIAN_BANKS;
  const [showNameWarning, setShowNameWarning] = useState(false);
  const prevAcctRef = useRef(editing?.accountNumber ?? "");

  const nubanMatches = accountNumber.length === 10 && banks.length > 0
    ? guessBanks(accountNumber, banks).slice(0, 4) : [];

  /**
   * Account names are typed by the account holder now. The endpoint that looked
   * them up from Paystack was removed: it returned the real name behind ANY
   * account number with no authentication, which made it an enumeration oracle
   * rather than a convenience. Kept in the paystack-bank-verify repo, and it
   * needs a session check and rate limiting before it comes back.
   */
  function clearResolvedName() {
    setResolving(false);
    setResolveError(false);
  }

  function handleAcctChange(raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 10);
    const prev = prevAcctRef.current;
    // Changing the number invalidates a name typed against the old one.
    if (cleaned !== prev && accountName) { setAccountName(""); clearResolvedName(); }
    setAccountNumber(cleaned);
    prevAcctRef.current = cleaned;
  }

  async function pickBank(code: string) {
    const b = banks.find((bk) => bk.code === code);
    if (!b) return;
    setBankCode(code);
    setBankName(b.name);
    setAccountName("");
    clearResolvedName();
  }

  function doSave() {
    setBusy(true);
    saveVendorPaymentAccount({ bankCode, bankName, accountNumber, accountName })
      .then((saved) => { toast.success("Settlement account saved"); onSaved(saved); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't save"))
      .finally(() => setBusy(false));
  }

  function save() {
    if (!bankCode || !accountNumber || !accountName) { toast.error("Complete all bank details"); return; }
    if (accountNumber.length !== 10) { toast.error("Account number must be 10 digits"); return; }
    if (!editing && existingCount >= 3) { toast.error("Maximum 3 settlement accounts"); return; }
    if (userName && !showNameWarning) {
      const parts = userName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
      const acctLower = accountName.toLowerCase();
      const hasOverlap = parts.some((p) => acctLower.includes(p));
      if (!hasOverlap) { setShowNameWarning(true); return; }
    }
    doSave();
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative z-10 w-full sm:max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 p-5 sm:p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={17} /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#ffd716]/15 flex items-center justify-center"><Building2 size={18} className="text-[#caa400]" /></div>
          <div>
            <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{editing ? "Update account" : "Add settlement account"}</h3>
            <p className="text-[12px] text-[#9a9a9a]">Your earnings will be paid to this bank</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 1. Account number */}
          <Field label="Account number">
            <input
              className={inputClass}
              value={accountNumber}
              onChange={(e) => handleAcctChange(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 10-digit account number"
              autoFocus
            />
            {accountNumber.length === 10 && !bankCode && nubanMatches.length === 0 && (
              <p className="text-[11px] text-[#ffd716] mt-1.5 font-medium">Now select your bank below</p>
            )}
            {accountNumber.length > 0 && accountNumber.length < 10 && (
              <p className="text-[11px] text-[#9a9a9a] mt-1.5">{10 - accountNumber.length} digits remaining</p>
            )}
          </Field>

          {/* 2. Bank */}
          <Field label="Bank">
            <AnimatePresence mode="wait">
              {bankCode ? (
                <motion.div key="selected" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#16a34a]/40 bg-[#f0fdf4] dark:bg-[#16a34a]/10 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-[#16a34a] flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate">{bankName}</span>
                  </div>
                  <button onClick={() => { setBankCode(""); setBankName(""); setAccountName(""); setResolveError(false); }}
                    className="text-[12px] font-medium text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white flex-shrink-0">Change</button>
                </motion.div>
              ) : (
                <motion.div key="unselected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnimatePresence>
                    {nubanMatches.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-2">
                        <p className="text-[11px] font-semibold text-[#caa400] dark:text-[#ffd716] mb-1.5">
                          {nubanMatches.length === 1 ? "Bank detected — click to select" : "Select your bank"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {nubanMatches.map((b, i) => (
                            <motion.button key={b.code}
                              initial={{ opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: i * 0.06, type: "spring", stiffness: 500, damping: 28 }}
                              onClick={() => pickBank(b.code)}
                              className="px-3.5 py-1.5 rounded-full border border-[#ffd716]/50 bg-[#ffd716]/10 text-[12.5px] font-bold text-[#1e1e1e] dark:text-white hover:bg-[#ffd716]/25 hover:border-[#ffd716] active:scale-95 transition-all"
                            >{b.name}</motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <SearchableSelect value={bankCode} onChange={pickBank} placeholder="Search all banks…"
                    searchPlaceholder="GTB, Access, Kuda, OPay…"
                    options={banks.map((b) => ({ value: b.code, label: b.name, keywords: getBankKeywords(b.code), imageUrl: getBankLogoUrl(b.code) ?? undefined }))} />
                </motion.div>
              )}
            </AnimatePresence>
          </Field>

          {/* 3. Account name */}
          <AnimatePresence>
            {bankCode && (
              <motion.div key="acct-name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden"
              >
                {/* Typed, not looked up. The auto-verify endpoint was removed
                    because it revealed the holder's name for any account number
                    to anyone; see lib/constants/nigerian-banks.ts. */}
                <Field label="Account name" hint="As it appears on your bank statement">
                  <input
                    className={inputClass}
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Titan SteelCo Limited"
                    autoComplete="off"
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name mismatch warning */}
        <AnimatePresence>
          {showNameWarning && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 overflow-hidden"
            >
              <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-1">Name doesn&apos;t match your profile</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mb-2.5">
                &ldquo;{accountName}&rdquo; differs from your verified name &ldquo;{userName}&rdquo;. This is fine for a settlement bank — just make sure it&apos;s correct.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowNameWarning(false)} className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline">Change details</button>
                <button onClick={() => { setShowNameWarning(false); doSave(); }} className="text-[11px] font-bold text-[#1e1e1e] dark:text-white hover:underline">Continue anyway →</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 rounded-xl bg-[#f7f7f7] dark:bg-white/5 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={14} className="text-[#ffd716] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#9a9a9a] dark:text-white/50">
            A Paystack subaccount will be created so your share is paid automatically when orders are completed. Marketplace commission is 10%.
          </p>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#e3e3e3] dark:border-white/15 py-2.5 text-sm font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={save} disabled={busy || !accountName || !bankCode}
            className="flex-1 rounded-xl bg-[#ffd716] py-2.5 text-sm font-semibold text-[#1e1e1e] hover:bg-[#e6c114] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >{busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save account"}</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main wallet view ───────────────────────────────────────────────────── */
export function WalletView({ wallet, accounts: initialAccounts }: { wallet: WV; accounts: PaymentAccount[] }) {
  const router = useRouter();
  // Local account state — survives client-side navigation without relying on
  // server re-renders. Stays in sync via the server action return value.
  const user = useAuth((s) => s.user);
  const [accounts, setAccounts] = useState<PaymentAccount[]>(initialAccounts);
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(initialAccounts[0]?.id ?? null);
  const [primaryConfirmAccount, setPrimaryConfirmAccount] = useState<PaymentAccount | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [myBanksOpen, setMyBanksOpen] = useState(false);

  // Keep primaryAccountId valid when accounts change
  useEffect(() => {
    if (primaryAccountId && !accounts.find((a) => a.id === primaryAccountId)) {
      setPrimaryAccountId(accounts[0]?.id ?? null);
    }
  }, [accounts, primaryAccountId]);

  const primaryAccount = accounts.find((a) => a.id === primaryAccountId) ?? accounts[0] ?? null;

  const now = new Date();
  const thisMonth = wallet.entries
    .filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.amount > 0; })
    .reduce((s, e) => s + e.amount, 0);
  const totalEarned = wallet.entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);

  const filteredEntries = wallet.entries.filter((e) => {
    if (txFilter !== "all" && e.type !== txFilter) return false;
    if (txSearch && !`${e.type} ${e.note ?? ""} ${e.date}`.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  });

  function openAddBank() { setEditingAccount(null); setBankOpen(true); }
  function openEditBank(a: PaymentAccount) { setEditingAccount(a); setBankOpen(true); }

  function handleAccountSaved(saved: PaymentAccount) {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id || a.accountNumber === saved.accountNumber);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
    setBankOpen(false);
    router.refresh();
  }

  async function handleRemoveAccount(id: string) {
    setDeletingId(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteVendorPaymentAccount(id);
      toast.success("Account removed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove");
      router.refresh();
    }
    finally { setDeletingId(null); }
  }

  function doWithdraw() {
    const amt = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > wallet.available) { toast.error("Amount exceeds available balance"); return; }
    if (!primaryAccount?.accountNumber) { toast.error("Add your bank account first"); return; }
    setBusy(true);
    requestPayout(amt)
      .then(() => { toast.success("Payout requested — usually 1–3 business days"); setPayoutOpen(false); setAmount(""); router.refresh(); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Payout failed"))
      .finally(() => setBusy(false));
  }

  return (
    <div className="p-5 sm:p-7 max-w-[1100px] mx-auto">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="rounded-2xl bg-[#1e1e1e] dark:bg-[#ffd716] pt-7 sm:pt-9 px-5 sm:px-8 pb-24 sm:pb-28 overflow-hidden relative"
      >
        {/* Background overlay image — construction/architecture */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.07] dark:opacity-[0.05] pointer-events-none select-none"
        />
        {/* dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.055) 1px,transparent 0)", backgroundSize: "26px 26px" }}
        />
        {/* decorative glow circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 w-56 h-56 rounded-full bg-white/[0.04] dark:bg-black/[0.07]" />
        <div className="pointer-events-none absolute right-20 -bottom-12 w-36 h-36 rounded-full bg-white/[0.03] dark:bg-black/[0.05]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 dark:text-[#1e1e1e]/50 mb-1">Earnings &amp; Payouts</p>
            <h1 className="text-[22px] sm:text-[28px] font-black text-white dark:text-[#1e1e1e] leading-tight">
              {wallet.available > 0 ? "You have funds ready." : "Your wallet is ready."}
            </h1>
            <p className="text-[13px] text-white/50 dark:text-[#1e1e1e]/60 mt-1.5 max-w-sm">
              {wallet.available > 0
                ? `₦${wallet.available.toLocaleString()} available — withdraw anytime to your bank.`
                : "Complete orders to start earning. Payouts are processed within 1–3 business days."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setPayoutOpen(true)}
              disabled={wallet.available <= 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white text-[13px] font-bold shadow-sm hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] active:scale-[0.97] transition-all disabled:opacity-40"
            >
              <ArrowDownToLine size={14} /> Withdraw
            </button>
            {/* Mobile: My Banks → opens drawer. Desktop: Add Bank → opens form */}
            <button
              onClick={() => setMyBanksOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 dark:bg-black/10 text-white dark:text-[#1e1e1e] hover:bg-white/20 dark:hover:bg-black/20 text-[13px] font-semibold transition-all"
            >
              <Building2 size={14} /> My Banks
              {accounts.length > 0 && (
                <span className="ml-0.5 w-5 h-5 rounded-full bg-[#ffd716] text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">{accounts.length}</span>
              )}
            </button>
            <button
              onClick={() => {
                if (accounts.length >= 3) {
                  toast.error("You've reached the maximum of 3 settlement accounts");
                  return;
                }
                openAddBank();
              }}
              className={cn(
                "hidden lg:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                accounts.length >= 3
                  ? "bg-white/10 dark:bg-black/10 text-white/40 dark:text-[#1e1e1e]/40 cursor-not-allowed"
                  : "bg-white/10 dark:bg-black/10 text-white dark:text-[#1e1e1e] hover:bg-white/20 dark:hover:bg-black/20"
              )}
            >
              <Building2 size={14} /> Add Bank
            </button>
          </div>
        </div>
      </motion.div>

      {/* stat cards — ~80% width, centered, overlapping banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10 -mt-20 sm:-mt-[88px] px-[5%]">
        <StatCard label="Available Balance" value={wallet.available} sub={wallet.available > 0 ? "Ready to withdraw" : "No pending balance"} icon={Wallet} accent="text-[#16a34a] dark:text-[#4ade80]" cta="Withdraw" onCta={() => setPayoutOpen(true)} ctaDisabled={wallet.available <= 0} />
        <StatCard label="In Escrow" value={wallet.held} sub="Held until delivery confirmed" icon={Clock} />
        <StatCard label="This Month" value={thisMonth} sub={new Date().toLocaleString("default", { month: "long", year: "numeric" })} icon={TrendingUp} />
        <StatCard label="Total Earned" value={totalEarned} sub="Lifetime earnings" icon={Coins} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Payment history table */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            {/* Header: title + search + export */}
            <div className="px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <h2 className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Payment history</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const rows = filteredEntries.map((e) => `${e.type},${e.note ?? ""},${e.amount},${e.status},${e.date}`);
                    const csv = `Type,Note,Amount,Status,Date\n${rows.join("\n")}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "payment-history.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[11.5px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] hover:bg-[#ffd716]/5 transition-colors">
                    <Download size={12} /> Export
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search transactions…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e8e8e8] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[12.5px] text-[#1e1e1e] dark:text-white placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#ffd716] transition-colors" />
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "All" },
                  { key: "sale", label: "Sale" },
                  { key: "commission", label: "Commission" },
                  { key: "payout", label: "Payout" },
                  { key: "refund", label: "Refund" },
                ].map(({ key, label }) => {
                  const count = key === "all" ? wallet.entries.length : wallet.entries.filter((e) => e.type === key).length;
                  if (key !== "all" && count === 0) return null;
                  const total = (key === "all" ? wallet.entries : wallet.entries.filter((e) => e.type === key))
                    .reduce((s, e) => s + Math.abs(e.amount), 0);
                  return (
                    <button key={key} onClick={() => setTxFilter(key)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all",
                        txFilter === key
                          ? "bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e]"
                          : "border border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716]"
                      )}>
                      {label} ({naira(total)})
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#ffd716]/10 flex items-center justify-center mb-3">
                  <Coins size={24} className="text-[#caa400]" />
                </div>
                <p className="font-semibold text-[#1e1e1e] dark:text-white text-sm">
                  {wallet.entries.length === 0 ? "No transactions yet" : "No matching transactions"}
                </p>
                <p className="text-[13px] text-[#9a9a9a] mt-1">
                  {wallet.entries.length === 0 ? "Your earnings from completed orders will appear here." : "Try adjusting your search or filter."}
                </p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_70px] gap-2 px-5 py-2.5 bg-[#fafafa] dark:bg-white/[0.02] border-b border-[#f0f0f0] dark:border-white/[0.06]">
                  {["Transaction", "Amount", "Date", "Status"].map((h) => (
                    <span key={h} className="text-[10.5px] font-bold uppercase tracking-widest text-[#b0b0b0] dark:text-white/30">{h}</span>
                  ))}
                </div>

                {/* Table rows */}
                <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                  {filteredEntries.map((e) => (
                    <motion.button key={e.id} onClick={() => setSelected(e)}
                      whileHover={{ backgroundColor: "rgba(255,215,22,0.04)" }}
                      className="w-full sm:grid sm:grid-cols-[1fr_100px_100px_70px] gap-2 flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <EntryIcon type={e.type} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white capitalize truncate">
                            {e.type}
                            {e.note && <span className="text-[#9a9a9a] font-normal"> · {e.note}</span>}
                          </p>
                          <p className="text-[11px] text-[#9a9a9a] mt-0.5 sm:hidden">{e.date}</p>
                        </div>
                      </div>
                      <span className={cn("text-[13px] font-bold tabular-nums", e.amount < 0 ? "text-[#e5484d]" : "text-[#16a34a]")}>
                        {e.amount < 0 ? "−" : "+"}{naira(Math.abs(e.amount))}
                      </span>
                      <span className="hidden sm:block text-[12px] text-[#9a9a9a] tabular-nums">{e.date}</span>
                      <div className="hidden sm:block"><StatusBadge status={e.status} /></div>
                    </motion.button>
                  ))}
                </div>

                <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-[#9a9a9a]">Showing {filteredEntries.length} of {wallet.entries.length}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: accounts + quick actions — hidden on mobile (use My Banks drawer instead) */}
        <div className="hidden lg:block space-y-4">
          {/* My Accounts */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-[#f5f5f5] dark:bg-[#111] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">My Accounts</h3>
              <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full",
                accounts.length >= 3
                  ? "bg-red-500/20 text-red-400"
                  : "bg-[#e3e3e3] dark:bg-white/10 text-[#6b6b6b] dark:text-white/50"
              )}>{accounts.length}/3</span>
            </div>

            {accounts.length === 0 ? (
              <motion.div onClick={openAddBank} whileHover={{ scale: 1.01 }}
                className="rounded-2xl border-2 border-dashed border-[#d8d8d8] dark:border-white/10 p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer group min-h-[140px] transition-colors hover:border-[#ffd716]/40"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#e8e8e8] dark:bg-white/5 flex items-center justify-center group-hover:bg-[#ffd716]/10 transition-colors">
                  <Building2 size={20} className="text-[#9a9a9a] dark:text-white/30 group-hover:text-[#b89500] transition-colors" />
                </div>
                <p className="text-[13.5px] font-bold text-[#1e1e1e]/80 dark:text-white/80">Add settlement bank</p>
                <p className="text-[12px] text-[#9a9a9a] dark:text-white/40">Required to receive payouts</p>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#caa400] dark:text-[#ffd716]">Add bank <ChevronRight size={13} /></span>
              </motion.div>
            ) : (
              <BankCardStack
                accounts={accounts}
                deletingId={deletingId}
                onEdit={openEditBank}
                onRemove={handleRemoveAccount}
                onReorder={(newOrder) => setAccounts(newOrder)}
                primaryAccountId={primaryAccountId}
                onSetPrimaryRequest={(acct) => setPrimaryConfirmAccount(acct)}
              />
            )}

            {accounts.length > 0 && accounts.length < 3 && (
              <motion.button
                onClick={openAddBank}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#d8d8d8] dark:border-white/15 text-[12px] font-semibold text-[#9a9a9a] dark:text-white/35 hover:border-[#ffd716]/50 hover:text-[#caa400] dark:hover:text-[#ffd716] transition-colors"
              >
                <span className="text-[16px] leading-none">+</span> Add another account
              </motion.button>
            )}
            {accounts.length >= 3 && (
              <p className="text-[10.5px] text-red-400/70 text-center mt-3">Maximum 3 settlement accounts reached</p>
            )}

            {accounts.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <GripHorizontal size={11} className="text-[#c0c0c0] dark:text-white/20" />
                <span className="text-[10px] text-[#c0c0c0] dark:text-white/20 font-medium">Hover to fan · drag to inspect</span>
              </div>
            )}

            {primaryAccount?.dvaAccountNumber && (
              <div className="mt-3 rounded-xl bg-white/5 px-4 py-3">
                <p className="text-[11.5px] font-semibold text-white mb-1">Virtual account (DVA)</p>
                <p className="text-[11px] text-white/50 font-mono">{primaryAccount.dvaAccountNumber} · {primaryAccount.dvaBank}</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-3">Quick actions</p>
            <div className="space-y-2">
              <button onClick={() => setPayoutOpen(true)} disabled={wallet.available <= 0}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#ffd716] hover:bg-[#e6c114] transition-colors disabled:opacity-50 text-left"
              >
                <ArrowDownToLine size={15} className="text-[#1e1e1e]" />
                <span className="text-[13px] font-semibold text-[#1e1e1e]">Withdraw funds</span>
              </button>
              <button onClick={openAddBank} disabled={accounts.length >= 3}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] hover:bg-[#ffd716]/5 transition-colors disabled:opacity-40"
              >
                <Building2 size={15} className="text-[#9a9a9a]" />
                <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Add bank account</span>
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-2.5">How it works</p>
            <ul className="space-y-2.5">
              {["Buyers pay into Nomarc escrow", "Funds release on delivery confirmation", "Request a withdrawal anytime", "Settled to your bank in 1–3 days"].map((s) => (
                <li key={s} className="flex items-start gap-2 text-[12px] text-[#6b6b6b] dark:text-white/60">
                  <CheckCircle2 size={13} className="text-[#ffd716] flex-shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {payoutOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPayoutOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="relative z-10 w-full max-w-[400px] rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 p-6 shadow-2xl"
            >
              <button onClick={() => setPayoutOpen(false)} className="absolute top-4 right-4 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><X size={17} /></button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#ffd716]/15 flex items-center justify-center"><ArrowDownToLine size={18} className="text-[#caa400]" /></div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Withdraw funds</h3>
                  <p className="text-[12px] text-[#9a9a9a]">Available: {naira(wallet.available)}</p>
                </div>
              </div>
              <Field label="Amount (₦)">
                <input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" pattern="[0-9]*" placeholder="0" />
              </Field>
              {primaryAccount?.bankName && (
                <div className="mt-3 rounded-xl bg-[#f7f7f7] dark:bg-white/5 px-4 py-3">
                  <p className="text-[12px] text-[#9a9a9a]">To: <span className="font-semibold text-[#1e1e1e] dark:text-white">{primaryAccount.bankName} · {primaryAccount.accountNumber}</span></p>
                  <p className="text-[11.5px] text-[#9a9a9a] mt-0.5">{primaryAccount.accountName}</p>
                </div>
              )}
              <div className="mt-5 flex gap-3">
                <button onClick={() => setPayoutOpen(false)} className="flex-1 rounded-xl border border-[#e3e3e3] dark:border-white/15 py-2.5 text-sm font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={doWithdraw} disabled={busy || !amount} className="flex-1 rounded-xl bg-[#ffd716] py-2.5 text-sm font-semibold text-[#1e1e1e] hover:bg-[#e6c114] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {busy ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : "Withdraw"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bank modal */}
      <AnimatePresence>
        {bankOpen && (
          <BankModal
            editing={editingAccount}
            existingCount={accounts.length}
            onClose={() => setBankOpen(false)}
            onSaved={handleAccountSaved}
          />
        )}
      </AnimatePresence>

      {/* Set-as-primary verification modal */}
      <AnimatePresence>
        {primaryConfirmAccount && (
          <PrimaryVerifyModal
            account={primaryConfirmAccount}
            userEmail={user?.email ?? "you@example.com"}
            onConfirm={() => {
              setPrimaryAccountId(primaryConfirmAccount.id);
              toast.success(`${primaryConfirmAccount.bankName} is now your primary payout account`);
            }}
            onClose={() => setPrimaryConfirmAccount(null)}
          />
        )}
      </AnimatePresence>

      {selected && <PayoutDetail entry={selected} onClose={() => setSelected(null)} />}

      {/* Mobile My Banks drawer — drag down to dismiss */}
      <AnimatePresence>
        {myBanksOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center lg:hidden">
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMyBanksOpen(false)} />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 400) setMyBanksOpen(false);
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-[#f5f5f5] dark:bg-[#111] p-5 pb-8 touch-none"
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1.5 rounded-full bg-[#d0d0d0] dark:bg-white/25" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">My Banks</h3>
                  <p className="text-[12px] text-[#9a9a9a] dark:text-white/40 mt-0.5">Settlement accounts for payouts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full",
                    accounts.length >= 3 ? "bg-red-500/20 text-red-400" : "bg-[#e3e3e3] dark:bg-white/10 text-[#6b6b6b] dark:text-white/50"
                  )}>{accounts.length}/3</span>
                  <button onClick={() => setMyBanksOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9a9a] dark:text-white/40 hover:text-[#1e1e1e] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Bank cards */}
              {accounts.length === 0 ? (
                <motion.div onClick={() => { setMyBanksOpen(false); openAddBank(); }} whileTap={{ scale: 0.98 }}
                  className="rounded-2xl border-2 border-dashed border-white/10 p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Building2 size={22} className="text-white/30" />
                  </div>
                  <p className="text-[14px] font-bold text-white/80">Add settlement bank</p>
                  <p className="text-[12px] text-white/40">Required to receive payouts</p>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#ffd716]">Add bank <ChevronRight size={13} /></span>
                </motion.div>
              ) : (
                <BankCardStack
                  accounts={accounts}
                  deletingId={deletingId}
                  onEdit={(a) => { setMyBanksOpen(false); openEditBank(a); }}
                  onRemove={handleRemoveAccount}
                  onReorder={(newOrder) => setAccounts(newOrder)}
                  primaryAccountId={primaryAccountId}
                  onSetPrimaryRequest={(acct) => { setMyBanksOpen(false); setPrimaryConfirmAccount(acct); }}
                />
              )}

              {/* Add another bank button */}
              {accounts.length > 0 && accounts.length < 3 && (
                <motion.button
                  onClick={() => { setMyBanksOpen(false); openAddBank(); }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold"
                >
                  <Building2 size={14} /> Add another account
                </motion.button>
              )}
              {accounts.length >= 3 && (
                <p className="text-[10.5px] text-red-400/70 text-center mt-4">Maximum 3 settlement accounts reached</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
export function WalletSkeleton() {
  const B = ({ className = "" }: { className?: string }) => <div className={`animate-pulse rounded-md bg-[#f0f0f0] dark:bg-white/10 ${className}`} />;
  return (
    <div className="px-5 sm:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto">
      {/* banner skeleton */}
      <B className="rounded-2xl h-[160px] sm:h-[172px] w-full" />
      {/* overlapping stat card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10 -mt-20 sm:-mt-[88px] px-[5%]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2"><B className="h-3 w-20" /><B className="h-7 w-28" /><B className="h-3 w-24 mt-1" /></div>
              <B className="w-8 h-8 rounded-xl" />
            </div>
            {i === 0 && <B className="h-9 w-full rounded-xl mt-4" />}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10"><B className="h-4 w-32" /><B className="h-3 w-20" /></div>
            <div className="divide-y divide-[#f5f5f5] dark:divide-white/5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3"><B className="w-9 h-9 rounded-full" /><div className="space-y-1.5"><B className="h-3.5 w-36" /><B className="h-3 w-24" /></div></div>
                  <B className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 h-[200px]">
            <B className="h-4 w-24 mb-4" /><B className="h-[130px] w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
            <B className="h-3 w-24 mb-3" /><div className="space-y-2"><B className="h-11 w-full rounded-xl" /><B className="h-11 w-full rounded-xl" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
