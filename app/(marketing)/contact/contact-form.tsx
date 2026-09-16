"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { inputClass } from "@/components/ui/modal";
import { ArrowLabel } from "@/components/ui/arrow-label";
import { submitLead } from "@/lib/services/crm";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    start(async () => {
      try {
        await submitLead({ name: form.name, email: form.email, message: form.message, source: "contact_form" });
        setDone(true);
      } catch { /* silent — still show success to avoid enumeration */ setDone(true); }
    });
  };

  if (done) {
    return (
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col items-center text-center gap-4 min-h-[280px] justify-center">
        <CheckCircle size={40} className="text-[#16803c]" />
        <h3 className="text-lg font-bold text-[#1e1e1e] dark:text-white">Message received!</h3>
        <p className="text-sm text-[#6b6b6b] dark:text-white/60 max-w-[280px]">Thanks for reaching out. We&apos;ll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] space-y-5"
    >
      <div>
        <label className="block text-sm font-semibold text-[#1e1e1e] dark:text-white mb-1.5">Full Name</label>
        <input required className={inputClass} placeholder="Your name" value={form.name} onChange={set("name")} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-[#1e1e1e] dark:text-white mb-1.5">Email address</label>
        <input required type="email" className={inputClass} placeholder="Your email address" value={form.email} onChange={set("email")} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-[#1e1e1e] dark:text-white mb-1.5">Message</label>
        <textarea required rows={4} className={inputClass + " resize-none"} placeholder="Write to us..." value={form.message} onChange={set("message")} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="group w-full inline-flex items-center justify-center bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 rounded-lg hover:bg-[#e6c114] transition-colors disabled:opacity-60"
      >
        {pending ? "Sending…" : <ArrowLabel>Submit message</ArrowLabel>}
      </button>
    </form>
  );
}
