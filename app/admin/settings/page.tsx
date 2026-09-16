"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Mail, Globe, ShieldCheck, Zap, CreditCard, Bell, Database,
  ChevronDown, Save, Palette, Cloud, FileText, Server,
  Users, Lock, Send, RefreshCw, ToggleLeft, Wrench, Bot, Activity,
  HardDrive, Download, Upload, Trash2, AlertCircle,
} from "lucide-react";
import { DashBanner, BannerContent } from "@/components/dashboard/dash-banner";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

/* ─── Reusable primitives ─────────────────────────────────────────────── */

const inputClass = "w-full rounded-xl border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-[#111] px-3.5 py-2.5 text-sm text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-[#ffd716] transition-colors";

function Card({ id, icon: Icon, title, desc, children, defaultOpen = false, action }: {
  id: string; icon: typeof Mail; title: string; desc: string; children: React.ReactNode; defaultOpen?: boolean; action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-[#fff7cc] dark:bg-[#ffd716]/10 flex items-center justify-center text-[#b89500] flex-shrink-0">
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-bold text-[#1e1e1e] dark:text-white">{title}</p>
          <p className="text-[12px] text-[#9a9a9a] truncate">{desc}</p>
        </div>
        {action && <div className="flex-shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>{action}</div>}
        <ChevronDown size={16} className={cn("text-[#c0c0c0] transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-[#f0f0f0] dark:border-white/10 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ icon: Icon, label, desc, value, badge, children }: {
  icon: typeof Mail; label: string; desc: string; value?: string; badge?: { text: string; color: string }; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a] flex-shrink-0"><Icon size={15} /></div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{label}</p>
          <p className="text-[12px] text-[#9a9a9a] truncate">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", badge.color)}>{badge.text}</span>}
        {value && <span className="text-[12px] font-medium text-[#6b6b6b] dark:text-white/60">{value}</span>}
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, desc, icon: Icon, enabled, onChange }: {
  label: string; desc: string; icon: typeof Zap; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] dark:bg-white/5 flex items-center justify-center text-[#9a9a9a] flex-shrink-0"><Icon size={15} /></div>
        <div><p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{label}</p><p className="text-[12px] text-[#9a9a9a]">{desc}</p></div>
      </div>
      <button onClick={() => onChange(!enabled)} className={cn("w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0", enabled ? "bg-[#22c55e]" : "bg-[#e3e3e3] dark:bg-white/10")}>
        <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all", enabled ? "left-[22px]" : "left-[3px]")} />
      </button>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <motion.button onClick={onClick} disabled={busy} whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold hover:bg-[#e6c114] disabled:opacity-50 transition-colors">
      {busy ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} {busy ? "Saving…" : "Save changes"}
    </motion.button>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  const [fromName, setFromName] = useState("Nomarc Projects");
  const [fromEmail, setFromEmail] = useState("info@nomarcprojects.com");
  const [replyTo, setReplyTo] = useState("support@nomarcprojects.com");

  // Feature flags (presentational — will wire to DB later)
  const [flags, setFlags] = useState({
    projectManagement: true, templates: true, aiConsultant: false,
    bimTools: false, pushNotifications: true, emailNotifications: false,
    marketplace: true, rfq: true, messaging: true,
  });
  const toggleFlag = (key: keyof typeof flags) => setFlags((f) => ({ ...f, [key]: !f[key] }));

  function saveEmail() {
    toast.success("Sender identity updated (demo mode — set RESEND_FROM in Doppler for production)");
  }

  function sendTestEmail() {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      { loading: "Sending test email…", success: "Test email sent to admin@nomarcprojects.com", error: "Failed to send" }
    );
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8 max-w-[900px] mx-auto">
      <DashBanner image={r2Url("site/photo-1504307651254-35680f356dfd.jpg")}>
        <BannerContent eyebrow="Settings" title="Platform Settings" subtitle="System configuration, integrations, email, and feature flags." />
      </DashBanner>

      <div className="mt-5 space-y-3">

        {/* ── 1. Platform ──────────────────────────────── */}
        <Card id="platform" icon={Globe} title="Platform" desc="Site URL, deployment, and database" defaultOpen>
          <Row icon={Globe} label="Site URL" desc="Primary domain served to users" value="www.nomarcprojects.com" />
          <Row icon={Server} label="Vercel deployment" desc="Auto-deploys from main branch"
            badge={{ text: "Live", color: "bg-[#dcfce7] text-[#16803c]" }} value="www.nomarcprojects.com" />
          <Row icon={Database} label="CockroachDB" desc="Managed cluster — Drizzle ORM"
            badge={{ text: "Healthy", color: "bg-[#dcfce7] text-[#16803c]" }} value="Connected" />
          <Row icon={HardDrive} label="Secrets manager" desc="All env vars synced via Doppler" value="nomarc / prd"
            badge={{ text: "Synced", color: "bg-[#dcfce7] text-[#16803c]" }} />
        </Card>

        {/* ── 2. Authentication ────────────────────────── */}
        <Card id="auth" icon={ShieldCheck} title="Authentication" desc="Login methods, sessions, and security">
          <Row icon={Lock} label="Email & password" desc="Users register and log in with email"
            badge={{ text: "Active", color: "bg-[#dcfce7] text-[#16803c]" }} value="Enabled" />
          <Row icon={ShieldCheck} label="Google OAuth" desc="GOOGLE_CLIENT_ID in Doppler"
            badge={{ text: "Not configured", color: "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]" }} />
          <Row icon={ShieldCheck} label="Email verification" desc="Require verified email before dashboard access" value="Enabled (Resend)" />
          <Row icon={Lock} label="Session duration" desc="How long a login session stays active" value="7 days" />
          <Row icon={Lock} label="Password policy" desc="Minimum 8 characters required" value="8+ chars" />
          <div className="mt-3 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-3.5">
            <p className="text-[12px] text-[#9a9a9a]"><AlertCircle size={12} className="inline mr-1.5 text-[#ffd716]" />Google OAuth requires creating a Google Cloud project and adding the client ID/secret to Doppler.</p>
          </div>
        </Card>

        {/* ── 3. Email (Resend) ─────────────────────────── */}
        <Card id="email" icon={Mail} title="Email (Resend)" desc="Outbound email provider for verification, notifications, and campaigns"
          action={<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#16803c]">Configured</span>}>
          <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-4 mb-4">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Resend API key</p>
            <p className="text-[12px] text-[#9a9a9a] mt-0.5">Set via Doppler — <span className="code">RESEND_API_KEY</span> (from the Resend dashboard). The <span className="code">RESEND_FROM</span> sender must be a domain verified in Resend (SPF/DKIM).</p>
          </div>

          <div className="border-t border-[#f0f0f0] dark:border-white/10 pt-3 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-3">Sender identity</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldGroup label="From Name">
                <input className={inputClass} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Nomarc Projects" />
              </FieldGroup>
              <FieldGroup label="From Email">
                <input className={inputClass} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="info@nomarcprojects.com" />
              </FieldGroup>
              <FieldGroup label="Reply-To">
                <input className={inputClass} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@nomarcprojects.com" />
              </FieldGroup>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SaveBtn onClick={saveEmail} busy={false} />
            <button onClick={sendTestEmail} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[12.5px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:border-[#ffd716] transition-colors">
              <Send size={13} /> Send test email
            </button>
          </div>
        </Card>

        {/* ── 4. Email Templates ───────────────────────── */}
        <Card id="templates" icon={FileText} title="Email Templates" desc="Drag-and-drop email builder for transactional and marketing emails">
          <div className="space-y-2">
            {[
              { name: "Welcome Email", trigger: "welcome", status: "not configured" },
              { name: "Password Reset", trigger: "password_reset", status: "not configured" },
              { name: "Email Verification", trigger: "email_verification", status: "not configured" },
              { name: "Order Confirmation", trigger: "order_confirmation", status: "not configured" },
              { name: "Payout Notification", trigger: "payout_notification", status: "not configured" },
              { name: "New Quote Request", trigger: "quote_request", status: "not configured" },
              { name: "Job Application", trigger: "job_application", status: "not configured" },
              { name: "KYC Approved", trigger: "kyc_approved", status: "not configured" },
            ].map((t) => (
              <div key={t.trigger} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
                <div>
                  <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{t.name}</p>
                  <p className="text-[11px] text-[#b3b3b3] font-mono">{t.trigger}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]">{t.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-4 text-center">
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-1">Email Builder</p>
            <p className="text-[12px] text-[#9a9a9a] mb-3">Visual drag-and-drop editor with Nomarc-branded blocks, merge tags, and mobile preview.</p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[12.5px] font-bold cursor-not-allowed opacity-60">
              <Wrench size={13} /> Coming soon
            </span>
          </div>
        </Card>

        {/* ── 5. Notifications ─────────────────────────── */}
        <Card id="notifications" icon={Bell} title="Notifications" desc="In-app, email, and push notification preferences">
          <Toggle icon={Bell} label="In-app notifications" desc="Show notification bell in the dashboard header" enabled={true} onChange={() => toast("In-app notifications are always on")} />
          <Toggle icon={Mail} label="Email notifications" desc="Send email for important events (orders, quotes, messages)" enabled={flags.emailNotifications} onChange={() => toggleFlag("emailNotifications")} />
          <Toggle icon={Bell} label="Push notifications" desc="Browser push notifications for real-time alerts" enabled={flags.pushNotifications} onChange={() => toggleFlag("pushNotifications")} />
          <div className="mt-3 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-3.5">
            <p className="text-[12px] text-[#9a9a9a]"><AlertCircle size={12} className="inline mr-1.5 text-[#ffd716]" />Email notifications are sent via Resend (set RESEND_API_KEY in Doppler).</p>
          </div>
        </Card>

        {/* ── 6. Appearance ────────────────────────────── */}
        <Card id="appearance" icon={Palette} title="Appearance" desc="Branding, colours, and theme settings">
          <Row icon={Palette} label="Primary colour" desc="Brand yellow used across all UI surfaces" value="#ffd716">
            <div className="w-6 h-6 rounded-full border border-[#e3e3e3] dark:border-white/15 flex-shrink-0" style={{ background: "#ffd716" }} />
          </Row>
          <Row icon={Palette} label="Ink colour" desc="Primary text and dark surface colour" value="#1e1e1e">
            <div className="w-6 h-6 rounded-full border border-[#e3e3e3] dark:border-white/15 flex-shrink-0" style={{ background: "#1e1e1e" }} />
          </Row>
          <Row icon={Palette} label="Theme" desc="Light/dark mode follows system preference" value="System (class strategy)" />
          <Row icon={Globe} label="Logo variants" desc="Wordmark and mark for light, dark, and yellow backgrounds" value="8 variants in /public/logos/" />
          <Row icon={Palette} label="Favicon" desc="Yellow Nomarc emblem as app/icon.png" value="Configured" />
        </Card>

        {/* ── 7. Feature Flags ─────────────────────────── */}
        <Card id="features" icon={ToggleLeft} title="Feature Flags" desc="Enable or disable platform features">
          <Toggle icon={Zap} label="Marketplace (Products + Shop)" desc="Product listings, catalog browsing, and buy-now flow" enabled={flags.marketplace} onChange={() => toggleFlag("marketplace")} />
          <Toggle icon={Zap} label="RFQ System" desc="Quote requests from buyers to exhibitors" enabled={flags.rfq} onChange={() => toggleFlag("rfq")} />
          <Toggle icon={Zap} label="Messaging" desc="Real-time chat between users" enabled={flags.messaging} onChange={() => toggleFlag("messaging")} />
          <Toggle icon={Zap} label="Project Management" desc="Kanban boards and task tracking — Plus/Pro/Premium" enabled={flags.projectManagement} onChange={() => toggleFlag("projectManagement")} />
          <Toggle icon={Zap} label="Business Templates" desc="Professional document templates library" enabled={flags.templates} onChange={() => toggleFlag("templates")} />
          <Toggle icon={Bot} label="AI Consultant" desc="Construction AI assistant — coming soon" enabled={flags.aiConsultant} onChange={() => toggleFlag("aiConsultant")} />
          <Toggle icon={Zap} label="BIM Tools" desc="Building Information Modelling viewer — coming soon" enabled={flags.bimTools} onChange={() => toggleFlag("bimTools")} />
          <div className="mt-3">
            <SaveBtn onClick={() => toast.success("Feature flags saved (demo — will persist to DB when settings table is wired)")} busy={false} />
          </div>
        </Card>

        {/* ── 8. Billing & Payments ────────────────────── */}
        <Card id="billing" icon={CreditCard} title="Billing & Payments" desc="Payment providers, commission rates, and plan pricing">
          <Row icon={CreditCard} label="Paystack" desc="Primary payment processor — Nigerian Naira"
            badge={{ text: "Pending keys", color: "bg-[#fff3cd] text-[#b45309]" }} />
          <Row icon={CreditCard} label="Seerbit" desc="Backup payment gateway" value="Credentials available"
            badge={{ text: "Not integrated", color: "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]" }} />
          <Row icon={CreditCard} label="Commission rate" desc="Marketplace take-rate on exhibitor sales" value="10%" />
          <div className="mt-3 border-t border-[#f0f0f0] dark:border-white/10 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-2">Plan pricing</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: "Free", price: "₦0" },
                { name: "Plus", price: "₦5,000/mo" },
                { name: "Pro", price: "₦12,000/mo" },
                { name: "Premium", price: "₦25,000/mo" },
              ].map((p) => (
                <div key={p.name} className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-3 text-center">
                  <p className="text-[11px] font-bold text-[#9a9a9a] uppercase">{p.name}</p>
                  <p className="text-[14px] font-black text-[#1e1e1e] dark:text-white mt-0.5">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── 9. Storage ───────────────────────────────── */}
        <Card id="storage" icon={Cloud} title="Storage" desc="File uploads, media, and object storage">
          <Row icon={Cloud} label="Cloudflare R2" desc="Object storage for uploads, attachments, and media"
            badge={{ text: "R2_ACCOUNT_ID set", color: "bg-[#fff3cd] text-[#b45309]" }} />
          <Row icon={Database} label="R2 Access Key" desc="R2_ACCESS_KEY_ID in Doppler prd config" value="Pending" />
          <Row icon={Database} label="R2 Bucket" desc="Bucket name for production assets" value="nomarc-assets" />
          <Row icon={Database} label="Public URL" desc="CDN URL for serving uploaded files" value="Not configured" />
        </Card>

        {/* ── 10. Backups & Data ────────────────────────── */}
        <Card id="backups" icon={HardDrive} title="Backups & Data" desc="Database exports and data management">
          <div className="space-y-2.5">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors text-left"
              onClick={() => toast.info("Database export would be triggered here")}>
              <Download size={16} className="text-[#9a9a9a]" />
              <div>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Export database</p>
                <p className="text-[11px] text-[#9a9a9a]">Download all tables as CSV or JSON</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e3e3e3] dark:border-white/15 hover:border-[#ffd716] transition-colors text-left"
              onClick={() => toast.info("User data export would be triggered here")}>
              <Users size={16} className="text-[#9a9a9a]" />
              <div>
                <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Export users</p>
                <p className="text-[11px] text-[#9a9a9a]">All users with roles, plans, and join dates</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 hover:border-red-400 transition-colors text-left"
              onClick={() => toast.error("Purge is disabled in production")}>
              <Trash2 size={16} className="text-red-400" />
              <div>
                <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Purge demo data</p>
                <p className="text-[11px] text-[#9a9a9a]">Remove all seed/demo records (keeps 4 test accounts)</p>
              </div>
            </button>
          </div>
        </Card>

        {/* ── 11. AI Features ──────────────────────────── */}
        <Card id="ai" icon={Bot} title="AI Features" desc="AI consultant, RAG pipeline, and model configuration">
          <Row icon={Bot} label="AI Model" desc="Self-hosted or API-based language model" value="Not configured"
            badge={{ text: "Deferred", color: "bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a]" }} />
          <Row icon={Database} label="Vector database" desc="PostgreSQL + pgvector for semantic search (RAG)" value="Not deployed" />
          <Row icon={Bot} label="Query limits" desc="Free: 5/day · Plus: 50/day · Pro: 200/day · Premium: Unlimited" />
          <div className="mt-3 rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-3.5">
            <p className="text-[12px] text-[#9a9a9a]"><AlertCircle size={12} className="inline mr-1.5 text-[#ffd716]" />AI features require Oracle Cloud VM deployment. See <span className="font-mono text-[11px]">plans/INFRASTRUCTURE-AI-INTEGRATION-PLAN.md</span></p>
          </div>
        </Card>

        {/* ── 12. Service Health ────────────────────────── */}
        <Card id="health" icon={Activity} title="Service Health" desc="Status of external services and integrations">
          {[
            { label: "Vercel (Frontend)", status: "Operational", ok: true },
            { label: "CockroachDB", status: "Connected", ok: true },
            { label: "Doppler (Secrets)", status: "Synced", ok: true },
            { label: "Resend (Email)", status: "Configured", ok: true },
            { label: "Paystack", status: "Pending keys", ok: false },
            { label: "Cloudflare R2", status: "Partial (account ID set)", ok: false },
            { label: "Google OAuth", status: "Not configured", ok: false },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-[#f5f5f5] dark:border-white/5 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", s.ok ? "bg-[#22c55e]" : "bg-[#f59e0b]")} />
                <span className="text-[13px] font-medium text-[#1e1e1e] dark:text-white">{s.label}</span>
              </div>
              <span className={cn("text-[12px] font-medium", s.ok ? "text-[#16a34a]" : "text-[#9a9a9a]")}>{s.status}</span>
            </div>
          ))}
        </Card>

        {/* footer info */}
        <div className="rounded-xl bg-[#fafafa] dark:bg-white/[0.03] border border-[#ececec] dark:border-white/10 p-4">
          <p className="text-[12px] font-semibold text-[#1e1e1e] dark:text-white mb-1">Configuration guide</p>
          <p className="text-[12px] text-[#9a9a9a] leading-relaxed">
            Secrets are managed in <span className="font-mono bg-[#f0f0f0] dark:bg-white/10 px-1 rounded text-[11px]">Doppler → nomarc → prd</span>.
            Feature flags will persist to a settings table once wired. Resend, Paystack, and R2 credentials should be added to Doppler — the inputs above are for reference and testing.
          </p>
        </div>
      </div>
    </div>
  );
}
