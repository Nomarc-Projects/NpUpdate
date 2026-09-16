"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Radio, Plus, Trash2, Eye, EyeOff, Pencil, ChevronUp, ChevronDown, Gauge } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import {
  addTicker, updateTicker, toggleTicker, deleteTicker, moveTickerUp, moveTickerDown,
  type TickerItem,
} from "@/lib/services/ticker";
import { setTickerSpeed } from "@/lib/services/platform-settings";
import { DashBanner, BannerContent, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

type Mode = { type: "add" } | { type: "edit"; item: TickerItem };

function ItemForm({ init, onSave, onClose, pending }: {
  init: { content: string; href: string };
  onSave: (content: string, href: string) => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [f, setF] = useState(init);
  return (
    <div className="space-y-4">
      <Field label="Ticker text">
        <input
          className={inputClass}
          value={f.content}
          onChange={(e) => setF({ ...f, content: e.target.value })}
          placeholder="e.g. New features dropped — see what's new on the platform"
          autoFocus
        />
      </Field>
      <Field label="Link" hint="Optional — e.g. /dashboard/plans or https://…">
        <input
          className={inputClass}
          value={f.href}
          onChange={(e) => setF({ ...f, href: e.target.value })}
          placeholder="/dashboard/plans"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton type="button" disabled={pending} onClick={() => onSave(f.content, f.href)}>
          {pending ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export function AdminNewsTicker({ items: initial = [], seconds: initialSeconds = 90 }: {
  items?: TickerItem[];
  seconds?: number;
}) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, start] = useTransition();
  // `speed` drives the preview live as the slider moves; `savedSpeed` is what is
  // actually persisted, so the Save button knows when there is a change to write.
  const [speed, setSpeed] = useState(initialSeconds);
  const [savedSpeed, setSavedSpeed] = useState(initialSeconds);

  const saveSpeed = () => {
    start(async () => {
      try {
        const next = await setTickerSpeed(speed);
        setSpeed(next.seconds);
        setSavedSpeed(next.seconds);
        toast.success(`Ticker speed set to ${next.seconds}s per loop`);
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save speed"); }
    });
  };

  function save(content: string, href: string) {
    if (!content.trim()) { toast.error("Ticker text is required"); return; }
    start(async () => {
      try {
        if (mode?.type === "edit") {
          await updateTicker(mode.item.id, content, href);
          setList((l) => l.map((x) => x.id === mode.item.id ? { ...x, content: content.trim(), href: href.trim() || null } : x));
          toast.success("Item updated");
        } else {
          await addTicker(content, href);
          toast.success("Item added");
          router.refresh();
        }
        setMode(null);
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    });
  }

  const toggle = (item: TickerItem) => {
    setList((l) => l.map((x) => x.id === item.id ? { ...x, active: !x.active } : x));
    toggleTicker(item.id, !item.active).then(() => router.refresh()).catch(() => { setList(initial); toast.error("Failed"); });
  };

  const remove = (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    deleteTicker(id).then(() => { toast.success("Deleted"); router.refresh(); }).catch(() => { setList(initial); toast.error("Failed"); });
  };

  const moveUp = (id: string) => {
    start(async () => {
      try { await moveTickerUp(id); router.refresh(); }
      catch { toast.error("Couldn't reorder"); }
    });
  };

  const moveDown = (id: string) => {
    start(async () => {
      try { await moveTickerDown(id); router.refresh(); }
      catch { toast.error("Couldn't reorder"); }
    });
  };

  return (
    <div className="px-6 md:px-8 py-8 max-w-[900px]">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Content"
          title="News Ticker"
          subtitle="Manage the scrolling news bar across the platform."
          actions={<button onClick={() => setMode({ type: "add" })} className={bannerPrimaryBtn}><Plus size={16} /> Add item</button>}
        />
      </DashBanner>
      <div className="mb-5" />

      {/* Scroll speed. Seconds per full loop, so the number rises as the ticker
          slows — the label says so, because the slider alone reads backwards. */}
      <div className="mb-6 rounded-xl border border-[#e3e3e3] dark:border-white/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={15} className="text-[#b3b3b3]" />
          <p className="text-[11px] font-semibold text-[#b3b3b3] uppercase tracking-wide">Scroll speed</p>
        </div>
        <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/50 mb-3">
          How long one full pass takes. Higher is slower — raise it when there are more items to read.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 accent-[#ffd716]"
            aria-label="Seconds per full ticker loop"
          />
          <span className="tabular-nums text-[13px] font-semibold w-14 text-right">{speed}s</span>
          <PrimaryButton type="button" disabled={pending || speed === savedSpeed} onClick={saveSpeed}>
            {pending ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>
      </div>

      {/* live preview strip */}
      {list.some((i) => i.active) && (
        <div className="mb-6 rounded-xl overflow-hidden border border-[#e3e3e3] dark:border-white/10">
          <p className="text-[11px] font-semibold text-[#b3b3b3] uppercase tracking-wide px-4 pt-3 pb-1.5">Live preview</p>
          <div className="relative bg-[#1e1e1e] text-white">
            <div className="flex items-center">
              <span className="hidden sm:flex items-center gap-1.5 bg-[#ffd716] text-[#1e1e1e] text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 flex-shrink-0">
                <Radio size={12} /> News
              </span>
              <div className="group flex-1 overflow-hidden">
                <div
                  className="flex w-max animate-[nm-marquee_30s_linear_infinite] group-hover:[animation-play-state:paused] py-1.5"
                  style={{ animationDuration: `${speed}s` }}
                >
                  {[...list.filter((i) => i.active), ...list.filter((i) => i.active)].map((it, i) => (
                    <span key={i} className="flex items-center text-[13px] text-white/85 whitespace-nowrap px-6">
                      <span className="text-[#ffd716] mr-2">●</span>
                      {it.content}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* item list */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]">
            <Radio size={22} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No ticker items yet</h3>
          <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Add an item and it will scroll across the homepage.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item, idx) => (
            <div key={item.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-4 py-3">
              <div className="flex items-center gap-3">
                {/* reorder buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveUp(item.id)}
                    disabled={pending || idx === 0}
                    className="p-0.5 rounded text-[#c3c3c3] hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(item.id)}
                    disabled={pending || idx === list.length - 1}
                    className="p-0.5 rounded text-[#c3c3c3] hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1e1e1e] dark:text-white truncate">{item.content}</p>
                  {item.href && (
                    <p className="text-[12px] text-[#9a9a9a] truncate mt-0.5">↗ {item.href}</p>
                  )}
                </div>

                {/* status badge */}
                {item.active
                  ? <span className="text-[10px] font-bold text-[#16803c] bg-[#dcfce7] px-1.5 py-0.5 rounded-full flex-shrink-0">Live</span>
                  : <span className="text-[10px] font-bold text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Hidden</span>
                }

                {/* actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setMode({ type: "edit", item })}
                    title="Edit"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggle(item)}
                    title={item.active ? "Hide" : "Show"}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
                  >
                    {item.active ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode?.type === "edit" ? "Edit ticker item" : "Add ticker item"}
        maxWidth="max-w-[520px]"
      >
        {mode !== null && (
          <ItemForm
            init={
              mode.type === "edit"
                ? { content: mode.item.content, href: mode.item.href ?? "" }
                : { content: "", href: "" }
            }
            onSave={save}
            onClose={() => setMode(null)}
            pending={pending}
          />
        )}
      </Modal>
    </div>
  );
}
