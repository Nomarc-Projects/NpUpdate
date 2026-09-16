const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) =>
  <div className={`skeleton rounded-md ${cls}`} style={style} />;

export default function Loading() {
  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5 space-y-1.5">
        <S cls="h-5 w-24" />
        <S cls="h-3.5 w-80 max-w-full" />
      </div>
      <S cls="h-10 w-full max-w-md rounded-xl" />
      <div className="mt-4 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f0f0f0] dark:border-white/5 last:border-0">
            <S cls="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1"><S cls="h-3 w-40" /><S cls="h-2.5 w-56 max-w-[60%]" /></div>
            <S cls="h-7 w-20 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
