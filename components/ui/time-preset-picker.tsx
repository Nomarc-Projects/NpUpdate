"use client";

/** One preset per common quiz-question time limit, in seconds. */
const PRESETS: { label: string; seconds: number }[] = [
  { label: "5s", seconds: 5 }, { label: "10s", seconds: 10 }, { label: "15s", seconds: 15 }, { label: "20s", seconds: 20 },
  { label: "25s", seconds: 25 }, { label: "30s", seconds: 30 }, { label: "45s", seconds: 45 }, { label: "60s", seconds: 60 },
  { label: "75s", seconds: 75 }, { label: "90s", seconds: 90 }, { label: "1m 15s", seconds: 75 }, { label: "1m 30s", seconds: 90 },
  { label: "2m", seconds: 120 }, { label: "2m 30s", seconds: 150 }, { label: "3m", seconds: 180 }, { label: "4m", seconds: 240 },
  { label: "5m", seconds: 300 }, { label: "10m", seconds: 600 }, { label: "15m", seconds: 900 }, { label: "20m", seconds: 1200 },
  { label: "30m", seconds: 1800 }, { label: "45m", seconds: 2700 }, { label: "60m", seconds: 3600 }, { label: "90m", seconds: 5400 },
];

/** Grid-of-pills preset picker, modeled on date-picker.tsx's month/year grid. */
export function TimePresetPicker({ value, onChange }: { value: number | null; onChange: (seconds: number | null) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {PRESETS.map((p) => {
        const isSel = value === p.seconds;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(isSel ? null : p.seconds)}
            className={`h-9 rounded-lg text-[12.5px] font-medium transition-colors ${
              isSel
                ? "bg-[#ffd716] text-[#1e1e1e]"
                : "text-[#1e1e1e] dark:text-white/80 border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716]"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
