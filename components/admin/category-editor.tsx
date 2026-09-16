"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Trash2 } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { updateTerm, type Term } from "@/lib/services/taxonomy";

/**
 * Rename a taxonomy term and give it the picture its storefront card shows.
 *
 * `showImage` is off for the kinds that never render as a card (skills,
 * occupations, regulatory bodies…) — an image field there would collect an
 * asset nothing on the site would ever display.
 */
export function CategoryEditor({
  term,
  label,
  showImage,
  onClose,
  onSaved,
}: {
  term: Term;
  /** Singular noun for this taxonomy kind, e.g. "Product category". */
  label: string;
  showImage: boolean;
  onClose: () => void;
  onSaved: (next: Term) => void;
}) {
  const [name, setName] = useState(term.name);
  const [imageUrl, setImageUrl] = useState(term.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = name.trim();
    if (!n) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await updateTerm(term.id, n, imageUrl);
      onSaved({ ...term, name: n, imageUrl });
      toast.success("Saved");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${label.toLowerCase()}`}
      subtitle={showImage ? "The name and image buyers see on the Exhibition Hub." : "The name this term shows under."}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={label}
            autoFocus
          />
        </Field>

        {showImage && (
          <Field label="Category image" hint="Optional">
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#ececec] dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="w-full aspect-[4/3] object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[#e5484d] transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <FileUpload
                accept="image/png,image/jpeg,image/webp"
                maxSizeMB={5}
                label="Upload a category image"
                hint="Shown on the hub's category cards. Without one, a photo from a product in this category is used."
                upload={async (f) => {
                  setUploading(true);
                  try { return await uploadFile(f, "product"); }
                  finally { setUploading(false); }
                }}
                onChange={(items) => { const u = items[0]?.url; if (u) setImageUrl(u); }}
              />
            )}
            {uploading && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#9a9a9a] dark:text-white/45">
                <ImageIcon size={12} /> Uploading…
              </p>
            )}
          </Field>
        )}
      </div>
    </Modal>
  );
}
