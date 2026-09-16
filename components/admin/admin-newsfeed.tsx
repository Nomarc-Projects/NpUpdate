"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FileText, Pencil, Trash2, ArrowLeft, ExternalLink, FileEdit, Eye, Image as ImageIcon, Search, CalendarClock } from "lucide-react";
import { Modal, Field, inputClass, GhostButton } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { RichEditor } from "@/components/admin/rich-editor";
import { uploadFile } from "@/lib/upload-client";
import { savePost, deletePost, getPostForEdit, type AdminPost } from "@/lib/services/newsfeed";
import { DashBanner, BannerContent, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

function slugPreview(title: string, slug: string) {
  const s = (slug || title).toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return s || "your-post";
}

type Editing = { id?: string; slug: string; title: string; excerpt: string; body: string; coverUrl: string; tags: string; readMinutes: number; status: "draft" | "published"; publishAt: string };
const blank: Editing = { slug: "", title: "", excerpt: "", body: "", coverUrl: "", tags: "", readMinutes: 5, status: "draft", publishAt: "" };

export function AdminNewsFeed({ posts = [] }: { posts?: AdminPost[] }) {
  const router = useRouter();
  const [list, setList] = useState(posts);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dirty, setDirty] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Warn before leaving with unsaved edits (tab close / reload).
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const closeEditor = () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setEditing(null); setDirty(false);
  };

  async function openEdit(id: string) {
    const p = await getPostForEdit(id).catch(() => null);
    if (!p) { toast.error("Couldn't load post"); return; }
    setEditing({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverUrl: p.coverUrl, tags: p.tags.join(", "), readMinutes: p.readMinutes, status: p.status, publishAt: p.publishAt });
    setDirty(false);
  }

  function save(status: "draft" | "published") {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title is required"); return; }
    if (!editing.coverUrl.trim()) { toast.error("Featured image is required"); return; }
    if (editing.coverUrl.startsWith("blob:")) { toast.error("Cover image is still uploading — wait for it to finish"); return; }
    const scheduling = status === "published" && !!editing.publishAt && new Date(`${editing.publishAt}T09:00:00`).getTime() > Date.now();
    start(async () => {
      try {
        await savePost({ id: editing.id, slug: editing.slug, title: editing.title, excerpt: editing.excerpt, body: editing.body, coverUrl: editing.coverUrl, tags: editing.tags.split(",").map((t) => t.trim()).filter(Boolean), readMinutes: editing.readMinutes, status, publishAt: editing.publishAt });
        toast.success(scheduling ? "Scheduled" : status === "published" ? "Published" : "Saved as draft");
        setDirty(false); setEditing(null); router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    });
  }
  const confirmDelete = () => {
    if (!delId) return; const id = delId; const prev = list;
    setList((l) => l.filter((x) => x.id !== id)); setDelId(null);
    deletePost(id).then(() => { toast.success("Deleted"); router.refresh(); }).catch(() => { setList(prev); toast.error("Failed"); });
  };

  // ── editor view ──
  if (editing) {
    const set = (patch: Partial<Editing>) => { setDirty(true); setEditing((e) => (e ? { ...e, ...patch } : e)); };
    const willSchedule = !!editing.publishAt && new Date(`${editing.publishAt}T09:00:00`).getTime() > Date.now();
    return (
      <div className="px-6 md:px-8 py-8 max-w-[1200px]">
        <button onClick={closeEditor} className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white mb-4"><ArrowLeft size={16} /> Back to posts</button>

        {/* Title */}
        <input value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="Add post title"
          className="w-full bg-transparent text-[26px] md:text-[32px] font-bold text-[#1e1e1e] dark:text-white placeholder:text-[#cfcfcf] focus:outline-none leading-tight" />

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Editor */}
          <RichEditor value={editing.body} onChange={(html) => set({ body: html })} />

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-4">
            {/* Publish */}
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
              <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white mb-3">Publish</h3>
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#6b6b6b] dark:text-white/60"><FileEdit size={14} /> Status</span><span className="font-semibold text-[#1e1e1e] dark:text-white">{willSchedule ? "Scheduled" : editing.status === "published" ? "Published" : "Draft"}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[#6b6b6b] dark:text-white/60"><Eye size={14} /> Visibility</span><span className="font-semibold text-[#1e1e1e] dark:text-white">Public</span></div>
              </div>
              <div className="mt-3">
                <span className="flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60 mb-1.5"><CalendarClock size={14} /> Schedule <span className="text-[#b3b3b3]">(optional)</span></span>
                <DatePicker value={editing.publishAt} onChange={(v) => set({ publishAt: v })} placeholder="Publish immediately" />
                {willSchedule && <p className="mt-1 text-[11px] text-[#caa400]">Goes live on the selected date.</p>}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button type="button" disabled={pending} onClick={() => save("draft")} className="flex-1 px-3 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 disabled:opacity-60">Save draft</button>
                <button type="button" disabled={pending} onClick={() => save("published")} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114] transition-colors disabled:opacity-60">{pending ? "Saving…" : willSchedule ? "Schedule" : editing.status === "published" ? "Update" : "Publish"}</button>
              </div>
            </div>

            {/* Featured image */}
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
              <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white mb-3 flex items-center gap-2"><ImageIcon size={15} /> Featured image <span className="text-[11px] font-medium text-[#caa400]">(required)</span></h3>
              {editing.coverUrl && !editing.coverUrl.startsWith("blob:") ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editing.coverUrl} alt="cover" className="w-full h-36 rounded-lg object-cover" />
                  <button onClick={() => set({ coverUrl: "" })} className="mt-2 text-[13px] text-[#9a9a9a] hover:text-[#e5484d]">Remove image</button>
                </div>
              ) : (
                <FileUpload accept="image/png,image/jpeg,image/webp" maxSizeMB={8} label="Upload cover" hint="PNG/JPG · max 8MB" upload={(f) => uploadFile(f, "project")} onChange={(items) => { const u = items[0]?.url; if (u) set({ coverUrl: u }); }} />
              )}
            </div>

            {/* SEO & meta */}
            <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 space-y-4">
              <h3 className="text-sm font-bold text-[#1e1e1e] dark:text-white flex items-center gap-2"><Search size={15} /> SEO & details</h3>

              {/* Google-result preview */}
              <div className="rounded-lg border border-[#ececec] dark:border-white/10 p-3 bg-[#fafafa] dark:bg-white/[0.03]">
                <p className="text-[11px] text-[#9a9a9a] mb-1">Search preview</p>
                <p className="text-[13px] text-[#1a0dab] dark:text-[#8ab4f8] truncate leading-snug">{editing.title || "Your post title"}</p>
                <p className="text-[11px] text-[#0f7b34] truncate">nomarcprojects.com › newsfeed › {slugPreview(editing.title, editing.slug)}</p>
                <p className="text-[12px] text-[#4d5156] dark:text-white/55 mt-0.5 line-clamp-2">{editing.excerpt || "Add a meta description to control how this appears in search results."}</p>
              </div>

              <Field label="Permalink (slug)" hint="Auto from title if blank">
                <input className={inputClass} value={editing.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="my-post-url" />
                <p className="mt-1 text-[11px] text-[#9a9a9a] truncate">nomarcprojects.com/newsfeed/{slugPreview(editing.title, editing.slug)}</p>
              </Field>
              <Field label="Meta description" hint={`${editing.excerpt.length}/160 · used on cards & search`}>
                <textarea rows={3} className={inputClass + " resize-none"} value={editing.excerpt} onChange={(e) => set({ excerpt: e.target.value.slice(0, 200) })} placeholder="A short, compelling summary…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Read time (min)"><input className={inputClass} value={editing.readMinutes} onChange={(e) => set({ readMinutes: Number(e.target.value.replace(/[^\d]/g, "")) || 1 })} inputMode="numeric" /></Field>
                <Field label="Tags" hint="Comma-sep"><input className={inputClass} value={editing.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="Policy, Lagos" /></Field>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── list view ──
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Content"
          title="News Feed"
          subtitle="Create and manage news feed posts and articles."
          actions={<button onClick={() => setEditing(blank)} className={bannerPrimaryBtn}><Plus size={15} /> New post</button>}
        />
      </DashBanner>
      <div className="mb-5" />
      <div className="max-w-[900px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
              <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><FileText size={22} /></div>
              <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No posts yet</h3>
              <p className="mt-1.5 text-[13px] text-[#9a9a9a]">Write your first article to power the news feed and SEO.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
              {list.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-[#f0f0f0] dark:border-white/10 last:border-0 bg-[#fafafa] dark:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e1e1e] dark:text-white truncate flex items-center gap-2">{p.title}{p.scheduled ? <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.5 rounded-full">Scheduled</span> : p.status === "published" ? <span className="text-[10px] font-bold text-[#16803c] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">Live</span> : <span className="text-[10px] font-bold text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full">Draft</span>}</p>
                    <p className="text-[12px] text-[#9a9a9a]">/newsfeed/{p.slug} • {p.date}</p>
                  </div>
                  {p.status === "published" && !p.scheduled && <Link href={`/newsfeed/${p.slug}`} target="_blank" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"><ExternalLink size={15} /></Link>}
                  <button onClick={() => openEdit(p.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"><Pencil size={15} /></button>
                  <button onClick={() => setDelId(p.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#e5484d] hover:bg-[#fdecec] dark:hover:bg-[#e5484d]/10"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete post" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Delete this post permanently? This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5"><GhostButton onClick={() => setDelId(null)}>Cancel</GhostButton><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"><Trash2 size={15} /> Delete</button></div>
      </Modal>
    </div>
  );
}
