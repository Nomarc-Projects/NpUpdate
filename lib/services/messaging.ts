"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { conversation, conversationParticipant, message } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type ConvoSummary = {
  id: string; kind: string; otherId: string; name: string; avatarUrl: string; headline: string;
  preview: string; time: string; unread: number; archived: boolean;
};
export type MessageType = "text" | "image" | "video" | "audio" | "document" | "contact" | "poll" | "event";
export type ChatMessage = {
  id: string; mine: boolean; body: string; messageType: MessageType;
  attachmentUrl: string | null; metadata: Record<string, unknown> | null;
  time: string; createdAt: string;
};
export type ChatThread = { id: string; otherId: string; name: string; avatarUrl: string; headline: string; online: boolean; lastSeen: string | null; messages: ChatMessage[] };

function rel(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Find (or create) the 1:1 DM conversation between me and `otherUserId`. */
export async function getOrCreateDirectConversation(otherUserId: string): Promise<string> {
  const uid = await requireUserId();
  if (otherUserId === uid) throw new Error("You can't message yourself");
  const found = await db.execute(sql`
    SELECT c.id FROM conversation c
    JOIN conversation_participant a ON a.conversation_id = c.id AND a.user_id = ${uid}
    JOIN conversation_participant b ON b.conversation_id = c.id AND b.user_id = ${otherUserId}
    WHERE c.kind = 'dm' LIMIT 1
  `);
  const existing = (found.rows as { id: string }[])[0];
  if (existing) return existing.id;

  const [c] = await db.insert(conversation).values({ kind: "dm" }).returning({ id: conversation.id });
  await db.insert(conversationParticipant).values([
    { conversationId: c.id, userId: uid },
    { conversationId: c.id, userId: otherUserId },
  ]);
  revalidatePath("/dashboard/messages");
  return c.id;
}

// Degrades to an empty inbox rather than throwing — messages/page.tsx awaits
// this bare, so a dropped connection took the whole page to the error boundary.
export async function getMyConversations(): Promise<ConvoSummary[]> {
  try {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT c.id, c.kind, c.updated_at, me_part.archived,
           other.user_id AS other_id, u.name,
           COALESCE(p.avatar_url, u.image) AS avatar, COALESCE(p.headline,'') AS headline,
           lm.body AS last_body, lm.created_at AS last_at,
           (SELECT count(*) FROM message m2 WHERE m2.conversation_id = c.id AND m2.sender_user_id <> ${uid} AND m2.read_at IS NULL) AS unread
    FROM conversation_participant me_part
    JOIN conversation c ON c.id = me_part.conversation_id
    JOIN conversation_participant other ON other.conversation_id = c.id AND other.user_id <> ${uid}
    JOIN "user" u ON u.id = other.user_id
    LEFT JOIN profile p ON p.user_id = other.user_id
    LEFT JOIN LATERAL (SELECT body, created_at FROM message m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) lm ON true
    WHERE me_part.user_id = ${uid}
    ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), kind: String(r.kind ?? "dm"), otherId: String(r.other_id),
    name: String(r.name ?? "Member"), avatarUrl: String(r.avatar ?? ""), headline: String(r.headline ?? ""),
    preview: (r.last_body as string) ?? "No messages yet",
    time: r.last_at ? rel(new Date(String(r.last_at))) : "",
    unread: Number(r.unread ?? 0), archived: r.archived === true,
  }));
  } catch {
    return [];
  }
}

async function assertParticipant(conversationId: string, uid: string) {
  const [p] = await db.select({ id: conversationParticipant.id }).from(conversationParticipant)
    .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, uid))).limit(1);
  if (!p) throw new Error("Not found");
}

export async function getThread(conversationId: string): Promise<ChatThread | null> {
  const uid = await requireUserId();
  const part = await db.select({ id: conversationParticipant.id }).from(conversationParticipant)
    .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, uid))).limit(1);
  if (part.length === 0) return null;

  // mark incoming messages as read
  await db.update(message).set({ readAt: new Date() })
    .where(and(eq(message.conversationId, conversationId), sql`${message.senderUserId} <> ${uid}`, sql`${message.readAt} IS NULL`));

  // last_seen_at is added by migration 0012; tolerate its absence pre-migration.
  let other;
  try {
    other = await db.execute(sql`
      SELECT cp.user_id AS other_id, u.name, COALESCE(p.avatar_url, u.image) AS avatar, COALESCE(p.headline,'') AS headline,
             u.last_seen_at,
             (u.last_seen_at IS NOT NULL AND u.last_seen_at > now() - interval '90 seconds') AS online
      FROM conversation_participant cp JOIN "user" u ON u.id = cp.user_id
      LEFT JOIN profile p ON p.user_id = cp.user_id
      WHERE cp.conversation_id = ${conversationId} AND cp.user_id <> ${uid} LIMIT 1
    `);
  } catch {
    other = await db.execute(sql`
      SELECT cp.user_id AS other_id, u.name, COALESCE(p.avatar_url, u.image) AS avatar, COALESCE(p.headline,'') AS headline,
             NULL AS last_seen_at, false AS online
      FROM conversation_participant cp JOIN "user" u ON u.id = cp.user_id
      LEFT JOIN profile p ON p.user_id = cp.user_id
      WHERE cp.conversation_id = ${conversationId} AND cp.user_id <> ${uid} LIMIT 1
    `);
  }
  const o = (other.rows as Record<string, unknown>[])[0];
  const msgs = await db.select().from(message).where(eq(message.conversationId, conversationId)).orderBy(asc(message.createdAt));

  return {
    id: conversationId,
    otherId: o ? String(o.other_id) : "",
    name: o ? String(o.name ?? "Member") : "Member",
    avatarUrl: o ? String(o.avatar ?? "") : "",
    headline: o ? String(o.headline ?? "") : "",
    online: o ? o.online === true : false,
    lastSeen: o?.last_seen_at ? new Date(String(o.last_seen_at)).toISOString() : null,
    messages: msgs.map((m) => ({
      id: m.id, mine: m.senderUserId === uid, body: m.body,
      messageType: (m.messageType ?? "text") as MessageType,
      attachmentUrl: m.attachmentUrl,
      metadata: (m.metadata as Record<string, unknown>) ?? null,
      time: clock(new Date(m.createdAt)), createdAt: new Date(m.createdAt).toISOString(),
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  body: string,
  opts?: { type?: MessageType; attachmentUrl?: string; metadata?: Record<string, unknown> },
) {
  const uid = await requireUserId();
  await assertParticipant(conversationId, uid);
  const t = opts?.type ?? "text";
  const txt = body.trim();
  if (t === "text" && !txt) throw new Error("Message is empty");

  // First-chat limit (anti-spam): until the recipient replies or you're
  // connected, cap the number of opening messages you can send.
  const FIRST_CHAT_LIMIT = 3;
  const stat = await db.execute(sql`
    SELECT
      (SELECT user_id FROM conversation_participant WHERE conversation_id = ${conversationId} AND user_id <> ${uid} LIMIT 1) AS other_id,
      (SELECT count(*) FROM message WHERE conversation_id = ${conversationId} AND sender_user_id = ${uid}) AS my_count,
      (SELECT count(*) FROM message WHERE conversation_id = ${conversationId} AND sender_user_id <> ${uid}) AS their_count
  `);
  const s = (stat.rows as { other_id: string | null; my_count: number; their_count: number }[])[0];
  if (s?.other_id && Number(s.their_count) === 0 && Number(s.my_count) >= FIRST_CHAT_LIMIT) {
    let connected = false;
    try {
      const rel = await db.execute(sql`SELECT EXISTS(
        SELECT 1 FROM "follow" WHERE (follower_id = ${uid} AND followee_id = ${s.other_id}) OR (follower_id = ${s.other_id} AND followee_id = ${uid})
      ) AS connected`);
      connected = (rel.rows as { connected: boolean }[])[0]?.connected === true;
    } catch { /* pre-migration → treat as not connected */ }
    if (!connected) throw new Error(`You can send up to ${FIRST_CHAT_LIMIT} messages until they reply or you connect. Follow them to keep the conversation going.`);
  }

  await db.insert(message).values({
    conversationId, senderUserId: uid, body: txt || "",
    messageType: t,
    attachmentUrl: opts?.attachmentUrl ?? null,
    metadata: opts?.metadata ?? null,
  });
  await db.update(conversation).set({ updatedAt: new Date() }).where(eq(conversation.id, conversationId));
  revalidatePath("/dashboard/messages");
}

export async function votePoll(messageId: string, optionIndex: number) {
  const uid = await requireUserId();
  const [msg] = await db.select().from(message).where(eq(message.id, messageId)).limit(1);
  if (!msg || msg.messageType !== "poll") throw new Error("Not a poll");
  await assertParticipant(msg.conversationId, uid);

  const meta = (msg.metadata ?? {}) as { question?: string; options?: string[]; votes?: Record<string, number> };
  const opts = meta.options ?? [];
  if (optionIndex < 0 || optionIndex >= opts.length) throw new Error("Invalid option");
  const votes = { ...(meta.votes ?? {}) };
  votes[uid] = optionIndex;
  await db.update(message).set({ metadata: { ...meta, votes } }).where(eq(message.id, messageId));
  revalidatePath("/dashboard/messages");
}

export async function archiveConversation(conversationId: string, archived: boolean) {
  const uid = await requireUserId();
  await db.update(conversationParticipant).set({ archived })
    .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, uid)));
  revalidatePath("/dashboard/messages");
}

export async function getUnreadCount(): Promise<number> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT count(*) AS n FROM message m
    JOIN conversation_participant cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ${uid}
    WHERE m.sender_user_id <> ${uid} AND m.read_at IS NULL
  `);
  return Number((res.rows as { n: number }[])[0]?.n ?? 0);
}

export async function searchMessages(conversationId: string, query: string, date?: string): Promise<ChatMessage[]> {
  const uid = await requireUserId();
  await assertParticipant(conversationId, uid);
  const q = `%${query.toLowerCase()}%`;
  let dateFilter = sql`TRUE`;
  if (date) dateFilter = sql`${message.createdAt}::date = ${date}`;
  const msgs = await db.select().from(message)
    .where(and(eq(message.conversationId, conversationId), sql`lower(${message.body}) LIKE ${q}`, dateFilter))
    .orderBy(asc(message.createdAt));
  return msgs.map((m) => ({
    id: m.id, mine: m.senderUserId === uid, body: m.body,
    messageType: (m.messageType ?? "text") as MessageType,
    attachmentUrl: m.attachmentUrl, metadata: (m.metadata as Record<string, unknown>) ?? null,
    time: clock(new Date(m.createdAt)), createdAt: new Date(m.createdAt).toISOString(),
  }));
}

export async function getSharedMedia(conversationId: string): Promise<{ media: ChatMessage[]; docs: ChatMessage[]; links: ChatMessage[] }> {
  const uid = await requireUserId();
  await assertParticipant(conversationId, uid);
  // Use raw SQL to safely handle message_type column that may not exist pre-migration
  const rows = await db.execute(sql`
    SELECT id, sender_user_id, body,
           COALESCE(message_type, 'text') AS message_type,
           attachment_url, metadata, created_at
    FROM message
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `);
  const media: ChatMessage[] = [];
  const docs: ChatMessage[] = [];
  const links: ChatMessage[] = [];
  for (const r of rows.rows as Record<string, unknown>[]) {
    const mt = String(r.message_type ?? "text") as MessageType;
    const body = String(r.body ?? "");
    const cm: ChatMessage = {
      id: String(r.id), mine: r.sender_user_id === uid, body,
      messageType: mt,
      attachmentUrl: r.attachment_url ? String(r.attachment_url) : null,
      metadata: (r.metadata as Record<string, unknown>) ?? null,
      time: clock(new Date(String(r.created_at))),
      createdAt: new Date(String(r.created_at)).toISOString(),
    };
    if (mt === "image" || mt === "video") media.push(cm);
    else if (mt === "document" || mt === "audio") docs.push(cm);
    else if ((mt === "text") && body.match(/https?:\/\//)) links.push(cm);
  }
  return { media, docs, links };
}

export async function clearChat(conversationId: string) {
  const uid = await requireUserId();
  await assertParticipant(conversationId, uid);
  await db.delete(message).where(eq(message.conversationId, conversationId));
  revalidatePath("/dashboard/messages");
}

export async function deleteConversation(conversationId: string) {
  const uid = await requireUserId();
  await assertParticipant(conversationId, uid);
  await db.delete(conversationParticipant)
    .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, uid)));
  revalidatePath("/dashboard/messages");
}

export async function muteConversation(conversationId: string, muted: boolean) {
  const uid = await requireUserId();
  await db.update(conversationParticipant).set({ muted })
    .where(and(eq(conversationParticipant.conversationId, conversationId), eq(conversationParticipant.userId, uid)));
  revalidatePath("/dashboard/messages");
}
