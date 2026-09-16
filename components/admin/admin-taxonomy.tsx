"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Eye, EyeOff, Pencil, Upload } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { inputClass } from "@/components/ui/modal";
import { addTerm, toggleTerm, deleteTerm, type Term } from "@/lib/services/taxonomy";
import { TAXONOMY_KINDS, type TaxonomyKind } from "@/lib/taxonomy-kinds";
import { CategoryEditor } from "@/components/admin/category-editor";
import { ImportData } from "@/components/dashboard/import-data";
import { DashBanner, BannerContent, bannerBtn } from "@/components/dashboard/dash-banner";
import { r2Url } from "@/lib/r2-public";

/** Only the kinds that surface as a picture card on the storefront carry an
 *  image; the rest are plain labels wherever they're used. */
const HAS_IMAGE: TaxonomyKind[] = ["product_category", "service_category"];

export function AdminTaxonomy({ initialKind, terms = [] }: { initialKind: TaxonomyKind; terms?: Term[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<TaxonomyKind>(initialKind);
  const [list, setList] = useState(terms);
  const [name, setName] = useState("");
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [, start] = useTransition();

  const switchKind = (k: TaxonomyKind) => { router.push(`/admin/taxonomy?kind=${k}`); setKind(k); };

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const tmpId = `tmp_${Date.now()}`;
    setList((l) => [...l, { id: tmpId, name: n, imageUrl: "", active: true }]);
    setName("");
    start(() => addTerm(kind, n).then(() => router.refresh()).catch((e) => { setList((l) => l.filter((x) => x.id !== tmpId)); toast.error(e instanceof Error ? e.message : "Failed"); }));
  }
  const toggle = (t: Term) => {
    setList((l) => l.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
    toggleTerm(t.id, !t.active).then(() => router.refresh()).catch(() => { setList(terms); toast.error("Failed"); });
  };
  const remove = (id: string) => {
    setList((l) => l.filter((x) => x.id !== id));
    deleteTerm(id).then(() => router.refresh()).catch(() => { setList(terms); toast.error("Failed"); });
  };

  const meta = TAXONOMY_KINDS.find((k) => k.kind === kind)!;
  const singular = meta.label.replace(/s$/, "");
  const withImage = HAS_IMAGE.includes(kind);

  return (
    <div className="p-5 sm:p-6 lg:p-8">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Settings"
          title="Taxonomy"
          subtitle="Manage categories, skills, occupations, and tags."
          actions={<button onClick={() => setImporting(true)} className={bannerBtn}><Upload size={14} /> Import</button>}
        />
      </DashBanner>
      <div className="mb-5" />
      <div className="max-w-[900px] bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#ececec] dark:border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex gap-1.5 flex-wrap">
            {TAXONOMY_KINDS.map((k) => (
              <button key={k.kind} onClick={() => switchKind(k.kind)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${kind === k.kind ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"}`}>{k.label}</button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[#9a9a9a] dark:text-white/45">
            {meta.hint}
            {withImage && " — edit a term to change the name and image its card shows."}
          </p>

          <form onSubmit={add} className="mt-4 flex gap-2 max-w-md">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add a ${meta.label.toLowerCase().replace(/s$/, "")}…`} />
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors flex-shrink-0"><Plus size={16} /> Add</button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {list.length === 0 ? (
              <p className="text-[13px] text-[#9a9a9a]">No terms yet.</p>
            ) : list.map((t) => (
              <span key={t.id} className={`inline-flex items-center gap-2 rounded-full border py-1.5 text-[13px] ${withImage && t.imageUrl ? "pl-1.5 pr-3" : "px-3"} ${t.active ? "border-[#ffd716]/60 bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white/90" : "border-[#ececec] dark:border-white/10 text-[#9a9a9a] line-through"}`}>
                {withImage && t.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt="" aria-hidden className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                )}
                {t.name}
                <button onClick={() => setEditing(t)} title="Edit" className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"><Pencil size={12.5} /></button>
                <button onClick={() => toggle(t)} title={t.active ? "Hide" : "Show"} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white">{t.active ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                <button onClick={() => remove(t.id)} className="text-[#b3b3b3] hover:text-[#e5484d]"><X size={13} /></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <CategoryEditor
          term={editing}
          label={singular}
          showImage={withImage}
          onClose={() => setEditing(null)}
          onSaved={(next) => { setList((l) => l.map((x) => (x.id === next.id ? next : x))); router.refresh(); }}
        />
      )}

      <AnimatePresence>
        {importing && (
          <ImportData
            config={{
              title: `Import ${meta.label.toLowerCase()}`,
              subtitle: `Bulk-add terms to “${meta.label}”.`,
              noun: "term",
              columns: ["Name"],
              sample: [meta.label.replace(/s$/, "") + " example"],
              requiredKey: "name",
              templateName: `nomarc-${kind}-template.csv`,
              importRow: (r) => addTerm(kind, r.name),
            }}
            onClose={() => setImporting(false)}
            onDone={() => router.refresh()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
