"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, CheckCircle2 } from "lucide-react";

export type UploadItem = {
  id: string; name: string; size: number; type: string;
  progress: number; url?: string; error?: string;
};

function human(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ext(name: string) {
  return (name.split(".").pop() ?? "").toUpperCase().slice(0, 4);
}

/* Deterministic colour per extension */
const EXT_COLORS: Record<string, string> = {
  PDF:  "bg-red-500",
  DOC:  "bg-blue-500",  DOCX: "bg-blue-500",
  XLS:  "bg-emerald-500", XLSX: "bg-emerald-500",
  PPT:  "bg-orange-500", PPTX: "bg-orange-500",
  ZIP:  "bg-purple-500", RAR:  "bg-purple-500",
  MP4:  "bg-pink-500",   MOV:  "bg-pink-500",
  MP3:  "bg-teal-500",
  PNG:  "bg-sky-500",    JPG:  "bg-sky-500", JPEG: "bg-sky-500",
  WEBP: "bg-sky-500",    GIF:  "bg-sky-500",
  SVG:  "bg-violet-500",
};
function extColor(name: string) {
  return EXT_COLORS[ext(name)] ?? "bg-[#9a9a9a]";
}

function FileRow({ it, onRemove }: { it: UploadItem; onRemove: () => void }) {
  const e = ext(it.name);
  const isImg = it.type.startsWith("image/");
  const isVid = it.type.startsWith("video/");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-2.5"
    >
      {/* thumbnail / badge */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
        {isImg && it.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={it.url} alt={it.name} className="w-full h-full object-cover" />
        ) : isVid && it.url ? (
          /* First frame stands in as the thumbnail; muted + preload=metadata so
             adding a clip never starts audio or pulls the whole file down. */
          <video src={it.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-white text-[10px] font-bold ${extColor(it.name)}`}>
            {e || "?"}
          </div>
        )}
      </div>

      {/* name + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{it.name}</p>
          <button
            type="button"
            onClick={onRemove}
            className="text-[#b3b3b3] hover:text-[#e5484d] flex-shrink-0 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {it.error ? (
          <p className="text-[11px] text-[#e5484d] mt-0.5">{it.error}</p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#ffd716]"
                initial={{ width: "0%" }}
                animate={{ width: `${it.progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            {it.progress >= 100
              ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              : <span className="text-[10px] text-[#9a9a9a] w-8 text-right tabular-nums">{it.progress}%</span>
            }
          </div>
        )}

        <p className="text-[10px] text-[#b3b3b3] mt-0.5">{human(it.size)}</p>
      </div>
    </motion.div>
  );
}

export function FileUpload({
  accept = "image/*",
  maxSizeMB = 5,
  videoMaxSizeMB,
  maxItems,
  multiple = false,
  label = "Click to upload",
  hint,
  onChange,
  upload,
  className = "",
}: {
  accept?: string;
  /** Size cap for everything except video (see videoMaxSizeMB). */
  maxSizeMB?: number;
  /** Separate, usually larger cap for video/* — a clip is legitimately heavier than a photo. */
  videoMaxSizeMB?: number;
  /** Hard cap on how many files may be held at once. Extra files are rejected, not silently dropped. */
  maxItems?: number;
  multiple?: boolean;
  label?: string;
  hint?: string;
  onChange?: (items: UploadItem[]) => void;
  upload?: (file: File, onProgress: (p: number) => void) => Promise<string>;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [drag, setDrag] = useState(false);

  const isVideo = (f: File) => f.type.startsWith("video/");
  const capFor = (f: File) => (isVideo(f) && videoMaxSizeMB ? videoMaxSizeMB : maxSizeMB);

  const accepts = (f: File) => {
    if (accept === "*" || !accept) return true;
    return accept.split(",").some((a) => {
      a = a.trim();
      if (a.endsWith("/*")) return f.type.startsWith(a.slice(0, -1));
      if (a.startsWith(".")) return f.name.toLowerCase().endsWith(a.toLowerCase());
      return f.type === a;
    });
  };

  function setAndEmit(next: UploadItem[]) { setItems(next); onChange?.(next); }

  /**
   * Rejections go through the functional setState form, same as accepted files.
   * They previously spread a captured `items`, so dropping several oversized
   * files at once left only the last rejection visible — the others vanished
   * with no explanation, which reads as the upload silently ignoring them.
   */
  function reject(item: UploadItem) {
    setItems((prev) => {
      const next = multiple ? [...prev, item] : [item];
      onChange?.(next);
      return next;
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    // Counted as we go so one multi-select can't overshoot the cap.
    let accepted = items.filter((i) => !i.error).length;

    for (const f of files) {
      const id = `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 6)}`;
      if (!accepts(f)) {
        reject({ id, name: f.name, size: f.size, type: f.type, progress: 0, error: "Unsupported file type" });
        continue;
      }
      if (maxItems && accepted >= maxItems) {
        reject({ id, name: f.name, size: f.size, type: f.type, progress: 0, error: `Limit reached (max ${maxItems} items)` });
        continue;
      }
      const cap = capFor(f);
      if (f.size > cap * 1024 * 1024) {
        reject({ id, name: f.name, size: f.size, type: f.type, progress: 0, error: `Too large (max ${cap}MB for ${isVideo(f) ? "video" : "images"})` });
        continue;
      }
      accepted++;
      const item: UploadItem = {
        id, name: f.name, size: f.size, type: f.type, progress: 0,
        url: URL.createObjectURL(f),
      };
      setItems((prev) => { const next = multiple ? [...prev, item] : [item]; onChange?.(next); return next; });

      const onProgress = (p: number) =>
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, progress: p } : it));

      try {
        if (upload) {
          const url = await upload(f, onProgress);
          setItems((prev) => {
            const next = prev.map((it) => it.id === id ? { ...it, progress: 100, url: url ?? it.url } : it);
            onChange?.(next);
            return next;
          });
        } else {
          for (let p = 0; p <= 100; p += 20) {
            await new Promise((r) => setTimeout(r, 90));
            setItems((prev) => {
              const next = prev.map((it) => it.id === id ? { ...it, progress: p } : it);
              if (p >= 100) onChange?.(next);
              return next;
            });
          }
        }
      } catch {
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, error: "Upload failed" } : it));
      }
    }
  }

  const remove = (id: string) => setAndEmit(items.filter((i) => i.id !== id));

  return (
    <div className={className}>
      {/* Drop zone */}
      <motion.div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        animate={drag ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-colors ${
          drag
            ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/10"
            : "border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] hover:bg-[#fffdf2]/40 dark:hover:bg-[#ffd716]/5"
        }`}
      >
        <motion.div
          animate={drag ? { y: -4 } : { y: 0 }}
          className="w-10 h-10 rounded-lg bg-[#f3f3f3] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a]"
        >
          <UploadCloud size={20} />
        </motion.div>

        <p className="mt-3 text-sm">
          <span className="font-semibold text-[#caa400]">{label}</span>
          {" "}
          <span className="text-[#9a9a9a]">or drag &amp; drop</span>
        </p>
        <p className="text-[11px] text-[#9a9a9a] mt-0.5">
          {hint ?? `${accept.replace("image/*", "PNG, JPG").toUpperCase()} · max ${maxSizeMB}MB`}
          {multiple && " · multiple files"}
        </p>
        {/* Spelled out separately so the two different caps and the item limit
            are visible before someone picks a file, not discovered by rejection. */}
        {(videoMaxSizeMB || maxItems) && (
          <p className="mt-1 text-[10.5px] text-[#b3b3b3]">
            {[
              `images up to ${maxSizeMB}MB`,
              videoMaxSizeMB ? `video up to ${videoMaxSizeMB}MB` : null,
              maxItems ? `${items.filter((i) => !i.error).length}/${maxItems} used` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </motion.div>

      {/* File list */}
      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {items.map((it) => (
              <FileRow key={it.id} it={it} onRemove={() => remove(it.id)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
