"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { supportTicket, ticketMessage } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";
import { notify } from "@/lib/notify-internal";

export type TicketRow = {
  id: string;
  ref: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string | null;
  reporterEmail: string | null;
  assignedTo: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  lastMessage: string | null;
};

/** Short, stable ticket reference shown throughout the Support Inbox / User Management Support Logs (`#TCK-0821`). */
function ticketRef(id: string): string {
  return `#TCK-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export type TicketMessageRow = {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type TicketDetail = TicketRow & {
  reporterId: string;
  reporterName: string;
  messages: TicketMessageRow[];
};

function relTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function createTicket(input: {
  subject: string;
  category: string;
  priority: string;
  description: string;
  email?: string;
  orderId?: string;
}): Promise<{ id: string }> {
  const uid = await requireUserId();
  const [row] = await db.insert(supportTicket).values({
    reporterId: uid,
    reporterEmail: input.email || null,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    description: input.description,
    orderId: input.orderId || null,
    status: "open",
  }).returning({ id: supportTicket.id });

  if (input.description) {
    await db.insert(ticketMessage).values({
      ticketId: row.id,
      senderId: uid,
      senderRole: "user",
      body: input.description,
    });
  }

  revalidatePath("/dashboard/support");
  return { id: row.id };
}

export async function getMyTickets(): Promise<TicketRow[]> {
  const uid = await requireUserId();
  const rows = await db.execute(sql`
    SELECT t.*,
           (SELECT count(*) FROM ticket_message WHERE ticket_id = t.id) AS message_count,
           (SELECT body FROM ticket_message WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM support_ticket t
    WHERE t.reporter_id = ${uid}
    ORDER BY t.created_at DESC
    LIMIT 50
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    ref: ticketRef(String(r.id)),
    subject: String(r.subject ?? ""),
    category: String(r.category ?? "other"),
    priority: String(r.priority ?? "medium"),
    status: String(r.status ?? "open"),
    description: r.description ? String(r.description) : null,
    reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    orderId: r.order_id ? String(r.order_id) : null,
    createdAt: relTime(new Date(String(r.created_at))),
    updatedAt: relTime(new Date(String(r.updated_at))),
    resolvedAt: r.resolved_at ? relTime(new Date(String(r.resolved_at))) : null,
    messageCount: Number(r.message_count ?? 0),
    lastMessage: r.last_message ? String(r.last_message) : null,
  }));
}

export async function getTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  const uid = await requireUserId();
  const [t] = await db.select().from(supportTicket)
    .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.reporterId, uid)))
    .limit(1);
  if (!t) return null;

  const msgs = await db.execute(sql`
    SELECT tm.id, tm.sender_id, tm.sender_role, tm.body, tm.created_at,
           COALESCE(u.name, 'Support') AS sender_name
    FROM ticket_message tm
    LEFT JOIN "user" u ON u.id = tm.sender_id
    WHERE tm.ticket_id = ${ticketId}
    ORDER BY tm.created_at ASC
  `);

  return {
    id: t.id,
    ref: ticketRef(t.id),
    reporterId: t.reporterId,
    reporterName: "",
    subject: t.subject,
    category: t.category ?? "other",
    priority: t.priority ?? "medium",
    status: t.status ?? "open",
    description: t.description,
    reporterEmail: t.reporterEmail,
    assignedTo: t.assignedTo,
    orderId: t.orderId,
    createdAt: relTime(new Date(t.createdAt)),
    updatedAt: relTime(new Date(t.updatedAt)),
    resolvedAt: t.resolvedAt ? relTime(new Date(t.resolvedAt)) : null,
    messageCount: msgs.rows.length,
    lastMessage: null,
    messages: (msgs.rows as Record<string, unknown>[]).map((m) => ({
      id: String(m.id),
      senderId: String(m.sender_id),
      senderRole: String(m.sender_role ?? "user"),
      senderName: String(m.sender_name ?? "Support"),
      body: String(m.body),
      createdAt: relTime(new Date(String(m.created_at))),
    })),
  };
}

export async function replyToTicket(ticketId: string, body: string): Promise<void> {
  const uid = await requireUserId();
  const [t] = await db.select().from(supportTicket)
    .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.reporterId, uid)))
    .limit(1);
  if (!t) throw new Error("Ticket not found");

  await db.insert(ticketMessage).values({
    ticketId,
    senderId: uid,
    senderRole: "user",
    body,
  });

  if (t.status === "resolved" || t.status === "closed") {
    await db.update(supportTicket).set({ status: "open", updatedAt: new Date() }).where(eq(supportTicket.id, ticketId));
  } else {
    await db.update(supportTicket).set({ updatedAt: new Date() }).where(eq(supportTicket.id, ticketId));
  }

  revalidatePath("/dashboard/support");
}

/* ─── Admin-facing functions ──────────────────────────────────────────────── */
/* Each of these must call requireAdmin(). They previously had no auth of any
   kind, so an anonymous caller could read every ticket — reporter names, emails
   and message bodies — and close, reassign or send reminders on any of them. */

export async function getAdminTickets(): Promise<(TicketRow & { reporterName: string; reporterId: string })[]> {
  await requireAdmin();
  const rows = await db.execute(sql`
    SELECT t.*,
           u.name AS reporter_name,
           (SELECT count(*) FROM ticket_message WHERE ticket_id = t.id) AS message_count,
           (SELECT body FROM ticket_message WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM support_ticket t
    LEFT JOIN "user" u ON u.id = t.reporter_id
    ORDER BY
      CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'resolved' THEN 3 WHEN 'closed' THEN 4 ELSE 5 END,
      t.created_at DESC
    LIMIT 200
  `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    ref: ticketRef(String(r.id)),
    reporterId: String(r.reporter_id),
    reporterName: String(r.reporter_name ?? "Unknown"),
    subject: String(r.subject ?? ""),
    category: String(r.category ?? "other"),
    priority: String(r.priority ?? "medium"),
    status: String(r.status ?? "open"),
    description: r.description ? String(r.description) : null,
    reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    orderId: r.order_id ? String(r.order_id) : null,
    createdAt: relTime(new Date(String(r.created_at))),
    updatedAt: relTime(new Date(String(r.updated_at))),
    resolvedAt: r.resolved_at ? relTime(new Date(String(r.resolved_at))) : null,
    messageCount: Number(r.message_count ?? 0),
    lastMessage: r.last_message ? String(r.last_message) : null,
  }));
}

export async function getAdminTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  await requireAdmin();
  const [t] = await db.select().from(supportTicket).where(eq(supportTicket.id, ticketId)).limit(1);
  if (!t) return null;

  const msgs = await db.execute(sql`
    SELECT tm.id, tm.sender_id, tm.sender_role, tm.body, tm.created_at,
           COALESCE(u.name, 'Support') AS sender_name
    FROM ticket_message tm
    LEFT JOIN "user" u ON u.id = tm.sender_id
    WHERE tm.ticket_id = ${ticketId}
    ORDER BY tm.created_at ASC
  `);

  const reporter = await db.execute(sql`SELECT name FROM "user" WHERE id = ${t.reporterId} LIMIT 1`);
  const reporterName = String((reporter.rows[0] as Record<string, unknown>)?.name ?? "Unknown");

  return {
    id: t.id,
    ref: ticketRef(t.id),
    reporterId: t.reporterId,
    reporterName,
    subject: t.subject,
    category: t.category ?? "other",
    priority: t.priority ?? "medium",
    status: t.status ?? "open",
    description: t.description,
    reporterEmail: t.reporterEmail,
    assignedTo: t.assignedTo,
    orderId: t.orderId,
    createdAt: relTime(new Date(t.createdAt)),
    updatedAt: relTime(new Date(t.updatedAt)),
    resolvedAt: t.resolvedAt ? relTime(new Date(t.resolvedAt)) : null,
    messageCount: msgs.rows.length,
    lastMessage: null,
    messages: (msgs.rows as Record<string, unknown>[]).map((m) => ({
      id: String(m.id),
      senderId: String(m.sender_id),
      senderRole: String(m.sender_role ?? "user"),
      senderName: String(m.sender_name ?? "Support"),
      body: String(m.body),
      createdAt: relTime(new Date(String(m.created_at))),
    })),
  };
}

export async function adminReplyToTicket(ticketId: string, body: string): Promise<void> {
  const adminId = await requireUserId();

  await db.insert(ticketMessage).values({
    ticketId,
    senderId: adminId,
    senderRole: "admin",
    body,
  });

  await db.update(supportTicket).set({ status: "in_progress", updatedAt: new Date() }).where(eq(supportTicket.id, ticketId));

  const [t] = await db.select().from(supportTicket).where(eq(supportTicket.id, ticketId)).limit(1);
  if (t) {
    await notify(t.reporterId, {
      type: "support",
      title: "Support replied to your ticket",
      body: `Re: ${t.subject}`,
      href: "/dashboard/support",
    });
  }

  revalidatePath("/admin/disputes");
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<void> {
  await requireAdmin();
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "resolved" || status === "closed") updates.resolvedAt = new Date();
  await db.update(supportTicket).set(updates as Record<string, Date>).where(eq(supportTicket.id, ticketId));
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/support-inbox");
  revalidatePath("/admin/user-management");
}

/** "Send Reminder" kebab item on a Pending ticket (User Management → Support Logs, image 132) — nudges the reporter. */
export async function sendTicketReminder(ticketId: string): Promise<void> {
  await requireAdmin();
  const [t] = await db.select().from(supportTicket).where(eq(supportTicket.id, ticketId)).limit(1);
  if (!t) throw new Error("Ticket not found");
  await notify(t.reporterId, {
    type: "support",
    title: "Reminder: we're waiting on your reply",
    body: `Re: ${t.subject}`,
    href: "/dashboard/support",
  });
}

export async function assignTicket(ticketId: string, adminId: string | null): Promise<void> {
  await requireAdmin();
  await db.update(supportTicket).set({ assignedTo: adminId, updatedAt: new Date() }).where(eq(supportTicket.id, ticketId));
  revalidatePath("/admin/disputes");
}

export async function getTicketStats(): Promise<{ open: number; inProgress: number; resolved: number; closed: number; total: number }> {
  await requireAdmin();
  const rows = await db.execute(sql`
    SELECT status, count(*) AS cnt FROM support_ticket GROUP BY status
  `);
  const map: Record<string, number> = {};
  for (const r of rows.rows as { status: string; cnt: number }[]) {
    map[r.status] = Number(r.cnt);
  }
  return {
    open: map.open ?? 0,
    inProgress: map.in_progress ?? 0,
    resolved: map.resolved ?? 0,
    closed: map.closed ?? 0,
    total: Object.values(map).reduce((s, v) => s + v, 0),
  };
}
