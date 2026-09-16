"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { LockedState } from "@/components/dashboard/kit";
import { createQuoteRequest } from "@/lib/services/rfq";
import { uploadFile } from "@/lib/upload-client";

export type QuoteModalProduct = { id: string; name: string; vendor: string; image?: string; unit?: string };

/**
 * "Request a Quote" slide-over (image 45) shared by Browse Products,
 * Product Overview drawer, the full Product PDP, and the View Exhibitor
 * screen — one place to keep the exact visual language + the Unlock Access
 * gate consistent instead of four hand-rolled copies of the same form.
 * `canRequest` mirrors the buyer's basicProfile completeness (same signal
 * `FeatureGate requires="basicProfile"` uses); when false the whole body is
 * replaced by the LockedState gate, matching "Unlock Request a Quote".
 */
export function RequestQuoteModal({
  open, onClose, product, canRequest = true,
}: {
  open: boolean; onClose: () => void; product: QuoteModalProduct | null; canRequest?: boolean;
}) {
  const [quantity, setQuantity] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  function reset() {
    setQuantity(""); setRequiredBy(""); setDeliveryLocation(""); setMessage(""); setAttachments([]);
  }
  function close() { reset(); onClose(); }

  async function send() {
    if (!product) return;
    setSending(true);
    const fullMessage = attachments.length
      ? `${message.trim()}${message.trim() ? "\n\n" : ""}Attachments:\n${attachments.map((u) => `- ${u}`).join("\n")}`
      : message.trim();
    try {
      await createQuoteRequest({ productId: product.id, quantity, requiredBy, deliveryLocation, message: fullMessage });
      toast.success("Quote request sent");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={canRequest ? "Request a Quote" : "Unlock Request a Quote"} subtitle={canRequest && product ? `${product.name} · ${product.vendor}` : undefined}>
      {!canRequest ? (
        <LockedState
          description="To request quotes and message suppliers, please complete your profile settings so exhibitors know who they are doing business with."
          cta={{ label: "Complete Profile Details", href: "/dashboard/profile" }}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Quantity" hint="Optional">
              <input className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={`e.g. 50 ${product?.unit ?? "units"}`} />
            </Field>
            <Field label="Required By" hint="Optional">
              <DatePicker value={requiredBy} onChange={setRequiredBy} placeholder="Select timeline…" />
            </Field>
          </div>
          <Field label="Delivery location" hint="Optional">
            <input className={inputClass} value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Project site address" />
          </Field>
          <Field label="Message / Additional Details" hint={`${message.length}/2,000`}>
            <textarea rows={4} maxLength={2000} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Specify your exact requirements, delivery location, or ask technical questions…" />
          </Field>
          <Field label="Attachments" hint="Optional">
            <FileUpload multiple accept="*" maxSizeMB={20} label="Browse files…" hint="Brochures, technical spec sheets, or other files as applicable" upload={(f) => uploadFile(f, "doc")} onChange={(items) => setAttachments(items.filter((i) => i.url && !i.error).map((i) => i.url!))} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton onClick={close}>Cancel</GhostButton>
            <PrimaryButton disabled={sending || !product} onClick={send}>{sending ? "Sending…" : "Send Request"}</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
