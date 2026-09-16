"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Search, ChevronDown, FileDown, Trash2, Users, Building2 } from "lucide-react";
import { DataTable, CopyChip, KebabMenu, ExportCsvDialog, type DataTableColumn } from "@/components/dashboard/kit";
import { removeFromList, type ListMember, type ListWithCount } from "@/lib/services/lists";

type Sort = "recent" | "name";

export function ListDetailView({ list, members }: { list: ListWithCount; members: ListMember[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    let list = rows.filter((r) => !query || `${r.name} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [rows, query, sort]);

  function removeOne(m: ListMember) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== m.id));
    start(() => removeFromList(list.id, m.itemType, m.id).then(() => { toast.success("Removed from list"); router.refresh(); }).catch(() => { setRows(prev); toast.error("Couldn't remove"); }));
  }

  const columns: DataTableColumn<ListMember>[] = [
    {
      key: "name", label: "Professional",
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
            ) : m.itemType === "company" ? <Building2 size={14} className="text-[#9a9a9a]" /> : <Users size={14} className="text-[#9a9a9a]" />}
          </div>
          <span className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{m.name}</span>
        </div>
      ),
    },
    { key: "role", label: "Current Role", render: (m) => <span className="text-[13px] text-[#1e1e1e] dark:text-white">{m.subtitle || "—"}</span> },
    { key: "email", label: "Email", render: (m) => <CopyChip value={m.email} /> },
    { key: "phone", label: "Phone number", render: (m) => <CopyChip value={m.phone} /> },
  ];

  return (
    <div>
      <Link href="/dashboard/lists" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:text-[#1e1e1e] dark:text-white/60 dark:hover:text-white">
        <ArrowLeft size={14} /> Back to lists
      </Link>
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">{list.name}</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">{members.length} saved to this list.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search within this list…" className="w-full rounded-lg border border-[#e3e3e3] bg-white py-2 pl-8 pr-3 text-[13px] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white" />
        </div>
        <div className="text-[12.5px] text-[#9a9a9a]">{selected.size} selected</div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] focus:border-[#ffd716] focus:outline-none dark:border-white/15 dark:bg-[#1e1e1e] dark:text-white">
          <option value="recent">Sort by: Recently Added</option>
          <option value="name">Sort by: Name</option>
        </select>
        {selected.size > 0 && (
          <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"><FileDown size={14} /> Export</button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(m) => m.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        rowHoverActions={(m) => (
          <KebabMenu items={[{ icon: Trash2, label: "Delete from list", danger: true, onClick: () => removeOne(m) }]} />
        )}
      />

      <ExportCsvDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        count={selected.size}
        filename={`${list.name}-export`}
        rows={filtered.filter((m) => selected.has(m.id)).map((m) => ({ Name: m.name, Role: m.subtitle, Email: m.email, Phone: m.phone }))}
      />
    </div>
  );
}
