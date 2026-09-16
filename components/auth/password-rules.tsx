"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password-policy";

/**
 * Live password-requirements checklist. Renders directly under the Password
 * field (only once the user starts typing) so the rules are visible without the
 * redundant block that used to sit above Confirm Password.
 */
export function PasswordRules({ password }: { password: string }) {
  if (!password) return null;
  return (
    <motion.ul
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1"
    >
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className="flex items-center gap-1.5 text-[12px]">
            {ok ? (
              <Check size={13} className="text-[#16a34a] flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <X size={13} className="text-[#b3b3b3] flex-shrink-0" strokeWidth={2.5} />
            )}
            <span className={ok ? "text-[#6b6b6b] dark:text-white/60" : "text-[#9a9a9a] dark:text-white/40"}>{r.label}</span>
          </li>
        );
      })}
    </motion.ul>
  );
}
