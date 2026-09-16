"use server";

import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { requireAdmin } from "@/lib/authz";
import { crmLead } from "@/lib/db/schema";

export type CrmLead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: string;
  notes: string | null;
  date: string;
};

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Public — called from contact form + newsletter. No auth required. */
export async function submitLead(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source: "contact_form" | "newsletter" | "manual";
}) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  if (!name) throw new Error("Name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
  await db.insert(crmLead).values({
    name,
    email,
    phone: data.phone?.trim() || null,
    message: data.message?.trim() || null,
    source: data.source,
  });
  revalidatePath("/admin/crm");
}

export async function listLeads(opts?: { status?: string; search?: string }): Promise<CrmLead[]> {
  await requireAdmin();
  let q = db.select().from(crmLead).$dynamic();
  if (opts?.status && opts.status !== "all") {
    q = q.where(eq(crmLead.status, opts.status));
  }
  if (opts?.search?.trim()) {
    const s = `%${opts.search.trim()}%`;
    q = q.where(or(ilike(crmLead.name, s), ilike(crmLead.email, s)));
  }
  const rows = await q.orderBy(desc(crmLead.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    source: r.source ?? "contact_form",
    status: r.status ?? "new",
    notes: r.notes,
    date: fmt(r.createdAt),
  }));
}

export async function getLeadCounts(): Promise<Record<string, number>> {
  await requireAdmin();
  const rows = await db.execute(
    sql`SELECT status, count(*) AS n FROM crm_lead GROUP BY status`
  ) as { rows: { status: string; n: string | number }[] };
  const out: Record<string, number> = { all: 0, new: 0, contacted: 0, qualified: 0, converted: 0, archived: 0 };
  for (const r of rows.rows) {
    const count = Number(r.n);
    out[r.status] = count;
    out.all += count;
  }
  return out;
}

export async function updateLeadStatus(id: string, status: string) {
  await requireAdmin();
  await db.update(crmLead).set({ status }).where(eq(crmLead.id, id));
  revalidatePath("/admin/crm");
}

export async function updateLeadNotes(id: string, notes: string) {
  await requireAdmin();
  await db.update(crmLead).set({ notes: notes.trim() || null }).where(eq(crmLead.id, id));
  revalidatePath("/admin/crm");
}

export async function deleteLead(id: string) {
  await requireAdmin();
  await db.delete(crmLead).where(eq(crmLead.id, id));
  revalidatePath("/admin/crm");
}

export async function exportLeadsCsv(): Promise<string> {
  await requireAdmin();
  const rows = await db.select().from(crmLead).orderBy(desc(crmLead.createdAt));
  const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Name", "Email", "Phone", "Source", "Status", "Message", "Notes", "Date"].map(escape).join(",");
  const lines = rows.map((r) =>
    [r.name, r.email, r.phone, r.source, r.status, r.message, r.notes, fmt(r.createdAt)]
      .map(escape).join(",")
  );
  return [header, ...lines].join("\n");
}
