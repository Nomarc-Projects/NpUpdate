"use client";

export function PrintCertificateButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#1e1e1e] px-4 py-2.5 text-[12.5px] font-bold text-white print:hidden dark:bg-white dark:text-[#1e1e1e]">
      Print / save as PDF
    </button>
  );
}
