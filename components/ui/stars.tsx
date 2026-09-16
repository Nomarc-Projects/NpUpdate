"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/** Read-only star display (supports halves visually via rounding). */
export function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-[#ffd716] text-[#ffd716]" : "fill-transparent text-[#d4d4d4] dark:text-white/20"} />
      ))}
    </span>
  );
}

/** Interactive star input. */
export function StarInput({ value, onChange, size = 24 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} className="transition-transform hover:scale-110">
          <Star size={size} className={i <= shown ? "fill-[#ffd716] text-[#ffd716]" : "fill-transparent text-[#d4d4d4] dark:text-white/25"} />
        </button>
      ))}
    </span>
  );
}
