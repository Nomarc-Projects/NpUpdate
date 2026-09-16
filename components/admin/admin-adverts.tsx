"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GalleryHorizontalEnd, Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { createAdvert, updateAdvert, toggleAdvertActive, deleteAdvert, type Advert } from "@/lib/services/adverts";
import { PromotedCard } from "@/components/ui/promoted-card";
import { DashBanner, BannerContent, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

const ACCENTS = ["#ffd716", "#22c55e", "#f97316", "#6366f1", "#06b6d4", "#ec4899", "#1e1e1e"];
const blank = {
  heading: "", body: "", badge: "Promoted",
  promotedName: "", promotedMeta: "", avatarUrl: "",
  ctaLabel: "View Profile", ctaHref: "", ctaLabel2: "Message", ctaHref2: "",
  imageUrl: "", accent: "#ffd716", sortOrder: 0,
};
type Form = typeof blank;

export function AdminAdverts({ adverts = [] }: { adverts?: Advert[] }) {
  const router = useRouter();
  const [list, setList] = useState(adverts);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState<Form>(blank);
  const [pending, start] = useTransition();

  function openNew() { setEditId(null); setF(blank); setOpen(true); }
  function openEdit(a: Advert) {
    setEditId(a.id);
    setF({
      heading: a.heading, body: a.body ?? "", badge: a.badge ?? "Promoted",
      promotedName: a.promotedName ?? "", promotedMeta: a.promotedMeta ?? "", avatarUrl: a.avatarUrl ?? "",
      ctaLabel: a.ctaLabel ?? "", ctaHref: a.ctaHref ?? "", ctaLabel2: a.ctaLabel2 ?? "", ctaHref2: a.ctaHref2 ?? "",
      imageUrl: a.imageUrl ?? "", accent: a.accent, sortOrder: a.sortOrder,
    });
    setOpen(true);
  }

  function submit() {
    if (!f.heading.trim()) { toast.error("Title is required"); return; }
    start(async () => {
      try {
        if (editId) { await updateAdvert(editId, f); toast.success("Ad updated"); }
        else { await createAdvert(f); toast.success("Ad published"); }
        setOpen(false); setF(blank); setEditId(null); router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    });
  }

  const toggle = (a: Advert) => {
    setList((l) => l.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)));
    toggleAdvertActive(a.id, !a.active).then(() => router.refresh()).catch(() => { setList(adverts); toast.error("Failed"); });
  };
  const remove = (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    deleteAdvert(id).then(() => { toast.success("Deleted"); router.refresh(); }).catch(() => { setList(adverts); toast.error("Failed"); });
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[1000px]">
        <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
          <BannerContent
            eyebrow="Content"
            title="Ad Board"
            subtitle="Promoted listings for professionals, exhibitors and brands — shown in the homepage slider."
            actions={<button onClick={openNew} className={bannerPrimaryBtn}><Plus size={15} /> New ad</button>}
          />
        </DashBanner>
        <div className="mb-5" />

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
            <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><GalleryHorizontalEnd size={22} /></div>
            <h3 className="mt-4 text-[15px] font-bold text-[#1e1e1e] dark:text-white">No ads yet</h3>
            <p className="mt-1.5 text-[13px] text-[#9a9a9a] max-w-sm">Create one to feature it in the homepage promoted slider. Add multiple and they rotate automatically.</p>
            <button onClick={openNew} className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors"><Plus size={15} /> New ad</button>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((a) => (
              <div key={a.id} className="rounded-[22px] border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-3 sm:p-4">
                {/* Action bar */}
                <div className="flex items-center justify-between px-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: a.active ? "#dcfce7" : "#f0f0f0", color: a.active ? "#16803c" : "#9a9a9a" }}>
                    {a.active ? "Live" : "Hidden"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(a)} className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-white dark:hover:bg-white/5"><Pencil size={13} /> Edit</button>
                    <button onClick={() => toggle(a)} className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:bg-white dark:hover:bg-white/5">{a.active ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}</button>
                    <button onClick={() => remove(a.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10"><Trash2 size={15} /></button>
                  </div>
                </div>
                {/* Live preview — identical rendering to the homepage */}
                <PromotedCard ad={a} preview />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit ad" : "New ad"} maxWidth="max-w-[600px]"
        footer={<><GhostButton type="button" onClick={() => setOpen(false)}>Cancel</GhostButton><PrimaryButton type="button" disabled={pending} onClick={submit}>{editId ? "Save changes" : "Publish"}</PrimaryButton></>}>
        <div className="space-y-5">
          {/* Live preview */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3] mb-2">Preview</p>
            <PromotedCard ad={f} preview />
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Who / what is promoted</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" hint="Person or brand"><input className={inputClass} value={f.promotedName} onChange={(e) => setF({ ...f, promotedName: e.target.value })} placeholder="e.g. Titan SteelCo" /></Field>
              <Field label="Tag" hint="Pill on the image"><input className={inputClass} value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} placeholder="Promoted" /></Field>
            </div>
            <Field label="Meta line" hint="Role / category · location"><input className={inputClass} value={f.promotedMeta} onChange={(e) => setF({ ...f, promotedMeta: e.target.value })} placeholder="e.g. Core Building Materials · Ikeja, Lagos, Nigeria" /></Field>
            <Field label="Avatar URL" hint="Optional — falls back to initials"><input className={inputClass} value={f.avatarUrl} onChange={(e) => setF({ ...f, avatarUrl: e.target.value })} placeholder="https://…" /></Field>
          </div>

          <div className="space-y-4 border-t border-[#f0f0f0] dark:border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Content</p>
            <Field label="Title"><input className={inputClass} value={f.heading} onChange={(e) => setF({ ...f, heading: e.target.value })} placeholder="e.g. West Africa's Premier Steel Supplier" /></Field>
            <Field label="Text" hint="Short supporting description"><textarea rows={2} className={inputClass + " resize-none"} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Short supporting description…" /></Field>
          </div>

          <div className="space-y-4 border-t border-[#f0f0f0] dark:border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Buttons (custom links)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary button"><input className={inputClass} value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} placeholder="View Profile" /></Field>
              <Field label="Primary link"><input className={inputClass} value={f.ctaHref} onChange={(e) => setF({ ...f, ctaHref: e.target.value })} placeholder="/directory or https://…" /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Secondary button" hint="Optional"><input className={inputClass} value={f.ctaLabel2} onChange={(e) => setF({ ...f, ctaLabel2: e.target.value })} placeholder="Message" /></Field>
              <Field label="Secondary link"><input className={inputClass} value={f.ctaHref2} onChange={(e) => setF({ ...f, ctaHref2: e.target.value })} placeholder="/messages or https://…" /></Field>
            </div>
          </div>

          <div className="space-y-4 border-t border-[#f0f0f0] dark:border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Media & display</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Image URL"><input className={inputClass} value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Display order" hint="Lower shows first"><input type="number" className={inputClass} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} /></Field>
            </div>
            <Field label="Accent color">
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setF({ ...f, accent: c })} className={`w-8 h-8 rounded-lg transition-transform ${f.accent === c ? "ring-2 ring-offset-2 ring-[#1e1e1e] dark:ring-white scale-105" : ""}`} style={{ backgroundColor: c }} aria-label={c} />
                ))}
                <input type="color" value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value })} className="w-8 h-8 rounded-lg border border-[#e3e3e3] dark:border-white/15 cursor-pointer bg-transparent" />
              </div>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
