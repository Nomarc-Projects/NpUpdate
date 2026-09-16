"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Mail, Phone, Linkedin, Instagram, Facebook, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/services/crm";

const contactSocials = [
  { label: "Twitter", Icon: Twitter, href: "#" },
  { label: "LinkedIn", Icon: Linkedin, href: "#" },
  { label: "Instagram", Icon: Instagram, href: "#" },
  { label: "Facebook", Icon: Facebook, href: "#" },
];

function HomeContactForm() {
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try {
        await submitLead({ name: f.name, email: f.email, message: f.message, source: "contact_form" });
        setDone(true);
      } catch {
        setDone(true);
      }
    });
  };
  const inputCls =
    "w-full border border-[#e2e2e2] rounded-lg px-4 py-3 text-sm text-[#1e1e1e] placeholder:text-[#b5b5b5] focus:outline-none focus:border-[#ffd716] transition-colors";
  if (done)
    return (
      <div className="bg-white rounded-2xl p-7 md:p-8 flex flex-col items-center justify-center text-center min-h-[320px] gap-4">
        <Check size={36} className="text-[#16803c]" />
        <h3 className="text-lg font-bold text-[#1e1e1e]">Message received!</h3>
        <p className="text-sm text-[#6b6b6b] max-w-[240px]">We&apos;ll get back to you as soon as possible.</p>
      </div>
    );
  return (
    <div className="bg-white rounded-2xl p-7 md:p-8">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-[14px] font-semibold text-[#1e1e1e] mb-2">Full Name</label>
          <input required className={inputCls} placeholder="Your name" value={f.name} onChange={set("name")} />
        </div>
        <div>
          <label className="block text-[14px] font-semibold text-[#1e1e1e] mb-2">Email address</label>
          <input required type="email" className={inputCls} placeholder="Your email address" value={f.email} onChange={set("email")} />
        </div>
        <div>
          <label className="block text-[14px] font-semibold text-[#1e1e1e] mb-2">Message</label>
          <textarea required rows={5} className={inputCls + " resize-none"} placeholder="Write to us..." value={f.message} onChange={set("message")} />
        </div>
        <Button type="submit" disabled={pending} variant="primary" className="w-full">
          {pending ? "Sending…" : "Submit message"}
        </Button>
      </form>
    </div>
  );
}

export function ContactSection() {
  return (
    <section className="bg-[#1e1e1e] py-20 px-6 md:px-10 lg:px-14">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* left */}
        <div>
          <h2 className="text-4xl md:text-[42px] font-bold text-[#ffd716] tracking-tight mb-4">Let&apos;s get in touch</h2>
          <p className="text-[#9a9a9a] text-[15px] leading-relaxed mb-10 max-w-[360px]">
            Do you have general enquires or need support? Please send us a message
          </p>

          <div className="space-y-5 mb-14">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-lg bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-[#1e1e1e]" />
              </span>
              <div>
                <p className="text-[12px] text-[#777]">Email Address</p>
                <p className="text-white text-[15px] font-medium">info@nomarcprojects.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-lg bg-[#ffd716] flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-[#1e1e1e]" />
              </span>
              <div>
                <p className="text-[12px] text-[#777]">Phone Number</p>
                <p className="text-white text-[15px] font-medium">+234 916 125 7901</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-[#777] uppercase tracking-[0.18em] mb-4">Our social profiles</p>
          <div className="flex gap-4">
            {contactSocials.map(({ label, Icon, href }) => (
              <Link key={label} href={href} aria-label={label} className="text-[#ffd716] hover:text-white transition-colors">
                <Icon size={20} />
              </Link>
            ))}
          </div>
        </div>

        {/* right: form card */}
        <HomeContactForm />
      </div>
    </section>
  );
}
