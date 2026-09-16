"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

export interface ReceiptPrinterProps {
  variant?: "receipt" | "invoice";
  amountStr?: string;
  label?: string;
  typeColor?: string;
  onDismiss: () => void;
}

/* ─── Thermal receipt paper ──────────────────────────────────────────────── */
function ReceiptPaper({ amountStr, label, typeColor, show }: {
  amountStr?: string; label?: string; typeColor: string; show: boolean;
}) {
  return (
    <motion.div
      className="relative overflow-hidden"
      style={{ width: 200, originY: 0, marginTop: -1, zIndex: 5 }}
      initial={{ height: 0 }}
      animate={{ height: show ? 320 : 0 }}
      transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Paper body */}
      <div className="w-full" style={{ background: "#fafaf6", minHeight: 320 }}>
        {/* Side shadow lines */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.04) 100%)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-[2px]" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.04) 100%)" }} />

        {/* Nomarc mark */}
        <div className="pt-5 pb-2 flex justify-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[13px] text-[#1a1a1a]"
            style={{ background: "#ffd716", boxShadow: "0 2px 8px rgba(255,215,22,0.35)" }}>
            N
          </div>
        </div>

        {/* Type label */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: typeColor + "18", border: `1px solid ${typeColor}35` }}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
            <span className="text-[9px] font-bold tracking-wide" style={{ color: typeColor }}>{label ?? "Transaction"}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="px-4 py-1 text-center">
          <p className="text-[24px] font-black text-[#1a1a1a] leading-none tracking-tight">{amountStr ?? "₦0.00"}</p>
        </div>

        {/* Dashed divider */}
        <div className="mx-5 my-3" style={{ borderTop: "1.5px dashed #e0e0e0" }} />

        {/* Detail rows */}
        {[
          ["Receipt No.", "RCP-" + Math.random().toString(36).slice(2,10).toUpperCase()],
          ["Date", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })],
          ["Status", "Completed"],
          ["Fee", "₦0.00"],
        ].map(([k, v]) => (
          <div key={k} className="px-4 py-0.5 flex items-center justify-between gap-2">
            <span className="text-[8.5px] text-[#aaa]">{k}</span>
            <span className="text-[8.5px] font-semibold text-[#1a1a1a] text-right truncate max-w-[110px]">{v}</span>
          </div>
        ))}

        {/* Dashed divider */}
        <div className="mx-5 my-3" style={{ borderTop: "1.5px dashed #e0e0e0" }} />

        {/* Footer */}
        <div className="px-4 text-center">
          <p className="text-[8px] font-bold text-[#c8c8c8] tracking-widest uppercase">Nomarc Projects</p>
          <p className="text-[7px] text-[#d8d8d8] mt-0.5">nomarcprojects.com</p>
        </div>

        {/* Zigzag bottom */}
        <div className="mt-3 w-full h-4" style={{
          background: "#fafaf6",
          clipPath: "polygon(0 0,2% 100%,4% 0,6% 100%,8% 0,10% 100%,12% 0,14% 100%,16% 0,18% 100%,20% 0,22% 100%,24% 0,26% 100%,28% 0,30% 100%,32% 0,34% 100%,36% 0,38% 100%,40% 0,42% 100%,44% 0,46% 100%,48% 0,50% 100%,52% 0,54% 100%,56% 0,58% 100%,60% 0,62% 100%,64% 0,66% 100%,68% 0,70% 100%,72% 0,74% 100%,76% 0,78% 100%,80% 0,82% 100%,84% 0,86% 100%,88% 0,90% 100%,92% 0,94% 100%,96% 0,98% 100%,100% 0)"
        }} />
      </div>
    </motion.div>
  );
}

/* ─── Printer body illustration ───────────────────────────────────────────── */
function PrinterBody({ printing }: { printing: boolean }) {
  return (
    <div className="relative" style={{ width: 240 }}>
      {/* === TOP HALF: lid & controls === */}
      <div className="relative rounded-t-[18px] rounded-b-[6px]"
        style={{
          height: 62,
          background: "linear-gradient(180deg,#2e2e2e 0%,#232323 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 4px 0 rgba(0,0,0,0.35)",
        }}
      >
        {/* Embossed lid crease */}
        <div className="absolute top-[28px] inset-x-0 h-px" style={{ background: "rgba(0,0,0,0.4)", boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }} />

        {/* Lid surface */}
        <div className="absolute top-0 inset-x-0 h-[28px] rounded-t-[18px]"
          style={{ background: "linear-gradient(180deg,#363636 0%,#2c2c2c 100%)" }} />

        {/* Logo + brand name */}
        <div className="absolute top-[7px] left-[14px] flex items-center gap-2">
          <div className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center font-black text-[8px] text-[#1a1a1a] flex-shrink-0"
            style={{ background: "#ffd716" }}>N</div>
          <span className="text-[8px] font-bold tracking-[0.18em] text-white/20 uppercase">NOMARC</span>
        </div>

        {/* Status LEDs */}
        <div className="absolute top-[9px] right-[14px] flex items-center gap-2">
          <motion.div className="w-[7px] h-[7px] rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.8)" }}
            animate={{ opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="w-[7px] h-[7px] rounded-full"
            style={{ background: "#ffd716", boxShadow: "0 0 6px rgba(255,215,22,0.7)" }}
            animate={{ opacity: printing ? [0.5, 1, 0.5] : 0.35 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Paper slot opening (between lid and base) */}
        <div className="absolute bottom-0 inset-x-0 h-[5px] bg-black/70 rounded-none" />
        {/* Slot inner guides */}
        <div className="absolute bottom-[5px] left-[20px] right-[20px] h-px bg-white/[0.04]" />
      </div>

      {/* === BOTTOM HALF: base === */}
      <div className="relative rounded-t-[4px] rounded-b-[18px]"
        style={{
          height: 56,
          background: "linear-gradient(180deg,#1f1f1f 0%,#151515 100%)",
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.03), 0 16px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        {/* Vent slits */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute rounded-full"
            style={{ top: 14 + i * 8, left: 14, width: 28, height: 2, background: "rgba(255,255,255,0.05)" }} />
        ))}

        {/* Feed / eject button */}
        <motion.button
          className="absolute bottom-[12px] right-[14px] rounded-full"
          style={{
            width: 28, height: 28,
            background: "linear-gradient(135deg,#ffd716 0%,#c9a800 100%)",
            boxShadow: "0 2px 8px rgba(255,215,22,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
          animate={printing ? { scale: [1, 0.9, 1], boxShadow: ["0 2px 8px rgba(255,215,22,0.45)", "0 4px 16px rgba(255,215,22,0.7)", "0 2px 8px rgba(255,215,22,0.45)"] } : {}}
          transition={{ duration: 0.35, repeat: printing ? Infinity : 0, repeatDelay: 0.8 }}
        />

        {/* Front detail lines */}
        <div className="absolute bottom-[14px] left-[14px]" style={{ width: 90, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.04)" }} />
        <div className="absolute bottom-[20px] left-[14px]" style={{ width: 60, height: 1, borderRadius: 1, background: "rgba(255,255,255,0.03)" }} />

        {/* Rubber feet */}
        {[18, 210].map((x) => (
          <div key={x} className="absolute bottom-0 rounded-b-full"
            style={{ left: x, width: 16, height: 5, background: "#0a0a0a" }} />
        ))}
      </div>

      {/* Subtle glow under printer when printing */}
      <motion.div
        className="absolute -bottom-3 left-[50%] -translate-x-1/2 rounded-full pointer-events-none"
        style={{ width: 120, height: 8, background: "#ffd716", filter: "blur(12px)" }}
        animate={{ opacity: printing ? [0.2, 0.5, 0.2] : 0 }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function ReceiptPrinterIntro({
  variant = "receipt",
  amountStr,
  label,
  typeColor = "#ffd716",
  onDismiss,
}: ReceiptPrinterProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0=idle, 1=printing, 2=done
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [dismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_80%_70%_at_50%_38%,#f5f5f5_0%,#e8e8e8_100%)] dark:bg-[radial-gradient(ellipse_80%_70%_at_50%_38%,#1e1e1e_0%,#0a0a0a_100%)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: dismissed ? 0 : 1 }}
      transition={{ duration: 0.28 }}
    >
      {/* Grain texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient light ring */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,22,0.08) 0%, transparent 70%)" }} />

      {/* Close button */}
      <motion.button
        onClick={dismiss}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#9a9a9a] dark:text-white/30 hover:text-[#1e1e1e] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X size={17} />
      </motion.button>

      {/* Top label */}
      <motion.p
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute top-6 left-1/2 -translate-x-1/2 text-[9.5px] font-bold tracking-[0.28em] uppercase whitespace-nowrap text-[#b0b0b0] dark:text-white/20"
      >
        {variant === "invoice" ? "INVOICE" : "RECEIPT"} · NOMARC PROJECTS
      </motion.p>

      {/* Printer + paper scene */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.72, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28, delay: 0.15 }}
      >
        {/* Printer */}
        <PrinterBody printing={phase === 1} />

        {/* Paper feeds out below slot */}
        <ReceiptPaper
          amountStr={amountStr}
          label={label}
          typeColor={typeColor}
          show={phase >= 1}
        />
      </motion.div>

      {/* CTA button */}
      <AnimatePresence>
        {phase === 2 && !dismissed && (
          <motion.button
            onClick={dismiss}
            initial={{ opacity: 0, y: 18, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="mt-7 flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-[#1a1a1a] text-[14px]"
            style={{ background: "#ffd716", boxShadow: "0 8px 28px rgba(255,215,22,0.4), 0 2px 8px rgba(0,0,0,0.2)" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            View {variant === "invoice" ? "Invoice" : "Receipt"}
            <ChevronRight size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 text-[9px] tracking-[0.22em] uppercase text-[#c0c0c0] dark:text-white/20"
      >
        or press esc to skip
      </motion.p>
    </motion.div>
  );
}
