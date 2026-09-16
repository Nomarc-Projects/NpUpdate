"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, Clock, Upload, CheckCircle2, CreditCard,
  Building2, User, X, Loader2, ChevronRight, ChevronLeft, BadgeCheck,
  Lock, AlertTriangle, ArrowRight, Info, Search, MapPin, ChevronDown, HelpCircle,
} from "lucide-react";
import { FileUpload, type UploadItem } from "@/components/ui/file-upload";
import { uploadFile } from "@/lib/upload-client";
import { inputClass } from "@/components/ui/modal";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/kit/status-badge";
import { submitKycDoc, type KycState, type TierState } from "@/lib/services/kyc";
import { ID_TYPES, validateIdNumber } from "@/lib/constants/id-types";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

const ADDRESS_PROOF_TYPES = [
  { value: "utility_bill",        label: "Utility Bill (NEPA / Water / Gas)" },
  { value: "bank_statement",      label: "Bank Statement" },
  { value: "internet_bill",       label: "Internet Service Provider Bill" },
  { value: "tenancy_agreement",   label: "Tenancy Agreement / Lease" },
  { value: "rate_assessment",     label: "Rate Assessment Certificate" },
  { value: "govt_letter",         label: "Government Correspondence" },
];

const PROFESSIONAL_BODIES = [
  { value: "ARCON",  label: "ARCON — Architects Registration Council of Nigeria" },
  { value: "COREN",  label: "COREN — Council for the Regulation of Engineering in Nigeria" },
  { value: "NIQS",   label: "NIQS — Nigerian Institute of Quantity Surveyors" },
  { value: "NIOB",   label: "NIOB — Nigerian Institute of Building" },
  { value: "NIA",    label: "NIA — Nigerian Institute of Architects" },
  { value: "NIESV",  label: "NIESV — Nigerian Institution of Estate Surveyors & Valuers" },
  { value: "TOPREC", label: "TOPREC — Town Planners Registration Council of Nigeria" },
  { value: "NSE",    label: "NSE — Nigerian Society of Engineers" },
  { value: "Other",  label: "Other professional body" },
];

/* ─── Types ─────────────────────────────────────────────────── */
type DocKind = "upload" | "text" | "id_verify" | "address_verify" | "body_select";

type DocDef = {
  type: string; label: string; desc: string; kind: DocKind;
  optional?: boolean; accept?: string; placeholder?: string;
  refImg?: string; refCaption?: string; instructions?: string[];
};

type IdVerifyState   = { type: string; number: string; fileUrl: string };
type AddrVerifyState = { proofType: string; address: string; fileUrl: string };

/* ─── Tier config ─────────────────────────────────────────────── */
const TIER_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  tiers: { title: string; subtitle: string; auto?: boolean; docs: DocDef[] }[];
}> = {
  professional: {
    label: "Professional Verification",
    icon: User,
    tiers: [
      {
        title: "Profile Setup", subtitle: "Complete your profile with a headline, bio and profession.", auto: true,
        docs: [{ type: "profile_complete", label: "Profile bio & headline", desc: "Fill in your profile with a bio and professional headline.", kind: "text" }],
      },
      {
        title: "Professional Credentials", subtitle: "Your regulatory body membership and practising licence.",
        docs: [
          {
            type: "reg_body", label: "Professional body", kind: "body_select",
            desc: "The professional body you are registered with in Nigeria.",
            instructions: ["Must be a valid Nigerian regulatory body", "Select 'Other' if your body is not listed"],
          },
          {
            type: "reg_number", label: "Registration / Licence number", kind: "text", placeholder: "e.g. AR/2021/00123",
            desc: "Your unique membership or licence number as printed on your certificate.",
          },
          {
            type: "membership_cert", label: "Membership certificate", kind: "upload", accept: "image/*,.pdf",
            desc: "Front page of your professional certificate or current practising licence.",
            refImg: r2Url("site/photo-1568667256549-094345857637.jpg"),
            refCaption: "Sample professional certificate",
            instructions: ["Must show your full name and registration number", "Full-size, original and unedited", "JPG, PNG or PDF · max 10MB"],
          },
        ],
      },
      {
        title: "Identity & Address", subtitle: "Government-issued ID and proof of address for full verification.",
        docs: [
          {
            type: "gov_id", label: "Government-issued ID", kind: "id_verify",
            desc: "A valid Nigerian government-issued ID.",
            instructions: ["Must be currently valid (not expired)", "All text and photo must be clearly legible", "Accepted: NIN Slip, Passport, Driver's Licence, PVC, National ID Card"],
          },
          {
            type: "proof_of_address", label: "Proof of address", kind: "address_verify",
            desc: "A document proving your current residential address in Nigeria.",
            instructions: ["Must show your full name and address", "Dated within the last 3 months", "Tenancy agreements accepted at any date"],
          },
        ],
      },
    ],
  },
  exhibitor: {
    label: "Business Verification",
    icon: Building2,
    tiers: [
      {
        title: "Company Profile", subtitle: "Complete your company profile with industry and about section.", auto: true,
        docs: [{ type: "company_profile", label: "Company name, industry & about", desc: "Your storefront must have a complete name, industry, and about section.", kind: "text" }],
      },
      {
        title: "Business Registration", subtitle: "Prove your business is legally registered with the CAC.",
        docs: [
          {
            type: "cac_number", label: "CAC registration number", kind: "text", placeholder: "e.g. RC 1234567 or BN 2485062",
            desc: "Your Corporate Affairs Commission registration number.",
            instructions: ["RC — Limited Liability Companies", "BN — Business Names / sole traders", "IT — Incorporated Trustees (NGOs / Associations)", "Find this on your CAC certificate"],
          },
          {
            type: "cac_status_report", label: "CAC Status Report", kind: "upload", accept: "image/*,.pdf",
            desc: "Status report from cacportal.cac.gov.ng confirming your company is active.",
            refImg: r2Url("site/photo-1450101499163-c8848c66ca85.jpg"),
            refCaption: "Download from cacportal.cac.gov.ng",
            instructions: [
              "Go to cacportal.cac.gov.ng → search your RC / BN number",
              "Download the 'Company Status Report'",
              "Must show 'Active' status",
              "JPG, PNG or PDF · max 10MB",
            ],
          },
          {
            type: "cac_certificate", label: "Certificate of Incorporation", kind: "upload", accept: "image/*,.pdf",
            desc: "Your CAC Certificate of Incorporation (RC) or Certificate of Business Name (BN).",
            refImg: r2Url("site/photo-1450101499163-c8848c66ca85.jpg"),
            refCaption: "CAC Certificate of Incorporation",
            instructions: ["Must show company name and RC / BN number", "Full-size scan or high-res photo", "JPG, PNG or PDF · max 10MB"],
          },
          {
            type: "director_id", label: "Director/Owner's Government ID", kind: "id_verify",
            desc: "Valid government-issued ID of the registered company director or proprietor.",
            instructions: ["Name must match the director on your CAC certificate", "NIN Slip, Passport, Driver's Licence, PVC or National ID accepted", "Must be currently valid"],
          },
        ],
      },
      {
        title: "Business Address & Credentials", subtitle: "Verify your business location and optional industry certifications.",
        docs: [
          {
            type: "business_address", label: "Proof of business address", kind: "address_verify",
            desc: "A utility bill or tenancy agreement for your registered business address or showroom.",
            instructions: ["Must show your registered business name", "Dated within the last 3 months (tenancy: any date)", "Utility bill, tenancy agreement, or rate assessment accepted"],
          },
          {
            type: "industry_cert", label: "Industry certification", kind: "upload", accept: "image/*,.pdf", optional: true,
            desc: "Any quality, safety, or standards certification relevant to your products — optional but strongly recommended.",
            instructions: ["ISO, SONCAP, NAFDAC, SON, or equivalent", "Not required — but boosts buyer trust and search ranking", "JPG, PNG or PDF · max 10MB"],
          },
        ],
      },
    ],
  },
  buyer: {
    label: "Account Verification",
    icon: CreditCard,
    tiers: [
      {
        title: "Profile Setup", subtitle: "Complete your buyer profile with your name and intent.", auto: true,
        docs: [{ type: "profile_complete", label: "Profile name & requirement", desc: "Your profile must include your name and what you are looking for.", kind: "text" }],
      },
      {
        title: "Identity Verification", subtitle: "Provide a valid government-issued ID.",
        docs: [
          {
            type: "gov_id", label: "Government-issued ID", kind: "id_verify",
            desc: "A valid Nigerian government-issued ID to verify your identity.",
            instructions: ["Must be currently valid (not expired)", "All text and photo must be clearly legible", "Accepted: NIN Slip, Passport, Driver's Licence, PVC, National ID Card"],
          },
        ],
      },
      {
        title: "Corporate Verification", subtitle: "For companies making large procurement orders — optional for individuals.",
        docs: [
          {
            type: "cac_number_buyer", label: "Company CAC number", kind: "text", placeholder: "e.g. RC 7654321", optional: true,
            desc: "If you are procuring on behalf of a registered company.",
          },
          {
            type: "company_reg_buyer", label: "CAC certificate", kind: "upload", accept: "image/*,.pdf", optional: true,
            desc: "Certificate of Incorporation for your company.",
            instructions: ["Only required for corporate procurement", "Must show company name and RC / BN number"],
          },
        ],
      },
    ],
  },
};

/* ─── AnimatedShield ─────────────────────────────────────────── */
function AnimatedShield({ status }: { status: string }) {
  const isApproved = status === "approved";
  const isReview   = status === "under_review";
  return (
    <motion.svg viewBox="0 0 48 48" className="w-11 h-11"
      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.path
        d="M24 4 L42 12 L42 24 C42 34 34 42 24 44 C14 42 6 34 6 24 L6 12 Z"
        fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        className={isApproved ? "stroke-[#16a34a]" : isReview ? "stroke-[#0ea5e9]" : "stroke-[#ffd716]"}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {isApproved && (
        <motion.path d="M16 24 L22 30 L32 18" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="stroke-[#16a34a]" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }} />
      )}
      {!isApproved && !isReview && (
        <motion.circle cx="24" cy="28" r="1.5" fill="currentColor" className="text-[#ffd716]"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring" }} />
      )}
    </motion.svg>
  );
}

/* ─── Status helpers ─────────────────────────────────────────── */
type TierStatusLabel = TierState["status"];

/**
 * Restrained status pill for a tier card — reuses the kit's subtle,
 * mostly-text `StatusBadge` tones instead of a bespoke saturated chip.
 */
const TIER_STATUS: Record<TierStatusLabel, { label: string; tone: BadgeTone }> = {
  locked:       { label: "Locked",        tone: "grey" },
  not_started:  { label: "Not Started",   tone: "grey" },
  in_progress:  { label: "In Progress",   tone: "yellow" },
  under_review: { label: "Under Review",  tone: "blue" },
  approved:     { label: "Verified",      tone: "green" },
  rejected:     { label: "Action Needed", tone: "red" },
};

function statusChip(s: TierStatusLabel) {
  const { label, tone } = TIER_STATUS[s];
  return <StatusBadge tone={tone} className="uppercase tracking-wide">{label}</StatusBadge>;
}

function tierIcon(s: TierStatusLabel, size = 18) {
  if (s === "approved")     return <CheckCircle2 size={size} className="text-[#16a34a] dark:text-[#4ade80]" />;
  if (s === "under_review") return <Clock size={size} className="text-[#0ea5e9]" />;
  if (s === "rejected")     return <AlertTriangle size={size} className="text-red-500" />;
  if (s === "locked")       return <Lock size={size} className="text-[#b3b3b3]" />;
  if (s === "in_progress")  return <Upload size={size} className="text-[#ffd716]" />;
  return <ShieldAlert size={size} className="text-[#9a9a9a]" />;
}

/* ─── VerificationRing ──────────────────────────────────────── */
function VerificationRing({ tier, total = 3 }: { tier: number; total?: number }) {
  const r = 36; const c = 2 * Math.PI * r;
  const offset = c - ((tier / total) * 100 / 100) * c;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="5" stroke="currentColor" className="text-[#f0f0f0] dark:text-white/10" />
        <motion.circle cx="40" cy="40" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor" className="text-[#ffd716]"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
      </svg>
      <div className="text-center z-10">
        <p className="text-lg font-black text-[#1e1e1e] dark:text-white leading-none">{tier}</p>
        <p className="text-[8px] text-[#9a9a9a] font-medium">of {total}</p>
      </div>
    </div>
  );
}

/* ─── SearchableSelect ───────────────────────────────────────── */
function SearchableSelect({ options, value, onChange, placeholder }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left cursor-pointer")}
      >
        <span className={selected ? "text-[#1e1e1e] dark:text-white" : "text-[#9a9a9a]"}>
          {selected?.label ?? placeholder ?? "Select…"}
        </span>
        <ChevronDown size={14} className={cn("text-[#9a9a9a] flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-[#ececec] dark:border-white/10">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-[#f7f7f7] dark:bg-white/5 rounded-lg text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0
                ? <p className="py-4 text-center text-[12px] text-[#9a9a9a]">No results</p>
                : filtered.map((o) => (
                  <button key={o.value} type="button"
                    onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                    className={cn("w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors",
                      o.value === value
                        ? "bg-[#ffd716]/15 text-[#1e1e1e] dark:text-white font-semibold"
                        : "text-[#6b6b6b] dark:text-white/70 hover:bg-[#f7f7f7] dark:hover:bg-white/5"
                    )}
                  >
                    {o.value === value && <CheckCircle2 size={12} className="text-[#caa400] flex-shrink-0" />}
                    {o.label}
                  </button>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── AddressAutocomplete ─────────────────────────────────────── */
type NominatimResult = { place_id: string; display_name: string };

function AddressAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (query.length < 4) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ng&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await r.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] pointer-events-none" />
        <input value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
          placeholder="Start typing your address in Nigeria…"
          className={cn(inputClass, "pl-10 pr-9")}
        />
        {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] animate-spin" />}
      </div>
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-xl overflow-hidden"
          >
            {suggestions.map((s) => (
              <button key={s.place_id} type="button"
                onClick={() => { onChange(s.display_name); setQuery(s.display_name); setOpen(false); }}
                className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-[12.5px] text-left text-[#6b6b6b] dark:text-white/70 hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors border-b border-[#f5f5f5] dark:border-white/5 last:border-0"
              >
                <MapPin size={12} className="text-[#9a9a9a] flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── IdVerifyStep ──────────────────────────────────────────── */
function IdVerifyStep({ value, onChange }: { value: IdVerifyState; onChange: (v: IdVerifyState) => void }) {
  const selectedType = ID_TYPES.find((t) => t.value === value.type);
  const validation = value.type && value.number ? validateIdNumber(value.type, value.number) : null;
  const numericOnly = selectedType?.numericOnly;

  function handleNumberChange(raw: string) {
    const cleaned = numericOnly ? raw.replace(/[^0-9]/g, "") : raw;
    const maxLen = selectedType?.exactLen ?? selectedType?.maxLen ?? 99;
    onChange({ ...value, number: cleaned.slice(0, maxLen) });
  }

  const inputBorder =
    !value.number ? "" :
    validation?.state === "ok" ? "border-[#16a34a] focus:border-[#16a34a]" :
    validation?.state === "short" ? "border-[#ffd716] focus:border-[#ffd716]" :
    "border-red-400 focus:border-red-400";

  const showFile = value.type && validation?.state === "ok";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-1.5">ID Type</p>
        <SearchableSelect
          options={ID_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          value={value.type}
          onChange={(v) => onChange({ type: v, number: "", fileUrl: "" })}
          placeholder="Select your ID type…"
        />
      </div>
      <AnimatePresence>
        {value.type && (
          <motion.div key="num" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest">
                {selectedType?.numberLabel ?? "ID Number"}
              </p>
              {value.number.length > 0 && (
                <span className={`text-[11px] font-semibold tabular-nums ${
                  validation?.state === "ok" ? "text-[#16a34a]" :
                  validation?.state === "short" ? "text-[#ffd716]" : "text-red-400"
                }`}>
                  {validation?.msg}
                </span>
              )}
            </div>
            <input
              className={`${inputClass} ${inputBorder} transition-colors`}
              placeholder={selectedType?.placeholder ?? "Enter your ID number"}
              value={value.number}
              onChange={(e) => handleNumberChange(e.target.value)}
              inputMode={numericOnly ? "numeric" : "text"}
              autoFocus
            />
            {value.number.length === 0 && selectedType?.hint && (
              <p className="text-[11px] text-[#9a9a9a] mt-1.5">{selectedType.hint}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFile && (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
          >
            <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-1.5">Upload {selectedType?.label}</p>
            <FileUpload accept="image/*,.pdf" maxSizeMB={10} upload={(file) => uploadFile(file, "doc")}
              label="Upload your ID" hint="Clear photo or scan — JPG, PNG, PDF · max 10MB"
              onChange={(items: UploadItem[]) => {
                const done = items.find((i) => i.progress >= 100 && i.url);
                if (done?.url) onChange({ ...value, fileUrl: done.url });
              }}
            />
            {value.fileUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 flex items-center gap-2 text-[12.5px] text-[#16a34a] font-medium">
                <CheckCircle2 size={14} /> ID uploaded successfully
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── AddressVerifyStep ──────────────────────────────────────── */
function AddressVerifyStep({ value, onChange }: { value: AddrVerifyState; onChange: (v: AddrVerifyState) => void }) {
  const selectedProof = ADDRESS_PROOF_TYPES.find((t) => t.value === value.proofType);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-1.5">Proof Type</p>
        <SearchableSelect
          options={ADDRESS_PROOF_TYPES}
          value={value.proofType}
          onChange={(v) => onChange({ proofType: v, address: value.address, fileUrl: "" })}
          placeholder="Select proof of address type…"
        />
      </div>
      <AnimatePresence>
        {value.proofType && (
          <motion.div key="addr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-1.5">Your Address</p>
            <AddressAutocomplete value={value.address} onChange={(addr) => onChange({ ...value, address: addr })} />
            <p className="mt-1.5 text-[11px] text-[#9a9a9a]">Search Nigerian addresses or type your address manually.</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {value.proofType && value.address.trim() && (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
          >
            <p className="text-[11px] font-semibold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-1.5">Upload {selectedProof?.label}</p>
            <FileUpload accept="image/*,.pdf" maxSizeMB={10} upload={(file) => uploadFile(file, "doc")}
              label={`Upload ${selectedProof?.label ?? "proof of address"}`}
              hint="JPG, PNG or PDF · max 10MB"
              onChange={(items: UploadItem[]) => {
                const done = items.find((i) => i.progress >= 100 && i.url);
                if (done?.url) onChange({ ...value, fileUrl: done.url });
              }}
            />
            {value.fileUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 flex items-center gap-2 text-[12.5px] text-[#16a34a] font-medium">
                <CheckCircle2 size={14} /> Document uploaded successfully
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── DocWizard ─────────────────────────────────────────────── */
function DocWizard({ tierIndex, tierConfig, onClose, onDone }: {
  tierIndex: number;
  tierConfig: typeof TIER_CONFIG[string];
  onClose: () => void;
  onDone: () => void;
}) {
  const tierDef  = tierConfig.tiers[tierIndex];
  const docs     = tierDef.docs;
  const total    = docs.length;
  const [step, setStep]         = useState(0);
  const [values, setValues]     = useState<Record<string, string>>({});
  const [files, setFiles]       = useState<Record<string, string>>({});
  const [idVerify, setIdVerify] = useState<Record<string, IdVerifyState>>({});
  const [addrVerify, setAddr]   = useState<Record<string, AddrVerifyState>>({});
  const [submitting, setSub]    = useState(false);
  const [dir, setDir]           = useState(1);

  const doc      = docs[step] as DocDef | undefined;
  const isReview = step === total;

  const canContinue = (() => {
    if (!doc) return true;
    switch (doc.kind) {
      case "text": case "body_select": return !!(values[doc.type]?.trim());
      case "upload":        return !!(files[doc.type]);
      case "id_verify":     { const iv = idVerify[doc.type]; return !!(iv?.type && iv?.number?.trim() && iv?.fileUrl); }
      case "address_verify":{ const av = addrVerify[doc.type]; return !!(av?.proofType && av?.address?.trim() && av?.fileUrl); }
      default: return true;
    }
  })();

  function next() { if (step <= total) { setDir(1); setStep((s) => s + 1); } }
  function skip() { setDir(1); setStep((s) => Math.min(s + 1, total)); }
  function back() { if (step > 0) { setDir(-1); setStep((s) => s - 1); } }

  async function submit() {
    setSub(true);
    const tier = tierIndex + 1;
    let ok = true;
    for (const d of docs) {
      try {
        if (d.kind === "text" || d.kind === "body_select") {
          const v = values[d.type]?.trim();
          if (!v) continue;
          const r = await submitKycDoc({ tier, docType: d.type, textValue: v });
          if (!r.ok) { toast.error(r.error ?? "Failed"); ok = false; break; }
        } else if (d.kind === "upload") {
          const url = files[d.type];
          if (!url) continue;
          const r = await submitKycDoc({ tier, docType: d.type, fileUrl: url });
          if (!r.ok) { toast.error(r.error ?? "Failed"); ok = false; break; }
        } else if (d.kind === "id_verify") {
          const iv = idVerify[d.type];
          if (!iv?.fileUrl) continue;
          const r = await submitKycDoc({ tier, docType: d.type, textValue: `${iv.type}:${iv.number}`, fileUrl: iv.fileUrl });
          if (!r.ok) { toast.error(r.error ?? "Failed"); ok = false; break; }
        } else if (d.kind === "address_verify") {
          const av = addrVerify[d.type];
          if (!av?.fileUrl) continue;
          const r = await submitKycDoc({ tier, docType: d.type, textValue: `${av.proofType}:${av.address}`, fileUrl: av.fileUrl });
          if (!r.ok) { toast.error(r.error ?? "Failed"); ok = false; break; }
        }
      } catch { toast.error("Submission error"); ok = false; break; }
    }
    setSub(false);
    if (ok) { toast.success("Documents submitted — under review."); onDone(); }
  }

  const completedCount = docs.filter((d) => {
    switch (d.kind) {
      case "text": case "body_select": return !!(values[d.type]?.trim());
      case "upload":         return !!(files[d.type]);
      case "id_verify":      { const iv = idVerify[d.type]; return !!(iv?.type && iv?.number && iv?.fileUrl); }
      case "address_verify": { const av = addrVerify[d.type]; return !!(av?.proofType && av?.address && av?.fileUrl); }
      default: return false;
    }
  }).length;

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative z-10 w-full sm:max-w-[540px] max-h-[94vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#181818] border border-[#ececec] dark:border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="relative px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ffd716]/12 via-[#ffd716]/5 to-transparent pointer-events-none" />
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[#ffd716]/12 dark:bg-[#ffd716]/6 pointer-events-none" />
          <div className="absolute -right-1 -top-3 w-10 h-10 rounded-full bg-[#ffd716]/18 dark:bg-[#ffd716]/9 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AnimatedShield status="in_progress" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#caa400] dark:text-[#ffd716]">
                  Tier {tierIndex + 1} · {completedCount}/{total} complete
                </p>
                <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white truncate">{tierDef.title}</h2>
              </div>
            </div>
            <button onClick={onClose}
              className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 sm:px-6 pt-3.5 pb-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            {docs.map((_, i) => (
              <motion.div key={i}
                className={cn("h-1.5 rounded-full flex-1 transition-colors",
                  i < step ? "bg-[#16a34a]" : i === step ? "bg-[#ffd716]" : "bg-[#f0f0f0] dark:bg-white/10"
                )}
                animate={i === step ? { opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            ))}
            <div className={cn("h-1.5 rounded-full flex-1 transition-colors", isReview ? "bg-[#ffd716]" : "bg-[#f0f0f0] dark:bg-white/10")} />
          </div>
          <p className="text-[11px] text-[#9a9a9a] mt-2">
            {isReview
              ? "Review & submit your documents"
              : `Step ${step + 1} of ${total + 1} — ${doc?.label}${doc?.optional ? " (optional)" : ""}`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-2">
          <AnimatePresence mode="wait" custom={dir}>
            {!isReview && doc ? (
              <motion.div key={step} custom={dir} variants={slide}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="py-4"
              >
                <h3 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">{doc.label}</h3>
                <p className="text-[13px] text-[#9a9a9a] dark:text-white/60 mt-0.5 mb-4 leading-relaxed">{doc.desc}</p>
                {doc.optional && (
                  <span className="inline-block mb-3 text-[10px] font-bold bg-[#f0f0f0] dark:bg-white/10 text-[#9a9a9a] px-2.5 py-1 rounded-full uppercase tracking-wide">Optional</span>
                )}

                {doc.refImg && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mb-4 rounded-xl overflow-hidden border border-[#ececec] dark:border-white/10">
                    <div className="relative h-24 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.refImg} alt={doc.refCaption ?? ""} className="w-full h-full object-cover opacity-60 dark:opacity-40" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2">
                        <Info size={12} className="text-white/70 flex-shrink-0" />
                        <span className="text-[11.5px] text-white/85 font-medium">{doc.refCaption}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {doc.instructions && doc.instructions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                    className="mb-4 rounded-xl bg-[#f7f7f7] dark:bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={12} className="text-[#ffd716] flex-shrink-0" />
                      <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest">Requirements</span>
                    </div>
                    <ul className="space-y-1.5">
                      {doc.instructions.map((inst) => (
                        <li key={inst} className="flex items-start gap-2 text-[12px] text-[#6b6b6b] dark:text-white/60">
                          <CheckCircle2 size={12} className="text-[#c3c3c3] dark:text-white/30 flex-shrink-0 mt-0.5" /> {inst}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                  {doc.kind === "text" && (
                    <input className={inputClass} placeholder={doc.placeholder ?? "Enter value…"}
                      value={values[doc.type] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [doc.type]: e.target.value }))}
                      autoFocus />
                  )}
                  {doc.kind === "body_select" && (
                    <SearchableSelect options={PROFESSIONAL_BODIES}
                      value={values[doc.type] ?? ""}
                      onChange={(v) => setValues((prev) => ({ ...prev, [doc.type]: v }))}
                      placeholder="Select your professional body…" />
                  )}
                  {doc.kind === "upload" && (
                    <>
                      <FileUpload accept={doc.accept ?? "image/*,.pdf"} maxSizeMB={10} upload={(file) => uploadFile(file, "doc")}
                        label="Click to upload or drag & drop"
                        hint="JPG, PNG or PDF · max 10MB"
                        onChange={(items: UploadItem[]) => {
                          const done = items.find((i) => i.progress >= 100 && i.url);
                          if (done?.url) setFiles((f) => ({ ...f, [doc.type]: done.url! }));
                        }}
                      />
                      {files[doc.type] && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="mt-2 flex items-center gap-2 text-[12.5px] text-[#16a34a] font-medium">
                          <CheckCircle2 size={14} /> Document uploaded
                        </motion.div>
                      )}
                    </>
                  )}
                  {doc.kind === "id_verify" && (
                    <IdVerifyStep
                      value={idVerify[doc.type] ?? { type: "", number: "", fileUrl: "" }}
                      onChange={(v) => setIdVerify((prev) => ({ ...prev, [doc.type]: v }))}
                    />
                  )}
                  {doc.kind === "address_verify" && (
                    <AddressVerifyStep
                      value={addrVerify[doc.type] ?? { proofType: "", address: "", fileUrl: "" }}
                      onChange={(v) => setAddr((prev) => ({ ...prev, [doc.type]: v }))}
                    />
                  )}
                </motion.div>
              </motion.div>
            ) : (
              /* Review */
              <motion.div key="review" custom={dir} variants={slide}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22 }} className="py-4"
              >
                <div className="flex items-center gap-3 mb-5">
                  <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                    className="w-11 h-11 rounded-xl bg-[#fffbdc] dark:bg-[#ffd716]/10 flex items-center justify-center">
                    <ShieldCheck size={22} className="text-[#caa400]" />
                  </motion.div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">Review & submit</h3>
                    <p className="text-[13px] text-[#9a9a9a]">{completedCount} of {total} steps completed</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {docs.map((d, i) => {
                    let filled = false; let preview = "";
                    switch (d.kind) {
                      case "text": case "body_select":
                        filled = !!(values[d.type]?.trim()); preview = values[d.type] ?? ""; break;
                      case "upload":
                        filled = !!(files[d.type]); preview = filled ? "Document uploaded" : ""; break;
                      case "id_verify": {
                        const iv = idVerify[d.type];
                        filled = !!(iv?.type && iv?.number && iv?.fileUrl);
                        preview = iv?.type ? `${ID_TYPES.find((t) => t.value === iv.type)?.label} · ${iv.number}` : "";
                        break;
                      }
                      case "address_verify": {
                        const av = addrVerify[d.type];
                        filled = !!(av?.proofType && av?.address && av?.fileUrl);
                        preview = av?.proofType ? ADDRESS_PROOF_TYPES.find((t) => t.value === av.proofType)?.label ?? "" : "";
                        break;
                      }
                    }
                    return (
                      <motion.div key={d.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
                          filled ? "border-[#16a34a]/30 bg-[#f0fdf4] dark:bg-[#16a34a]/10"
                          : d.optional ? "border-dashed border-[#e5e5e5] dark:border-white/10"
                          : "border-[#f5c8c8] dark:border-red-500/20 bg-[#fff8f8] dark:bg-red-500/5"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {filled ? <CheckCircle2 size={14} className="text-[#16a34a] flex-shrink-0" />
                            : d.optional ? <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-dashed border-[#d4d4d4] dark:border-white/20 flex-shrink-0" />
                            : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                          }
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1e1e1e] dark:text-white truncate">{d.label}</p>
                            {preview && <p className="text-[11.5px] text-[#9a9a9a] truncate">{preview}</p>}
                            {!filled && d.optional && <p className="text-[11px] text-[#b3b3b3]">Optional — skipped</p>}
                          </div>
                        </div>
                        <button onClick={() => { setDir(-1); setStep(i); }}
                          className="text-[12px] font-medium text-[#9a9a9a] hover:text-[#ffd716] transition-colors flex-shrink-0">
                          Edit
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-5 rounded-xl bg-[#f7f7f7] dark:bg-white/[0.04] px-4 py-3 flex items-start gap-2.5">
                  <ShieldCheck size={14} className="text-[#ffd716] flex-shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-[#9a9a9a] dark:text-white/50 leading-relaxed">
                    Your documents are encrypted and stored securely. Only Nomarc admins can view them for verification. Review takes 1–3 business days.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <button onClick={step === 0 ? onClose : back}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#e3e3e3] dark:border-white/15 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/60 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
            <ChevronLeft size={15} /> {step === 0 ? "Cancel" : "Back"}
          </button>

          {isReview ? (
            <button onClick={submit} disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ffd716] text-[#1e1e1e] text-[13px] font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-60">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : <><ShieldCheck size={15} /> Submit for Review</>}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={skip}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                Skip
              </button>
              <motion.button onClick={next} disabled={!canContinue}
                whileTap={canContinue ? { scale: 0.97 } : {}}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ffd716] dark:bg-[#111] dark:border dark:border-white/15 text-[#1e1e1e] dark:text-white text-[13px] font-bold hover:bg-[#e6c114] dark:hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ArrowRight size={14} />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── TierCard ──────────────────────────────────────────────── */
function TierCard({ index, tierDef, tierState, onSubmit }: {
  index: number;
  tierDef: { title: string; subtitle: string; auto?: boolean; docs: DocDef[] };
  tierState: TierState;
  onSubmit: () => void;
}) {
  const { status } = tierState;
  const isLocked = status === "locked";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className={cn("rounded-2xl border p-5 transition-colors bg-white dark:bg-[#1e1e1e]",
        isLocked ? "border-[#e5e5e5] dark:border-white/10 opacity-60" : "border-[#ececec] dark:border-white/10"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Neutral icon well — the status tone lives in the icon color and the
            StatusBadge chip below, not in a saturated circle background. */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#f5f5f5] dark:bg-white/5">
          {tierIcon(status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest">Tier {index + 1}</p>
            {statusChip(status)}
          </div>
          <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white mt-0.5">{tierDef.title}</h3>
          <p className="text-[12.5px] text-[#9a9a9a] dark:text-white/60 mt-0.5">{tierDef.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tierDef.docs.map((doc) => {
          // An `auto` tier is satisfied by profile state, not by an uploaded
          // document, so there is no kyc_document row to look for. This used to
          // check for one anyway: nothing in the codebase ever writes a
          // "profile_complete" row, so that circle could never fill, even once
          // the tier had been approved. Derive it from the tier instead.
          const submitted = tierDef.auto
            ? status === "approved"
            : tierState.docs.some((d) => d.docType === doc.type);
          return (
            <div key={doc.type} className="flex items-center gap-2.5">
              {submitted
                ? <CheckCircle2 size={14} className="text-[#16a34a] flex-shrink-0" />
                : <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#d4d4d4] dark:border-white/20 flex-shrink-0" />
              }
              <span className={cn("text-[12.5px]", submitted ? "text-[#1e1e1e] dark:text-white" : "text-[#6b6b6b] dark:text-white/60")}>
                {doc.label}{doc.optional ? " (optional)" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {tierDef.auto && status !== "approved" && (
        <a href="/dashboard/profile?tab=public" className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white bg-[#ffd716] dark:bg-[#111] hover:bg-[#e6c114] dark:hover:bg-black dark:border dark:border-white/15 transition-colors px-4 py-2.5 rounded-xl">
          <Upload size={14} /> Complete your profile to unlock <ChevronRight size={13} />
        </a>
      )}
      {status === "rejected" && tierState.docs.find((d) => d.adminNote) && (
        <div className="mt-3 rounded-lg bg-red-100 dark:bg-red-500/10 px-3 py-2 text-[12px] text-red-700 dark:text-red-400">
          <span className="font-semibold">Admin note: </span>
          {tierState.docs.find((d) => d.adminNote)?.adminNote}
        </div>
      )}
      {!isLocked && !tierDef.auto && status !== "approved" && status !== "under_review" && (
        <button onClick={onSubmit}
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#1e1e1e] dark:text-white bg-[#ffd716] dark:bg-[#111] hover:bg-[#e6c114] dark:hover:bg-black dark:border dark:border-white/15 transition-colors px-4 py-2.5 rounded-xl">
          <Upload size={14} />
          {status === "rejected" ? "Resubmit documents" : "Start verification"}
          <ChevronRight size={13} />
        </button>
      )}
      {status === "under_review" && (
        <div className="mt-4 flex items-center gap-2 text-[12.5px] text-[#0369a1] dark:text-[#38bdf8]">
          <Clock size={14} /> Under admin review — usually 1–3 business days.
        </div>
      )}
      {status === "approved" && (
        <div className="mt-4 flex items-center gap-2 text-[12.5px] text-[#16803c] dark:text-[#4ade80] font-semibold">
          <BadgeCheck size={14} /> Verified by Nomarc
        </div>
      )}
    </motion.div>
  );
}

/* ─── Verification benefits (shared by the sidebar card + the header card) ── */
const BENEFITS: Record<string, string[]> = {
  professional: [
    "Blue verified seal on your public profile",
    "Ranked higher in professional search results",
    "Unlocks proposal attachments with credential proof",
    "Trusted badge on all job applications",
  ],
  exhibitor: [
    "Verified Exhibitor seal on your storefront",
    "Priority placement in product search",
    "Unlocks higher monthly quote volume limits",
    "Buyer trust signal — increases RFQ conversions",
  ],
  buyer: [
    "Higher order limits and RFQ caps",
    "Priority response from exhibitors",
    "Corporate procurement unlocked at Tier 3",
  ],
};

/* ─── VerificationLevelCard — compact level summary with a "?" popover ─────
 * Used in the profile header (beside the completeness bar). The pulsing "?"
 * reveals the "Why get verified?" benefits, which stay hidden until clicked. */
export function VerificationLevelCard({ kycState, className }: { kycState: KycState; className?: string }) {
  const state = kycState;
  const [showWhy, setShowWhy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = BENEFITS[state.role] ?? BENEFITS.professional;

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShowWhy(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = state.isFullyVerified ? "Fully Verified" : state.overallTier === 0 ? "Not yet verified" : `Tier ${state.overallTier} Verified`;
  const sub = state.isFullyVerified ? "Blue seal active" : state.overallTier < 3 ? `Complete Tier ${state.overallTier + 1} to advance` : "All tiers complete";

  return (
    <div className={cn("relative rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-5", className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest">Verification Level</p>
        <div className="relative" ref={ref}>
          <motion.button
            type="button" onClick={() => setShowWhy((v) => !v)} aria-label="Why get verified?" aria-expanded={showWhy}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-6 rounded-full border border-[#e5e5e5] dark:border-white/15 flex items-center justify-center text-[#9a9a9a] hover:text-[#caa400] hover:border-[#ffd716] transition-colors"
          >
            <HelpCircle size={14} />
          </motion.button>
          <AnimatePresence>
            {showWhy && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="absolute right-0 top-full mt-2 z-40 w-64 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-xl p-4"
              >
                <p className="text-[11px] font-bold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-2.5">Why get verified?</p>
                <ul className="space-y-2">
                  {list.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[12px] text-[#6b6b6b] dark:text-white/70">
                      <BadgeCheck size={13} className="text-[#ffd716] flex-shrink-0 mt-0.5" /> {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <VerificationRing tier={state.overallTier} />
        <div className="min-w-0">
          <p className="font-bold text-[#1e1e1e] dark:text-white text-[15px] leading-tight">{label}</p>
          <p className="text-[12px] text-[#9a9a9a] mt-0.5">{sub}</p>
          <div className="mt-2.5 flex items-center gap-0">
            {[1, 2, 3].map((t, i) => {
              const approved = state.overallTier >= t;
              return (
                <div key={t} className="flex items-center">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors",
                    approved ? "border-[#16a34a] bg-[#16a34a] text-white"
                    : t === state.overallTier + 1 ? "border-[#ffd716] bg-[#ffd716]/20 text-[#1e1e1e] dark:text-white"
                    : "border-[#e5e5e5] dark:border-white/20 text-[#b3b3b3]"
                  )}>
                    {approved ? <CheckCircle2 size={12} /> : t}
                  </div>
                  {i < 2 && <div className={cn("w-5 h-0.5", state.overallTier > t ? "bg-[#16a34a]" : "bg-[#e5e5e5] dark:bg-white/10")} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main KYC view ──────────────────────────────────────────── */
export function KycView({ kycState, embedded }: { kycState: KycState; embedded?: boolean }) {
  const [wizardTier, setWizardTier] = useState<number | null>(null);
  const [state, setState]           = useState(kycState);
  const cfg = TIER_CONFIG[state.role] ?? TIER_CONFIG.professional;

  return (
    <div className={embedded ? "" : "p-5 sm:p-7 max-w-[1100px] mx-auto"}>
      {!embedded && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-[#ffd716]" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/50">Identity & Verification</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e1e1e] dark:text-white">{cfg.label}</h1>
          <p className="mt-1.5 text-[14px] text-[#9a9a9a] dark:text-white/60 max-w-[520px]">
            Earn your Nomarc verified seal by completing the tiers below. Higher tiers unlock more trust signals and platform privileges.
          </p>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", embedded ? "" : "lg:grid-cols-3")}>
        <div className={cn("space-y-4", embedded ? "" : "lg:col-span-2")}>
          {state.tiers.map((tierState, i) => (
            <TierCard key={i} index={i} tierDef={cfg.tiers[i]} tierState={tierState} onSubmit={() => setWizardTier(i)} />
          ))}
        </div>

        {/* Sidebar — only on the standalone KYC page. In the embedded profile
            flow the level summary lives in the header (VerificationLevelCard). */}
        {!embedded && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[11px] font-bold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-4">Verification Level</p>
            <div className="flex flex-col items-center">
              <VerificationRing tier={state.overallTier} />
              <div className="mt-3 text-center">
                <p className="font-bold text-[#1e1e1e] dark:text-white text-sm">
                  {state.isFullyVerified ? "Fully Verified" : state.overallTier === 0 ? "Not yet verified" : `Tier ${state.overallTier} Verified`}
                </p>
                <p className="text-[11.5px] text-[#9a9a9a] mt-0.5">
                  {state.isFullyVerified ? "Blue seal active" : state.overallTier < 3 ? `Complete Tier ${state.overallTier + 1} to advance` : "All tiers complete"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-0">
              {[1, 2, 3].map((t, i) => {
                const approved = state.overallTier >= t;
                return (
                  <div key={t} className="flex items-center">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors",
                      approved ? "border-[#16a34a] bg-[#16a34a] text-white"
                      : t === state.overallTier + 1 ? "border-[#ffd716] bg-[#ffd716]/20 text-[#1e1e1e] dark:text-white"
                      : "border-[#e5e5e5] dark:border-white/20 text-[#b3b3b3]"
                    )}>
                      {approved ? <CheckCircle2 size={13} /> : t}
                    </div>
                    {i < 2 && <div className={cn("w-6 h-0.5", state.overallTier > t ? "bg-[#16a34a]" : "bg-[#e5e5e5] dark:bg-white/10")} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <p className="text-[11px] font-bold text-[#9a9a9a] dark:text-white/50 uppercase tracking-widest mb-3">Why get verified?</p>
            <ul className="space-y-2">
              {(BENEFITS[state.role] ?? BENEFITS.professional).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[12px] text-[#6b6b6b] dark:text-white/70">
                  <BadgeCheck size={13} className="text-[#ffd716] flex-shrink-0 mt-0.5" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
        )}
      </div>

      <AnimatePresence>
        {wizardTier !== null && (
          <DocWizard
            tierIndex={wizardTier}
            tierConfig={cfg}
            onClose={() => setWizardTier(null)}
            onDone={() => {
              setWizardTier(null);
              setState((prev) => ({
                ...prev,
                tiers: prev.tiers.map((t, i) => i === wizardTier ? { ...t, status: "under_review" as const } : t),
              }));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
