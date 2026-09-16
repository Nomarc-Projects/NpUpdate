"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Star, Trash2, Pencil, X, CheckCircle2, Home, Building2, Briefcase } from "lucide-react";
import { DashBanner, BannerContent, bannerPrimaryBtn } from "@/components/dashboard/dash-banner";
import { toast } from "sonner";
import { saveAddress, deleteAddress, setDefaultAddress, type SavedAddress } from "@/lib/services/addresses";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const LABEL_ICONS: Record<string, typeof Home> = { Home, Office: Building2, Site: Briefcase };
const LABEL_OPTS = ["Home", "Office", "Site", "Warehouse", "Other"];

const inp = "w-full rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#111] px-3.5 py-2.5 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#aaa] outline-none focus:border-[#ffd716] dark:focus:border-[#ffd716] transition-colors";

function AddressCard({ addr, onEdit, onDelete, onSetDefault }: {
  addr: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const LabelIcon = LABEL_ICONS[addr.label] ?? MapPin;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "relative rounded-2xl border bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 transition-shadow hover:shadow-sm",
        addr.isDefault
          ? "border-[#ffd716] dark:border-[#ffd716]/50"
          : "border-[#ececec] dark:border-white/10"
      )}
    >
      {addr.isDefault && (
        <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#8a7400] bg-[#ffd716]/15 px-2 py-0.5 rounded-full">
          <Star size={10} fill="currentColor" /> Default
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#ffd716]/10 flex items-center justify-center flex-shrink-0">
          <LabelIcon size={16} className="text-[#caa400]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white">{addr.label || "Address"}</p>
          <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/60 mt-0.5 leading-relaxed">
            {addr.address}
            {addr.city && `, ${addr.city}`}
            {addr.state && `, ${addr.state}`}
          </p>
          {addr.phone && (
            <p className="text-[12px] text-[#9a9a9a] mt-1">{addr.phone}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f0f0f0] dark:border-white/10">
        {!addr.isDefault && (
          <button
            onClick={onSetDefault}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
          >
            <CheckCircle2 size={14} /> Set as default
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg hover:bg-[#fee2e2] dark:hover:bg-[#ef4444]/10 flex items-center justify-center text-[#9a9a9a] hover:text-[#ef4444] transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

type FormData = { label: string; address: string; city: string; state: string; country: string; phone: string; isDefault: boolean };
const blank: FormData = { label: "Home", address: "", city: "", state: "", country: "Nigeria", phone: "", isDefault: false };

function AddressModal({ open, addr, onClose, onSaved }: {
  open: boolean;
  addr: SavedAddress | null;
  onClose: () => void;
  onSaved: (a: SavedAddress) => void;
}) {
  const [form, setForm] = useState<FormData>(addr ? {
    label: addr.label, address: addr.address, city: addr.city,
    state: addr.state, country: addr.country || "Nigeria", phone: addr.phone, isDefault: addr.isDefault,
  } : blank);
  const [saving, setSaving] = useState(false);

  function upd(k: keyof FormData, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim()) { toast.error("Address is required"); return; }
    setSaving(true);
    const res = await saveAddress({ id: addr?.id, ...form });
    setSaving(false);
    if (!res.ok) { toast.error(res.error ?? "Failed to save"); return; }
    toast.success(addr ? "Address updated" : "Address saved");
    onSaved({ id: addr?.id ?? crypto.randomUUID(), ...form });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative z-10 w-full sm:max-w-[480px] bg-white dark:bg-[#1e1e1e] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f0f0] dark:border-white/10">
              <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">
                {addr ? "Edit address" : "Add new address"}
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex items-center justify-center text-[#9a9a9a]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              {/* Label chips */}
              <div>
                <label className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-2 block">Label</label>
                <div className="flex flex-wrap gap-2">
                  {LABEL_OPTS.map((l) => (
                    <button
                      key={l} type="button"
                      onClick={() => upd("label", l)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all",
                        form.label === l
                          ? "bg-[#1e1e1e] dark:bg-white border-[#1e1e1e] dark:border-white text-white dark:text-[#1e1e1e]"
                          : "border-[#e3e3e3] dark:border-white/15 text-[#6b6b6b] dark:text-white/60 hover:border-[#1e1e1e] dark:hover:border-white/40"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-1.5 block">Street address</label>
                <input
                  className={inp} placeholder="12 Adeola Street, Victoria Island"
                  value={form.address} onChange={(e) => upd("address", e.target.value)} required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-1.5 block">City</label>
                  <input className={inp} placeholder="Lagos" value={form.city} onChange={(e) => upd("city", e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-1.5 block">State</label>
                  <select className={inp} value={form.state} onChange={(e) => upd("state", e.target.value)}>
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-1.5 block">Phone number</label>
                <input
                  className={inp} placeholder="+234 801 234 5678" type="tel"
                  value={form.phone} onChange={(e) => upd("phone", e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox" checked={form.isDefault} onChange={(e) => upd("isDefault", e.target.checked)}
                  className="w-4 h-4 accent-[#ffd716]"
                />
                <span className="text-[13px] text-[#6b6b6b] dark:text-white/60 group-hover:text-[#1e1e1e] dark:group-hover:text-white transition-colors">
                  Set as default address
                </span>
              </label>

              <button
                type="submit" disabled={saving}
                className="w-full py-3 rounded-xl bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {saving ? "Saving…" : addr ? "Save changes" : "Add address"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function AddressBook({ initialAddresses }: { initialAddresses: SavedAddress[] }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(initialAddresses);
  const [modal, setModal] = useState<{ open: boolean; editing: SavedAddress | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<string | null>(null);

  function openAdd() { setModal({ open: true, editing: null }); }
  function openEdit(a: SavedAddress) { setModal({ open: true, editing: a }); }
  function closeModal() { setModal({ open: false, editing: null }); }

  function onSaved(a: SavedAddress) {
    setAddresses((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      const updated = a.isDefault ? prev.map((x) => ({ ...x, isDefault: false })) : [...prev];
      if (idx >= 0) { updated[idx] = a; return updated; }
      return [...updated, a];
    });
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await deleteAddress(id);
    setDeleting(null);
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Address removed");
    setAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      if (prev.find((a) => a.id === id)?.isDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
  }

  async function handleSetDefault(id: string) {
    const res = await setDefaultAddress(id);
    if (!res.ok) { toast.error("Failed"); return; }
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success("Default address updated");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[860px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent
          eyebrow="Addresses"
          title="Address Book"
          subtitle="Manage your delivery and billing addresses."
          actions={
            addresses.length < 5 ? (
              <button onClick={openAdd} className={bannerPrimaryBtn}>
                <Plus size={15} /> Add address
              </button>
            ) : undefined
          }
        />
      </DashBanner>
      <div className="mt-5" />

      {addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e] flex flex-col items-center justify-center text-center py-20 px-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#ffd716]/10 flex items-center justify-center mb-4">
            <MapPin size={24} className="text-[#caa400]" />
          </div>
          <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">No saved addresses yet</h2>
          <p className="text-[13px] text-[#9a9a9a] mt-1 max-w-xs">
            Add a delivery address to speed up your checkout process.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:brightness-95 transition-all"
          >
            <Plus size={15} /> Add first address
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                addr={a}
                onEdit={() => openEdit(a)}
                onDelete={() => handleDelete(a.id)}
                onSetDefault={() => handleSetDefault(a.id)}
              />
            ))}
            {addresses.length < 5 && (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={openAdd}
                className="rounded-2xl border-2 border-dashed border-[#e3e3e3] dark:border-white/10 hover:border-[#ffd716] dark:hover:border-[#ffd716]/50 hover:bg-[#ffd716]/5 flex flex-col items-center justify-center gap-2 py-10 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] dark:bg-white/5 group-hover:bg-[#ffd716]/15 flex items-center justify-center transition-colors">
                  <Plus size={18} className="text-[#9a9a9a] group-hover:text-[#caa400] transition-colors" />
                </div>
                <span className="text-[12.5px] font-semibold text-[#9a9a9a] group-hover:text-[#1e1e1e] dark:group-hover:text-white transition-colors">
                  Add address ({addresses.length}/5)
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 shadow-xl text-[13px] text-[#9a9a9a]">Removing…</div>
        </div>
      )}

      <AddressModal
        open={modal.open}
        addr={modal.editing}
        onClose={closeModal}
        onSaved={onSaved}
      />
    </div>
  );
}
