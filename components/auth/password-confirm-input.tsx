"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "@/components/ui/modal";

export interface PasswordConfirmInputProps {
  passwordToMatch: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A plain confirm-password field, consistent with the primary password input:
 * one input + a reveal toggle. The border turns green once it matches.
 */
export function PasswordConfirmInput({ passwordToMatch, value, onChange }: PasswordConfirmInputProps) {
  const [show, setShow] = useState(false);
  const matched = value.length > 0 && passwordToMatch === value;

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-10 ${matched ? "border-emerald-500 focus:border-emerald-500" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
