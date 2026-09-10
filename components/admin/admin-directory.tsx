"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Landmark, Building2 } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/dashboard/kit/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createCatalogueEntry, updateCatalogueEntry, deleteCatalogueEntry,
  type CatalogueEntry, type CatalogueInput,
} from "@/lib/services/directory-catalogue";
import {
  CATALOGUE_KINDS, CATEGORIES_BY_KIND,
  CATALOGUE_KIND_LABEL, CATALOGUE_KIND_NAME, type CatalogueKind,
} from "@/lib/constants/catalogue-categories";

type FormState = CatalogueInput;

const emptyForm = (kind: CatalogueKind): FormState => ({
  kind, name: "", acronym: "", category: "", location: "", email: "",
  phone: "", website: "", about: "", logoUrl: "", published: true,
});

function label(c: string) {
  return c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AdminDirectory({ initial }: { initial: CatalogueEntry[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<CatalogueKind>("institution");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm("institution"));
  const [draftFilter, setDraftFilter] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setEditId(null);
    setForm(emptyForm(kind));
    setOpen(true);
  }
  function openEdit(e: CatalogueEntry) {
    setEditId(e.id);
    setForm({
      kind: e.kind, name: e.name, acronym: e.acronym, category: e.category,
      location: e.location, email: e.email, phone: e.phone, website: e.website,
      about: e.about, logoUrl: e.logoUrl, published: e.published,
    });
    setOpen(true);
  }

  const shown = initial
    .filter((e) => e.kind === kind)
    .filter((e) => (draftFilter ? !e.published : true));

  function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    start(async () => {
      try {
        if (editId) await updateCatalogueEntry(editId, form); else await createCatalogueEntry(form);
        toast.success(editId ? "Entry updated" : "Entry created");
        setOpen(false); setEditId(null);
        router.refresh();
      } catch { toast.error("Could not save the entry"); }
    });
  }

  function remove() {
    if (!confirmId) return;
    start(async () => {
      try { await deleteCatalogueEntry(confirmId); toast.success("Entry deleted"); router.refresh(); }
      catch { toast.error("Could not delete the entry"); }
      finally { setConfirmId(null); }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1e1e1e] dark:text-white">Directory</h1>
          <p className="text-[13px] text-[#9a9a9a]">Curate the institutions and government ministries shown on the Directory page.</p>
        </div>
        <PrimaryButton onClick={openNew}><Plus size={15} /> New entry</PrimaryButton>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-[#e5e5e5] dark:border-white/10 p-0.5">
          {CATALOGUE_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                kind === k ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#6b6b6b] hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white",
              )}
            >
              {CATALOGUE_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 cursor-pointer">
          <input type="checkbox" checked={draftFilter} onChange={(e) => setDraftFilter(e.target.checked)} className="accent-[#ffd716] w-3.5 h-3.5" />
          Drafts only
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e5e5e5] dark:border-white/15 p-10 text-center text-[13px] text-[#9a9a9a]">
          No {CATALOGUE_KIND_LABEL[kind].toLowerCase()} yet — create the first one.
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((e) => (
            <div key={e.id} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#181818] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fffdf2] dark:bg-[#ffd716]/10 text-[#caa400] dark:text-[#ffd716] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {e.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.logoUrl} alt={e.name} className="h-full w-full object-cover" />
                ) : kind === "institution" ? (
                  <Landmark size={15} />
                ) : (
                  <Building2 size={15} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white truncate">{e.name}</p>
                  {e.acronym && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9a9a]">{e.acronym}</span>}
                  {!e.published && <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c]">Draft</span>}
                </div>
                <p className="text-[11.5px] text-[#9a9a9a] truncate">
                  {e.category || "Uncategorised"}{e.location ? ` · ${e.location}` : ""}
                  {e.email ? ` · ${e.email}` : ""}
                </p>
              </div>
              <GhostButton onClick={() => openEdit(e)} aria-label={`Edit ${e.name}`}><Pencil size={14} /></GhostButton>
              <GhostButton onClick={() => setConfirmId(e.id)} aria-label={`Delete ${e.name}`}><Trash2 size={14} /></GhostButton>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editId ? "Edit entry" : `New ${CATALOGUE_KIND_NAME[form.kind].toLowerCase()}`}
        subtitle="Members see published entries on the Directory page"
        maxWidth="max-w-[560px]"
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save} disabled={pending}>{pending ? "Saving…" : "Save entry"}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={inputClass} value={form.kind} onChange={(e) => set("kind", e.target.value as CatalogueKind)}>
              {CATALOGUE_KINDS.map((k) => <option key={k} value={k}>{CATALOGUE_KIND_NAME[k]}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Uncategorised</option>
              {CATEGORIES_BY_KIND[form.kind].map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Federal Ministry of Works" />
            </Field>
          </div>
          <Field label="Acronym">
            <input className={inputClass} value={form.acronym} onChange={(e) => set("acronym", e.target.value)} placeholder="FMW" />
          </Field>
          <Field label="Location">
            <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Abuja, Nigeria" />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="info@example.gov.ng" />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 …" />
          </Field>
          <Field label="Website">
            <input className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Logo URL">
            <input className={inputClass} value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="About">
              <textarea rows={3} className={inputClass} value={form.about} onChange={(e) => set("about", e.target.value)} />
            </Field>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="accent-[#ffd716] w-4 h-4" />
            Published (visible to members)
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={remove}
        title="Delete this entry?" loading={pending}
        description="It will be removed from the Directory immediately. This cannot be undone."
      />
    </div>
  );
}