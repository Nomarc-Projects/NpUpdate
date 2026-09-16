"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { createAnnouncement, toggleAnnouncementActive, deleteAnnouncement, type Announcement } from "@/lib/services/announcements";
import { DashBanner, BannerContent, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

const AUDIENCES = ["all", "professional", "exhibitor"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AdminAnnouncements({ announcements = [] }: { announcements?: Announcement[] }) {
  const router = useRouter();
  const [list, setList] = useState(announcements);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", body: "", href: "", audience: "all" });
  const [pending, start] = useTransition();

  function submit() {
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    start(async () => {
      try { await createAnnouncement(f); toast.success("Announcement published"); setF({ title: "", body: "", href: "", audience: "all" }); setOpen(false); router.refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    });
  }
  const toggle = (a: Announcement) => {
    setList((l) => l.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)));
    toggleAnnouncementActive(a.id, !a.active).then(() => router.refresh()).catch(() => { setList(announcements); toast.error("Failed"); });
  };
  const remove = (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    deleteAnnouncement(id).then(() => { toast.success("Deleted"); router.refresh(); }).catch(() => { setList(announcements); toast.error("Failed"); });
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Content"
          title="Announcements"
          subtitle="Broadcast messages and platform updates."
          actions={<button onClick={() => setOpen(true)} className={bannerPrimaryBtn}><Plus size={15} /> New announcement</button>}
        />
      </DashBanner>
      <div className="mb-5" />
      <div className="max-w-[900px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
              <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Megaphone size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No announcements yet</h3>
              <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Publish one to show a banner at the top of the site.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <div key={a.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white flex items-center gap-2">{a.title}{a.active ? <span className="text-[10px] font-bold text-[#16803c] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">Live</span> : <span className="text-[10px] font-bold text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full">Hidden</span>}</p>
                      {a.body && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-1">{a.body}</p>}
                      <p className="text-[12px] text-[#9a9a9a] mt-1">Audience: {cap(a.audience)} • {a.date}{a.href && ` • links to ${a.href}`}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggle(a)} title={a.active ? "Hide" : "Show"} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5">{a.active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button onClick={() => remove(a.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New announcement" maxWidth="max-w-[520px]"
        footer={<><GhostButton type="button" onClick={() => setOpen(false)}>Cancel</GhostButton><PrimaryButton type="button" disabled={pending} onClick={submit}>Publish</PrimaryButton></>}>
        <div className="space-y-4">
          <Field label="Title"><input className={inputClass} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. New: Plans & Upgrades are live" /></Field>
          <Field label="Message" hint="Optional"><textarea rows={2} className={inputClass + " resize-none"} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Short supporting text…" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Link" hint="Optional"><input className={inputClass} value={f.href} onChange={(e) => setF({ ...f, href: e.target.value })} placeholder="/dashboard/plans" /></Field>
            <Field label="Audience"><SelectMenu value={cap(f.audience)} options={AUDIENCES.map(cap)} onChange={(v) => setF({ ...f, audience: v.toLowerCase() })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
