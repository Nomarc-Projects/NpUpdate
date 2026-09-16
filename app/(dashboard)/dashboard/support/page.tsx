"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, BookOpen, ShieldCheck, Package, CreditCard, Briefcase, User,
  CheckCircle2, ChevronDown, Ticket, Clock, AlertCircle, CheckCheck,
  XCircle, Paperclip, HelpCircle, MessageSquare, FileText, Search,
  ExternalLink, LifeBuoy, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { createTicket, getMyTickets, getTicketDetail, replyToTicket, type TicketRow, type TicketDetail } from "@/lib/services/support";

/* ─── ticket form data ───────────────────────────────────────────────────── */

const CATEGORIES = [
  "Billing & plans",
  "Profile & verification",
  "Jobs & hiring",
  "Products & orders",
  "Technical issue",
  "Account & privacy",
  "Other",
] as const;

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  { value: "medium", label: "Medium", color: "bg-[#fff7cc] text-[#caa400] border-[#fde68a]" },
  { value: "high",   label: "High",   color: "bg-[#fff1f2] text-[#e5484d] border-[#fecdd3]" },
] as const;

/* mock tickets removed — now using real DB via getMyTickets() */

/* ─── FAQ data ───────────────────────────────────────────────────────────── */

const FAQ_SECTIONS = [
  {
    icon: BookOpen,
    label: "Getting Started",
    color: "bg-[#dcfce7] text-[#16803c] dark:bg-[#22c55e]/15 dark:text-[#4ade80]",
    items: [
      {
        q: "How do I create a Nomarc account?",
        a: "Click Sign Up on the homepage, choose your role (Professional or Exhibitor), fill in your details, and verify your email. Your account is created instantly — you can start building your profile right away.",
      },
      {
        q: "What is the difference between Professional and Exhibitor?",
        a: "Professionals are individuals (architects, engineers, quantity surveyors, builders etc.) seeking work or networking. Exhibitors are companies and brands supplying construction materials, services, or equipment to the market.",
      },
      {
        q: "Is Nomarc free to use?",
        a: "Yes — the Free plan gives you full access to browse and basic features. Plus, Pro, and Premium plans unlock advanced tools like priority listing, verified badges, analytics, and higher limits.",
      },
    ],
  },
  {
    icon: User,
    label: "Profile & Verification",
    color: "bg-[#fce8e8] text-[#e5484d] dark:bg-[#e5484d]/15 dark:text-[#f87171]",
    items: [
      {
        q: "How do I get my profile verified?",
        a: "Go to Dashboard → KYC & Verification. Complete the identity tier (NIN or passport), then upload your professional credentials (e.g. ARCON, COREN, NIQS membership). Our team reviews submissions within 2–5 business days.",
      },
      {
        q: "What documents are accepted for verification?",
        a: "For identity: NIN slip, passport, or driver's licence. For professional credentials: your current professional body membership certificate or licence. Documents must be clear, unexpired, and in PDF or image format.",
      },
      {
        q: "Why is my profile completeness score low?",
        a: "Your score is calculated from profile sections: photo, bio, experience, education, skills, and credentials. Fill out all sections under Dashboard → Profile to maximise your visibility and attract more opportunities.",
      },
    ],
  },
  {
    icon: Briefcase,
    label: "Jobs & Hiring",
    color: "bg-[#e0e7ff] text-[#6366f1] dark:bg-[#6366f1]/15 dark:text-[#a5b4fc]",
    items: [
      {
        q: "How do I post a job on Nomarc?",
        a: "Go to Dashboard → Post a Job. Fill in the role details, requirements, location (or remote), budget, and deadline. Your listing goes live immediately on the free plan or gets a boosted slot on Pro/Premium.",
      },
      {
        q: "Can I save jobs to apply later?",
        a: "Yes — hit the bookmark icon on any job card. Saved jobs appear in Dashboard → Saved under the Jobs tab. Your bookmarks sync across devices.",
      },
      {
        q: "How do I withdraw a job application?",
        a: "Open Dashboard → Applications, find the submitted application, and click Remove. Note: some employers may have already seen your application at that point.",
      },
    ],
  },
  {
    icon: Package,
    label: "Products & Orders",
    color: "bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10 dark:text-[#fbbf24]",
    items: [
      {
        q: "How do I list a product as an Exhibitor?",
        a: "Go to Dashboard → Add New Product. Enter product details, upload images, set pricing and variants, then click Publish. Your product appears in the marketplace instantly.",
      },
      {
        q: "How does the RFQ (Request for Quote) system work?",
        a: "Buyers can request custom quotes on any product. As an Exhibitor you'll receive a notification, review the request, and respond with your pricing via Dashboard → Orders → Quotes.",
      },
      {
        q: "What happens after an order is placed?",
        a: "You'll get an email and in-app notification. Go to Dashboard → Orders to confirm, update fulfilment status, and generate the invoice. Funds are held in escrow until delivery is confirmed.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Payments & Billing",
    color: "bg-[#f3e8ff] text-[#9333ea] dark:bg-[#9333ea]/15 dark:text-[#c084fc]",
    items: [
      {
        q: "What payment methods are supported?",
        a: "Nomarc uses Paystack for secure payments — you can pay with any Nigerian debit/credit card, bank transfer, or USSD. International cards are also accepted via Paystack.",
      },
      {
        q: "How do I request a payout?",
        a: "Go to Dashboard → Wallet, add your bank account (NUBAN), and click Request Payout. Payouts process within 1–3 business days to your bank. A 1.5% processing fee applies.",
      },
      {
        q: "Can I get a refund?",
        a: "Refunds are handled case-by-case. Open a support ticket selecting 'Billing & plans' as category. For disputed orders, use the dispute button on the order detail page.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Account & Privacy",
    color: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#0369a1]/15 dark:text-[#38bdf8]",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Dashboard → Settings → Password. Enter your current password, then your new password twice. Changes take effect immediately and all other sessions are signed out.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Dashboard → Settings → Account. Scroll to the Danger Zone and click Delete Account. You'll be asked to confirm with your password. This action is permanent and cannot be reversed.",
      },
      {
        q: "Who can see my profile?",
        a: "Your public profile (name, photo, role, bio, skills, portfolio) is visible to all signed-in users. Contact details and private documents are only visible to you and Nomarc staff.",
      },
    ],
  },
];

/* ─── status config ──────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  open:        { label: "Open",        icon: AlertCircle, class: "bg-[#e0e7ff] text-[#6366f1] dark:bg-[#6366f1]/20 dark:text-[#a5b4fc]" },
  pending:     { label: "Pending",     icon: Clock,       class: "bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/15 dark:text-[#fbbf24]" },
  in_progress: { label: "In Progress", icon: Clock,       class: "bg-[#dbeafe] text-[#3b82f6] dark:bg-[#3b82f6]/15 dark:text-[#93c5fd]" },
  resolved:    { label: "Resolved",    icon: CheckCheck,  class: "bg-[#dcfce7] text-[#16a34a] dark:bg-[#22c55e]/15 dark:text-[#4ade80]" },
  closed:      { label: "Closed",      icon: XCircle,     class: "bg-[#f4f4f4] text-[#6b6b6b] dark:bg-white/5 dark:text-white/40" },
};

const PRIORITY_DOT = {
  low:    "bg-[#16a34a]",
  medium: "bg-[#caa400]",
  high:   "bg-[#e5484d]",
};

/* ─── tabs ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: "ticket", label: "New Ticket", icon: Ticket },
  { id: "history", label: "My Tickets", icon: FileText },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const;

type Tab = (typeof TABS)[number]["id"];

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("ticket");

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 max-w-[1000px]">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#ffd716] flex items-center justify-center text-[#1e1e1e]">
              <LifeBuoy size={18} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e1e1e] dark:text-white tracking-tight">
              Support Center
            </h1>
          </div>
          <p className="text-[13.5px] text-[#6b6b6b] dark:text-white/50">
            Get help, track your tickets, or browse our knowledge base.
          </p>
        </div>
        <a
          href="mailto:info@nomarcprojects.com"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#caa400] hover:underline self-start sm:self-auto"
        >
          <MessageSquare size={13} />
          info@nomarcprojects.com
        </a>
      </div>

      {/* ── tab bar ── */}
      <div className="flex gap-1 bg-[#f5f5f5] dark:bg-white/[0.05] rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
              tab === id
                ? "text-[#1e1e1e] dark:text-white"
                : "text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white"
            }`}
          >
            {tab === id && (
              <motion.span
                layoutId="support-tab-bg"
                className="absolute inset-0 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon size={15} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "ticket" && <TicketForm />}
          {tab === "history" && <TicketHistory />}
          {tab === "faq" && <FaqSection />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}

/* ─── Ticket creation form ───────────────────────────────────────────────── */

function TicketForm({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail]       = useState("");
  const [subject, setSubject]   = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [message, setMessage]   = useState("");
  const [sent, setSent]         = useState(false);
  const [busy, setBusy]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !category) {
      toast.error("Please fill in subject, category, and message.");
      return;
    }
    setBusy(true);
    try {
      await createTicket({ subject: subject.trim(), category, priority, description: message.trim(), email: email.trim() || undefined });
      setSent(true);
      toast.success("Ticket created — we'll respond within a few hours.");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-10 flex flex-col items-center text-center max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-16 h-16 rounded-2xl bg-[#dcfce7] dark:bg-[#22c55e]/15 flex items-center justify-center text-[#16a34a] mb-5"
        >
          <CheckCircle2 size={32} />
        </motion.div>
        <p className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">Ticket submitted!</p>
        <p className="text-[13px] text-[#9a9a9a] mt-1.5 leading-relaxed max-w-[280px]">
          We&apos;ve received your request and will reply to{" "}
          <span className="font-semibold text-[#1e1e1e] dark:text-white">{email || "your email"}</span> shortly.
          You can track progress in <strong>My Tickets</strong>.
        </p>
        <button
          onClick={() => { setSent(false); setSubject(""); setCategory(""); setMessage(""); }}
          className="mt-6 px-5 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/10 text-[12.5px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors"
        >
          Create another ticket
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      {/* form */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[#f0f0f0] dark:border-white/10">
          <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">Create a support ticket</p>
          <p className="text-[12.5px] text-[#9a9a9a] mt-0.5">Our team responds within a few hours during business days.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* email */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716] transition-colors"
            />
          </div>

          {/* subject */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
              Subject <span className="text-[#e5484d]">*</span>
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716] transition-colors"
            />
          </div>

          {/* category + priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
                Category <span className="text-[#e5484d]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-[#fafafa] dark:bg-[#1e1e1e] text-[13px] text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716] transition-colors appearance-none"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-colors ${
                      priority === p.value
                        ? p.color
                        : "border-[#e3e3e3] dark:border-white/10 text-[#9a9a9a] hover:border-[#d0d0d0] dark:hover:border-white/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* message */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
              Message <span className="text-[#e5484d]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail — the more context you provide, the faster we can help."
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716] transition-colors resize-none leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-[#b3b3b3]">{message.length} characters</p>
          </div>

          {/* attachment placeholder */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1.5">
              Attachment <span className="text-[#b3b3b3] font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-[#d0d0d0] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.02] text-[#b3b3b3] hover:border-[#ffd716] hover:text-[#caa400] transition-colors cursor-pointer">
              <Paperclip size={15} />
              <span className="text-[12.5px]">Click to attach a screenshot or document</span>
            </div>
          </div>

          {/* submit */}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e1e1e] dark:bg-[#ffd716] text-white dark:text-[#1e1e1e] text-[13px] font-bold hover:bg-[#333] dark:hover:bg-[#e6c114] transition-colors"
          >
            Submit ticket <Send size={14} />
          </button>
        </form>
      </div>

      {/* side panel — direct channels */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-1">Response times</p>
          <div className="space-y-3 mt-3">
            {[
              { label: "General enquiries", time: "Within 24 h" },
              { label: "Billing issues",     time: "Within 4 h" },
              { label: "Technical issues",   time: "Within 8 h" },
              { label: "Urgent / account at risk", time: "Within 2 h" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#6b6b6b] dark:text-white/50">{row.label}</span>
                <span className="font-semibold text-[#1e1e1e] dark:text-white">{row.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
          <p className="text-[13px] font-bold text-[#1e1e1e] dark:text-white mb-3">Other ways to reach us</p>
          <a
            href="mailto:info@nomarcprojects.com"
            className="flex items-center justify-between gap-2 text-[12.5px] text-[#6b6b6b] dark:text-white/50 hover:text-[#caa400] dark:hover:text-[#ffd716] transition-colors group"
          >
            <span>info@nomarcprojects.com</span>
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="mt-3 text-[11.5px] text-[#b3b3b3] leading-relaxed">
            Business hours: Mon – Fri, 9 am – 6 pm WAT. Tickets outside hours are handled next business day.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Ticket history ─────────────────────────────────────────────────────── */

function TicketHistory() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  function loadTickets() {
    setLoading(true);
    getMyTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }

  async function openTicket(id: string) {
    const detail = await getTicketDetail(id);
    if (detail) setSelectedTicket(detail);
  }

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      await replyToTicket(selectedTicket.id, replyText.trim());
      setReplyText("");
      const updated = await getTicketDetail(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch { toast.error("Failed to send reply"); }
    finally { setReplying(false); }
  }

  const filtered = tickets.filter((t) => {
    const matchSearch = `${t.subject} ${t.id} ${t.category}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">

      {/* controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716] transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "open", "pending", "resolved", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors capitalize ${
                filter === s
                  ? "bg-[#1e1e1e] dark:bg-[#ffd716] text-white dark:text-[#1e1e1e] border-transparent"
                  : "border-[#e3e3e3] dark:border-white/10 text-[#6b6b6b] dark:text-white/50 hover:border-[#d0d0d0]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ticket detail slide-over */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative z-10 w-full max-w-[440px] h-full bg-white dark:bg-[#111] shadow-2xl flex flex-col">
              {/* header */}
              <div className="px-5 pt-5 pb-3 border-b border-[#f0f0f0] dark:border-white/10 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-[#b3b3b3]">{selectedTicket.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${STATUS_CONFIG[selectedTicket.status as keyof typeof STATUS_CONFIG]?.class ?? ""}`}>
                      {STATUS_CONFIG[selectedTicket.status as keyof typeof STATUS_CONFIG]?.label ?? selectedTicket.status}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white leading-snug">{selectedTicket.subject}</h3>
                  <p className="text-[11px] text-[#9a9a9a] mt-0.5">{selectedTicket.category} · {selectedTicket.priority} priority · {selectedTicket.createdAt}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 flex-shrink-0">
                  <XCircle size={17} />
                </button>
              </div>

              {/* messages thread */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {selectedTicket.messages.length === 0 ? (
                  <p className="text-[13px] text-[#9a9a9a] text-center py-8">No messages yet — your description has been sent.</p>
                ) : (
                  selectedTicket.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        m.senderRole === "admin"
                          ? "bg-[#f5f5f5] dark:bg-white/5 rounded-bl-md"
                          : "bg-[#ffd716]/15 dark:bg-[#ffd716]/10 rounded-br-md"
                      }`}>
                        <p className="text-[11px] font-semibold text-[#9a9a9a] mb-1">
                          {m.senderRole === "admin" ? "Support" : "You"} · {m.createdAt}
                        </p>
                        <p className="text-[13px] text-[#1e1e1e] dark:text-white leading-relaxed whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* reply input */}
              {selectedTicket.status !== "closed" && (
                <div className="px-5 py-4 border-t border-[#f0f0f0] dark:border-white/10">
                  <div className="flex gap-2">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a reply…"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716]" />
                    <button onClick={handleReply} disabled={replying || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      {replying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* table card */}
      <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[13px] text-[#9a9a9a] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a] mb-3">
              <Ticket size={20} />
            </div>
            <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">{tickets.length === 0 ? "No tickets yet" : "No tickets found"}</p>
            <p className="text-[12.5px] text-[#9a9a9a] mt-1">{tickets.length === 0 ? "Create a ticket above to get help." : "Try adjusting your search or filter."}</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_140px_90px_90px_100px] gap-4 px-5 py-3 border-b border-[#f0f0f0] dark:border-white/10 text-[11.5px] font-semibold text-[#9a9a9a] uppercase tracking-wide">
              <span>Subject</span><span>Category</span><span>Priority</span><span>Status</span><span>Updated</span>
            </div>
            {filtered.map((ticket, i) => {
              const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
              const StatusIcon = status.icon;
              return (
                <motion.div key={ticket.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => openTicket(ticket.id)}
                  className="border-b border-[#f5f5f5] dark:border-white/[0.06] last:border-0 hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="hidden sm:grid grid-cols-[1fr_140px_90px_90px_100px] gap-4 px-5 py-4 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-[#b3b3b3] flex-shrink-0">{ticket.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white truncate group-hover:text-[#caa400] dark:group-hover:text-[#ffd716] transition-colors">{ticket.subject}</span>
                        {ticket.messageCount > 1 && <span className="text-[10px] text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{ticket.messageCount}</span>}
                      </div>
                    </div>
                    <span className="text-[12px] text-[#6b6b6b] dark:text-white/50 truncate">{ticket.category}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority as keyof typeof PRIORITY_DOT] ?? "bg-[#ffd716]"}`} />
                      <span className="text-[12px] text-[#6b6b6b] dark:text-white/50 capitalize">{ticket.priority}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border w-fit ${status.class}`}>
                      <StatusIcon size={11} />{status.label}
                    </span>
                    <span className="text-[12px] text-[#9a9a9a]">{ticket.updatedAt}</span>
                  </div>
                  <div className="sm:hidden px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10.5px] font-mono text-[#b3b3b3]">{ticket.id.slice(0, 8).toUpperCase()}</span>
                        <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mt-0.5 leading-snug">{ticket.subject}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border flex-shrink-0 ${status.class}`}>
                        <StatusIcon size={10} />{status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-[#9a9a9a]">
                      <span>{ticket.category}</span><span>·</span>
                      <span className="capitalize">{ticket.priority}</span><span>·</span>
                      <span>{ticket.updatedAt}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-[12px] text-[#b3b3b3]">
        <span>Showing {filtered.length} of {tickets.length} tickets</span>
        <button onClick={loadTickets} className="inline-flex items-center gap-1.5 text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    </div>
  );
}

/* ─── FAQ accordion ──────────────────────────────────────────────────────── */

function FaqSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredSections = search.trim()
    ? FAQ_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : FAQ_SECTIONS;

  return (
    <div className="space-y-5">

      {/* search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the knowledge base…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#ffd716] transition-colors"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[14px] font-bold text-[#1e1e1e] dark:text-white">No results for &ldquo;{search}&rdquo;</p>
          <p className="text-[12.5px] text-[#9a9a9a] mt-1">Try different keywords or open a ticket.</p>
        </div>
      ) : (
        filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.label} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
              {/* section header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-white/10">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${section.color}`}>
                  <Icon size={16} />
                </div>
                <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{section.label}</p>
                <span className="ml-auto text-[11px] text-[#b3b3b3]">{section.items.length} articles</span>
              </div>

              {/* accordion items */}
              <div className="divide-y divide-[#f5f5f5] dark:divide-white/[0.06]">
                {section.items.map((item) => {
                  const key = `${section.label}::${item.q}`;
                  const isOpen = openKey === key;
                  return (
                    <div key={item.q}>
                      <button
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white leading-snug group-hover:text-[#caa400] dark:group-hover:text-[#ffd716] transition-colors">
                          {item.q}
                        </span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[#9a9a9a] flex-shrink-0"
                        >
                          <ChevronDown size={16} />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="answer"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-0">
                              <p className="text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed border-l-2 border-[#ffd716] pl-3">
                                {item.a}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* footer CTA */}
      <div className="rounded-2xl border border-[#ffd716]/30 dark:border-[#ffd716]/20 bg-[#fffdf0] dark:bg-[#ffd716]/[0.05] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">Still can&apos;t find what you need?</p>
          <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/50 mt-0.5">Our support team is ready to help — create a ticket and we&apos;ll reply shortly.</p>
        </div>
        <button
          onClick={() => {
            const el = document.querySelector("[data-support-tab='ticket']");
            if (el) (el as HTMLButtonElement).click();
          }}
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e1e1e] dark:bg-[#ffd716] text-white dark:text-[#1e1e1e] text-[13px] font-bold hover:bg-[#333] dark:hover:bg-[#e6c114] transition-colors"
        >
          <Ticket size={14} />
          Open a ticket
        </button>
      </div>
    </div>
  );
}
