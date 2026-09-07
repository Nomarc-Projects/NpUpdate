"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ListPlus, FileDown, MessageSquare, Eye, BadgeCheck, BookmarkCheck, MapPin } from "lucide-react";
import {
  DataTable, CopyChip, SlideOverDrawer, AddToListDialog, ExportCsvDialog,
  StatusBadge, type DataTableColumn,
} from "@/components/dashboard/kit";
import { MySearchesMenu } from "@/components/dashboard/directory/my-searches-menu";
import { NomarcAvatar } from "@/components/ui/avatar";
import { getProfessionalDetail, type PeopleRow, type ProDetail } from "@/lib/services/directory";
import { getSavedIds, toggleSaved } from "@/lib/services/saved";
import { shortLocation } from "@/lib/location-format";
import { cn } from "@/lib/utils";

const EXPERIENCE_BANDS = [
  { label: "Entry level (0–2 years)", test: (y: number) => y <= 2 },
  { label: "Intermediate (3–5 years)", test: (y: number) => y >= 3 && y <= 5 },
  { label: "Senior (6+ years)", test: (y: number) => y >= 6 },
];

export function PeopleDirectory({ rows }: { rows: PeopleRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Saved-professional ids, so the drawer's Save button reflects reality.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => { getSavedIds("professional").then((ids) => setSavedIds(new Set(ids))).catch(() => {}); }, []);
  async function toggleSaveProfile() {
    if (!openId) return;
    const was = savedIds.has(openId);
    setSavedIds((prev) => { const n = new Set(prev); if (was) n.delete(openId); else n.add(openId); return n; });
    toast(was ? "Removed from Saved Profiles" : "Saved — find it under Saved Profile");
    try { await toggleSaved("professional", openId); } catch {
      setSavedIds((prev) => { const n = new Set(prev); if (was) n.add(openId); else n.delete(openId); return n; });
      toast.error("Couldn't update");
    }
  }
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !`${r.name} ${r.currentRole} ${r.company}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (location && !r.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (experience) {
        const band = EXPERIENCE_BANDS.find((b) => b.label === experience);
        if (band && !band.test(r.years)) return false;
      }
      if (availability && r.availability !== availability) return false;
      return true;
    });
  }, [rows, query, location, experience, availability]);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    setDetailLoading(true);
    getProfessionalDetail(openId).then(setDetail).catch(() => setDetail(null)).finally(() => setDetailLoading(false));
  }, [openId]);

  function applySearch(q: Record<string, unknown>) {
    setQuery(typeof q.query === "string" ? q.query : "");
    setLocation(typeof q.location === "string" ? q.location : "");
    setExperience(typeof q.experience === "string" ? q.experience : "");
    setAvailability(typeof q.availability === "string" ? q.availability : "");
  }

  const columns: DataTableColumn<PeopleRow>[] = [
    {
      key: "professional", label: "Professional",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <NomarcAvatar src={r.avatarUrl} name={r.name} size="sm" />
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
              {r.name} {r.verified && <BadgeCheck size={13} className="text-[#ffd716]" />}
            </span>
            <span className="block truncate text-[11.5px] text-[#9a9a9a]">{r.location}</span>
          </div>
        </div>
      ),
    },
    { key: "role", label: "Current Role", render: (r) => (<div><p className="text-[13px] text-[#1e1e1e] dark:text-white">{r.currentRole}</p><p className="text-[11.5px] text-[#9a9a9a]">{r.company}</p></div>) },
    { key: "email", label: "Email Address", render: (r) => <CopyChip value={r.email} /> },
    { key: "phone", label: "Phone Number", render: (r) => <CopyChip value={r.phone} /> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, role, or company…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        </div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-36 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        <select value={experience} onChange={(e) => setExperience(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">Experience Level</option>
          {EXPERIENCE_BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">Availability</option>
          <option value="Open to work">Open to work</option>
          <option value="Hiring">Hiring</option>
        </select>
        <MySearchesMenu kind="people" currentQuery={{ query, location, experience, availability }} onApply={applySearch} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(r) => setOpenId(r.id)}
        bulkActions={() => (
          <>
            <button onClick={() => setAddToListOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-3 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]"><ListPlus size={13} /> Add to list</button>
            <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-1.5 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><FileDown size={13} /> Export</button>
          </>
        )}
      />

      <SlideOverDrawer open={!!openId} onClose={() => setOpenId(null)} title="Overview">
        {detailLoading ? (
          <p className="py-8 text-center text-[13px] text-[#9a9a9a]">Loading…</p>
        ) : detail ? (
          <div>
            <NomarcAvatar src={detail.avatarUrl} name={detail.name} size="lg" />
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white">{detail.name}</h3>
              {detail.availability && <StatusBadge tone="green">{detail.availability}</StatusBadge>}
            </div>
            <p className="text-[13px] text-[#6b6b6b] dark:text-white/60">{detail.headline}</p>
            {detail.location && (
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#9a9a9a]"><MapPin size={12} /> {shortLocation(detail.location)}</p>
            )}
            <div className="mt-3 space-y-1.5">
              {rows.find((r) => r.id === openId)?.email && <CopyChip value={rows.find((r) => r.id === openId)!.email} />}
              {rows.find((r) => r.id === openId)?.phone && <div className="mt-1"><CopyChip value={rows.find((r) => r.id === openId)!.phone} /></div>}
            </div>
            <div className="mt-4 flex gap-2">
              {/* Save sends this professional to the member's Saved Profiles
                  page (/dashboard/people/saved); mirrors the network card's
                  bookmark toggle. */}
              <button onClick={toggleSaveProfile} className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                savedIds.has(openId!)
                  ? "border border-[#ffd716] bg-[#fff7cc] text-[#caa400] dark:bg-[#ffd716]/10"
                  : "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]",
              )}><BookmarkCheck size={13} /> {savedIds.has(openId!) ? "Saved" : "Save Profile"}</button>
              <button onClick={() => router.push(`/dashboard/messages?to=${openId}`)} className="flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><MessageSquare size={13} /> Message</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setSelected(new Set([openId!])); setAddToListOpen(true); }} className="flex-1 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white">+ Add to list</button>
              <button onClick={() => router.push(`/dashboard/find-professionals?open=${openId}`)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[12.5px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><Eye size={13} /> View full profile</button>
            </div>
            {detail.about && (
              <section className="mt-5"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">About</h4><p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">{detail.about}</p></section>
            )}
            {detail.experience.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Work Experience</h4>
                <ul className="mt-1.5 space-y-1.5">{detail.experience.map(([a, b]) => <li key={a} className="text-[13px]"><span className="font-semibold text-[#1e1e1e] dark:text-white">{a}</span><span className="block text-[11.5px] text-[#9a9a9a]">{b}</span></li>)}</ul>
              </section>
            )}
            {detail.education.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Education</h4>
                <ul className="mt-1.5 space-y-1.5">{detail.education.map(([a, b]) => <li key={a} className="text-[13px]"><span className="font-semibold text-[#1e1e1e] dark:text-white">{a}</span><span className="block text-[11.5px] text-[#9a9a9a]">{b}</span></li>)}</ul>
              </section>
            )}
            {detail.skills.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Skills</h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{detail.skills.map((s) => <span key={s} className="rounded-full border border-[#e5e5e5] px-2.5 py-1 text-[11.5px] text-[#3d3d3d] dark:border-white/15 dark:text-white/75">{s}</span>)}</div>
              </section>
            )}
            {detail.certifications.length > 0 && (
              <section className="mt-4"><h4 className="text-[12px] font-bold uppercase tracking-wide text-[#1e1e1e] dark:text-white">Certifications</h4>
                <ul className="mt-1.5 space-y-1.5">{detail.certifications.map(([a, b]) => <li key={a} className="text-[13px]"><span className="font-medium text-[#1e1e1e] dark:text-white">{a}</span><span className="block text-[11.5px] text-[#9a9a9a]">{b}</span></li>)}</ul>
              </section>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-[#9a9a9a]">Couldn't load this profile.</p>
        )}
      </SlideOverDrawer>

      <AddToListDialog open={addToListOpen} onClose={() => setAddToListOpen(false)} itemType="professional" itemIds={Array.from(selected)} onDone={() => setSelected(new Set())} />
      <ExportCsvDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        count={selected.size}
        filename="people-export"
        rows={rows.filter((r) => selected.has(r.id)).map((r) => ({ Name: r.name, Role: r.currentRole, Company: r.company, Email: r.email, Phone: r.phone, Location: r.location }))}
      />
    </div>
  );
}
