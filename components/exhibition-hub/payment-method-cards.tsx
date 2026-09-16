"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderName } from "@/lib/payments";

/** Real gateway options only (Paystack / Flutterwave / Seerbit) — no PayPal /
 *  Google Pay / COD, per Tee-David. Icons are each provider's real favicon
 *  mark (public/payment-icons/*.png), shown on a neutral white tile. */
const METHODS: { key: ProviderName; label: string; sub: string; icon: string }[] = [
  { key: "paystack", label: "Paystack", sub: "Card, bank transfer, USSD", icon: "/payment-icons/paystack.png" },
  { key: "flutterwave", label: "Flutterwave", sub: "Card, bank, mobile money", icon: "/payment-icons/flutterwave.png" },
  { key: "seerbit", label: "Seerbit", sub: "Card, bank transfer", icon: "/payment-icons/seerbit.png" },
];

export function PaymentMethodCards({ value, onChange }: { value: ProviderName; onChange: (v: ProviderName) => void }) {
  return (
    <div className="space-y-2.5">
      {METHODS.map((m) => {
        const active = value === m.key;
        return (
          <motion.button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            whileTap={{ scale: 0.99 }}
            className={cn(
              "w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 text-left transition-all",
              active ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/[0.06]" : "border-[#ececec] dark:border-white/10 hover:border-[#d4d4d4]",
            )}
          >
            <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-white/95 border border-[#ececec] dark:border-white/10 overflow-hidden p-1.5">
              <Image src={m.icon} alt={m.label} width={32} height={32} className="w-full h-full object-contain" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{m.label}</span>
              <span className="block text-[11.5px] text-[#9a9a9a]">{m.sub}</span>
            </span>
            <span className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              active ? "border-[#ffd716] bg-[#ffd716]" : "border-[#d4d4d4] dark:border-white/20",
            )}>
              {active && <Check size={12} className="text-[#1e1e1e]" />}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
