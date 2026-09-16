"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Eye, EyeOff, Clock, Package } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { KebabMenu } from "@/components/dashboard/kit";
import { createService, updateService, deleteService, toggleServiceActive, type ServiceWithTiers, type TierInput } from "@/lib/services/services";
import { useTaxonomy } from "@/lib/use-taxonomy";

const CATEGORIES = ["Architectural Design", "Interior Design", "Structural Engineering", "MEP Engineering", "3D Visualization & Rendering", "BIM Services", "Quantity Surveying", "Project Management", "Urban Planning", "CAD Drafting", "Construction Consulting", "Other"];
const TIER_NAMES = ["Basic", "Standard", "Premium"] as const;
const naira = (n: number | null) => (n ? `₦${n.toLocaleString()}` : "—");
const emptyTiers = (): TierInput[] => TIER_NAMES.map((name) => ({ name, price: undefined, deliveryDays: undefined, scope: "" }));

export function ServicesManager({ services = [] }: { services?: ServiceWithTiers[] }) {
  const router = useRouter();
  const categories = useTaxonomy("service_category", CATEGORIES);
  const [list, setList] = useState(services);
  const [editor, setEditor] = useState<{ id: string | null; title: string; category: string; description: string; tiers: TierInput[] } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openNew = () => setEditor({ id: null, title: "", category: "", description: "", tiers: emptyTiers() });
  const openEdit = (s: ServiceWithTiers) => {
    const tiers = TIER_NAMES.map((name) => {
      const t = s.tiers.find((x) => x.name === name);
      return { name, price: t?.price ?? undefined, deliveryDays: t?.deliveryDays ?? undefined, scope: t?.scope ?? "" };
    });
    setEditor({ id: s.id, title: s.title, category: s.category ?? "", description: s.description ?? "", tiers });
  };

  function save() {
    if (!editor) return;
    if (!editor.title.trim()) { toast.error("Service title is required"); return; }
    if (!editor.tiers.some((t) => t.price != null || (t.scope && t.scope.trim()))) { toast.error("Fill in at least one tier"); return; }
    start(async () => {
      try {
        const payload = { title: editor.title, category: editor.category, description: editor.description, tiers: editor.tiers };
        if (editor.id) await updateService(editor.id, payload); else await createService(payload);
        toast.success(editor.id ? "Service updated" : "Service published");
        setEditor(null); router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save service"); }
    });
  }

  const toggleActive = (s: ServiceWithTiers) => {
    const prev = list;
    setList((l) => l.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    toast.success(s.active ? "Service hidden" : "Service live");
    toggleServiceActive(s.id, !s.active).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };
  const confirmDelete = () => {
    if (!delId) return;
    const prev = list; const id = delId;
    setList((l) => l.filter((x) => x.id !== id)); setDelId(null);
    toast.success("Service deleted");
    deleteService(id).then(() => router.refresh()).catch((e) => { setList(prev); toast.error(e instanceof Error ? e.message : "Failed"); });
  };

  const setTier = (i: number, patch: Partial<TierInput>) => setEditor((e) => e ? { ...e, tiers: e.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) } : e);

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[940px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffd716]/15 dark:bg-[#ffd716]/[0.08] flex items-center justify-center text-[#caa400]"><Package size={18} /></div>
            <div>
              <h1 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">My services</h1>
              <p className="text-[12px] text-[#9a9a9a] mt-0.5">Package your skills into fixed offers buyers can order directly.</p>
            </div>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-[13px] font-semibold hover:bg-[#e6c114] transition-colors"><Plus size={15} /> Add service</button>
        </div>
        <div className="p-6">

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 rounded-xl border border-dashed border-[#e3e3e3] dark:border-white/10">
          <div className="w-12 h-12 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#caa400]"><Package size={22} /></div>
          <h3 className="mt-4 text-base font-bold text-[#1e1e1e] dark:text-white">No services yet</h3>
          <p className="mt-1.5 text-[13px] text-[#9a9a9a] max-w-sm">Create tiered offers (Basic / Standard / Premium) so buyers can hire you for fixed scopes — like a Fiverr gig, built for construction.</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors"><Plus size={15} /> Add your first service</button>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((s) => (
            <div key={s.id} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white">{s.title}</h3>
                    {!s.active && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]">Hidden</span>}
                  </div>
                  {s.category && <p className="text-[12px] text-[#9a9a9a]">{s.category}</p>}
                  {s.description && <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 mt-2 max-w-[640px]">{s.description}</p>}
                </div>
                <div className="flex-shrink-0">
                  {/* Portal-based KebabMenu — the card's overflow-hidden used to
                      clip the inline absolute menu. */}
                  <KebabMenu items={[
                    { icon: Pencil, label: "Edit", onClick: () => openEdit(s) },
                    { icon: s.active ? EyeOff : Eye, label: s.active ? "Hide" : "Make live", onClick: () => toggleActive(s) },
                    { icon: Trash2, label: "Delete", danger: true, onClick: () => setDelId(s.id) },
                  ]} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TIER_NAMES.map((name) => {
                  const t = s.tiers.find((x) => x.name === name);
                  if (!t) return <div key={name} className="rounded-xl border border-dashed border-[#ececec] dark:border-white/10 p-3 text-center text-[12px] text-[#b3b3b3]">{name} — not offered</div>;
                  return (
                    <div key={name} className="rounded-xl border border-[#ececec] dark:border-white/10 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#caa400]">{name}</p>
                      <p className="text-lg font-bold text-[#1e1e1e] dark:text-white mt-1">{naira(t.price)}</p>
                      {t.deliveryDays != null && <p className="text-[12px] text-[#9a9a9a] flex items-center gap-1 mt-0.5"><Clock size={12} /> {t.deliveryDays} day{t.deliveryDays === 1 ? "" : "s"}</p>}
                      {t.scope && <p className="text-[12px] text-[#6b6b6b] dark:text-white/60 mt-2">{t.scope}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
        </div>
      </div>

      {/* editor */}
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "Edit service" : "Add a service"} subtitle="Define what you offer and price up to three tiers." maxWidth="max-w-[640px]"
        footer={<><GhostButton type="button" onClick={() => setEditor(null)}>Cancel</GhostButton><PrimaryButton type="button" disabled={pending} onClick={save}>{pending ? "Saving…" : editor?.id ? "Save changes" : "Publish service"}</PrimaryButton></>}>
        {editor && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Service title"><input className={inputClass} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} placeholder="e.g. Residential floor plans" /></Field>
              <Field label="Category"><SelectMenu placeholder="Select category" value={editor.category} onChange={(v) => setEditor({ ...editor, category: v })} options={categories} /></Field>
            </div>
            <Field label="Description" hint="Optional"><textarea rows={2} className={inputClass + " resize-none"} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} placeholder="What buyers get and how you work…" /></Field>
            <div>
              <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-2">Pricing tiers <span className="text-[#9a9a9a] font-normal">— fill the ones you offer</span></p>
              <div className="space-y-3">
                {editor.tiers.map((t, i) => (
                  <div key={t.name} className="rounded-xl border border-[#ececec] dark:border-white/10 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#caa400] mb-2">{t.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Price (₦)"><input className={inputClass} value={t.price ?? ""} onChange={(e) => setTier(i, { price: e.target.value ? Number(e.target.value.replace(/[^\d]/g, "")) : undefined })} placeholder="150,000" inputMode="numeric" /></Field>
                      <Field label="Delivery (days)"><input className={inputClass} value={t.deliveryDays ?? ""} onChange={(e) => setTier(i, { deliveryDays: e.target.value ? Number(e.target.value.replace(/[^\d]/g, "")) : undefined })} placeholder="7" inputMode="numeric" /></Field>
                    </div>
                    <div className="mt-3"><Field label="What's included"><input className={inputClass} value={t.scope ?? ""} onChange={(e) => setTier(i, { scope: e.target.value })} placeholder="e.g. 1 concept, 2 revisions, CAD files" /></Field></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete service" maxWidth="max-w-md">
        <p className="text-sm text-[#6b6b6b] dark:text-white/60">Are you sure you want to delete this service and its tiers? This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5"><GhostButton onClick={() => setDelId(null)}>Cancel</GhostButton><button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-[#e5484d] text-white text-sm font-semibold hover:bg-[#d33a3f] transition-colors flex items-center gap-1.5"><Trash2 size={15} /> Delete</button></div>
      </Modal>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ServicesSkeleton() {
  const S = ({ cls = "", style }: { cls?: string; style?: React.CSSProperties }) => <div className={`skeleton rounded-md ${cls}`} style={style} />;
  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <div className="max-w-[940px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#f0f0f0] dark:border-white/10 flex-wrap">
          <div className="flex items-center gap-3">
            <S cls="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5"><S cls="h-4 w-28" /><S cls="h-3 w-64 max-w-full" /></div>
          </div>
          <S cls="h-9 w-28 rounded-lg" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1.5"><S cls="h-4 w-40" /><S cls="h-3 w-20" /></div>
                <S cls="w-7 h-7 rounded-lg flex-shrink-0" />
              </div>
              <S cls="h-3 w-full" /><S cls="mt-1.5 h-3 w-4/5" />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="rounded-xl border border-[#ececec] dark:border-white/10 p-3.5 space-y-2">
                    <S cls="h-3 w-16" /><S cls="h-5 w-20" /><S cls="h-3 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
