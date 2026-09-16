"use client";

import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useCartCount } from "@/lib/store/cart";
import { useCartUi } from "@/lib/store/cart-ui";
import { cn } from "@/lib/utils";

/** Cart trigger — icon + live count badge, opens the global quick-access
 *  drawer (`<CartDrawer />`, mounted once in Providers). Reused in both the
 *  marketing navbar and the dashboard header so the cart is always one tap
 *  away regardless of where a buyer is browsing. */
export function CartButton({ className, badgeRingClassName }: { className?: string; badgeRingClassName?: string }) {
  const count = useCartCount();
  const toggle = useCartUi((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Open cart${count > 0 ? ` (${count} item${count > 1 ? "s" : ""})` : ""}`}
      className={cn(
        "relative w-9 h-9 rounded-full flex items-center justify-center text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors",
        className,
      )}
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "absolute -top-0.5 -right-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ffd716] px-[3px] text-[9.5px] font-bold leading-none text-[#1e1e1e] ring-2 ring-white dark:ring-[#111]",
            badgeRingClassName,
          )}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </button>
  );
}
