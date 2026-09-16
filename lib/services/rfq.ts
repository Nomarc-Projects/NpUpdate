"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { quoteRequest, product, company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

export type QuoteRow = {
  id: string; productId: string | null; productName: string; counterpartyName: string; counterpartyAvatar: string;
  quantity: string | null; requiredBy: string | null; deliveryLocation: string | null; message: string | null;
  status: string; date: string; archived: boolean;
};

function shortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export async function createQuoteRequest(input: {
  productId: string; quantity?: string; requiredBy?: string; deliveryLocation?: string; message?: string;
}) {
  const uid = await requireUserId();
  if (!input.productId) throw new Error("Missing product");
  const res = await db.execute(sql`
    SELECT p.name, c.owner_user_id FROM product p JOIN company c ON c.id = p.company_id WHERE p.id = ${input.productId} LIMIT 1
  `);
  const row = (res.rows as { name: string; owner_user_id: string }[])[0];
  if (!row) throw new Error("Product not found");
  if (row.owner_user_id === uid) throw new Error("This is your own product");

  await db.insert(quoteRequest).values({
    productId: input.productId, buyerUserId: uid, exhibitorUserId: row.owner_user_id,
    quantity: input.quantity || null, requiredBy: input.requiredBy || null,
    deliveryLocation: input.deliveryLocation || null, message: input.message || null, status: "pending",
  });
  await notify(row.owner_user_id, {
    type: "quote", title: `New quote request — ${row.name}`,
    body: input.quantity ? `Quantity: ${input.quantity}` : "A buyer requested a quote.",
    href: "/dashboard/quotes",
  });
  revalidatePath("/dashboard/quotes");
}

/** RFQs sent to me as an exhibitor (inbox). */
export async function getIncomingQuotes(): Promise<QuoteRow[]> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT q.id, q.product_id, q.quantity, q.required_by, q.delivery_location, q.message, q.status, q.created_at, q.archived_at,
           COALESCE(p.name,'Product') AS product_name,
           u.name AS buyer_name, COALESCE(pr.avatar_url, u.image) AS buyer_avatar
    FROM quote_request q
    LEFT JOIN product p ON p.id = q.product_id
    JOIN "user" u ON u.id = q.buyer_user_id
    LEFT JOIN profile pr ON pr.user_id = q.buyer_user_id
    WHERE q.exhibitor_user_id = ${uid}
    ORDER BY q.created_at DESC
  `);
  return mapRows(res.rows as Record<string, unknown>[], "buyer");
}

/** RFQs I sent as a buyer. */
export async function getSentQuotes(): Promise<QuoteRow[]> {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT q.id, q.product_id, q.quantity, q.required_by, q.delivery_location, q.message, q.status, q.created_at, q.archived_at,
           COALESCE(p.name,'Product') AS product_name,
           u.name AS exh_name, COALESCE(pr.avatar_url, u.image) AS exh_avatar
    FROM quote_request q
    LEFT JOIN product p ON p.id = q.product_id
    LEFT JOIN "user" u ON u.id = q.exhibitor_user_id
    LEFT JOIN profile pr ON pr.user_id = q.exhibitor_user_id
    WHERE q.buyer_user_id = ${uid}
    ORDER BY q.created_at DESC
  `);
  return mapRows(res.rows as Record<string, unknown>[], "exh");
}

function mapRows(rows: Record<string, unknown>[], who: "buyer" | "exh"): QuoteRow[] {
  return rows.map((r) => ({
    id: String(r.id), productId: r.product_id ? String(r.product_id) : null,
    productName: String(r.product_name ?? "Product"),
    counterpartyName: String(r[`${who}_name`] ?? "—"),
    counterpartyAvatar: String(r[`${who}_avatar`] ?? ""),
    quantity: (r.quantity as string) ?? null, requiredBy: r.required_by ? shortDate(String(r.required_by)) : null,
    deliveryLocation: (r.delivery_location as string) ?? null, message: (r.message as string) ?? null,
    status: String(r.status ?? "pending"), date: r.created_at ? shortDate(String(r.created_at)) : "",
    archived: !!r.archived_at,
  }));
}

export type QuoteDetail = QuoteRow & {
  buyerName: string; buyerEmail: string; buyerCompany: string | null;
  vendorName: string; vendorCompany: string | null;
  productImage: string | null; productPrice: number | null;
  isBuyer: boolean;
};

export async function getQuoteById(id: string): Promise<QuoteDetail | null> {
  try {
    const uid = await requireUserId();
    const res = await db.execute(sql`
      SELECT q.*,
        COALESCE(p.name, 'Product') as product_name, p.cover_url as product_image,
        p.retail_min as product_price,
        bu.name as buyer_name, bu.email as buyer_email,
        bp.headline as buyer_headline,
        eu.name as vendor_name, eu.email as vendor_email,
        c.name as vendor_company,
        (SELECT customer_company FROM sales_order WHERE buyer_user_id = q.buyer_user_id LIMIT 1) as buyer_company
      FROM quote_request q
      LEFT JOIN product p ON p.id = q.product_id
      JOIN "user" bu ON bu.id = q.buyer_user_id
      LEFT JOIN profile bp ON bp.user_id = q.buyer_user_id
      LEFT JOIN "user" eu ON eu.id = q.exhibitor_user_id
      LEFT JOIN company c ON c.owner_user_id = q.exhibitor_user_id
      WHERE q.id = ${id}
        AND (q.buyer_user_id = ${uid} OR q.exhibitor_user_id = ${uid})
      LIMIT 1
    `);
    const r = (res.rows as Record<string, unknown>[])[0];
    if (!r) return null;
    const isBuyer = String(r.buyer_user_id) === uid;
    return {
      id: String(r.id), productId: r.product_id ? String(r.product_id) : null,
      productName: String(r.product_name), productImage: r.product_image ? String(r.product_image) : null,
      productPrice: r.product_price ? Number(r.product_price) : null,
      counterpartyName: isBuyer ? String(r.vendor_name ?? "—") : String(r.buyer_name ?? "—"),
      counterpartyAvatar: "",
      quantity: r.quantity ? String(r.quantity) : null,
      requiredBy: r.required_by ? shortDate(String(r.required_by)) : null,
      deliveryLocation: r.delivery_location ? String(r.delivery_location) : null,
      message: r.message ? String(r.message) : null,
      status: String(r.status ?? "pending"),
      date: r.created_at ? shortDate(String(r.created_at)) : "",
      archived: !!r.archived_at,
      buyerName: String(r.buyer_name ?? ""), buyerEmail: String(r.buyer_email ?? ""),
      buyerCompany: r.buyer_company ? String(r.buyer_company) : null,
      vendorName: String(r.vendor_name ?? ""), vendorCompany: r.vendor_company ? String(r.vendor_company) : null,
      isBuyer,
    };
  } catch { return null; }
}

export async function respondToQuote(id: string, status: "quoted" | "declined" | "clarify", responseMessage?: string) {
  const uid = await requireUserId();
  const res = await db.execute(sql`
    SELECT q.buyer_user_id, COALESCE(p.name,'your request') AS product_name
    FROM quote_request q LEFT JOIN product p ON p.id = q.product_id
    WHERE q.id = ${id} AND q.exhibitor_user_id = ${uid} LIMIT 1
  `);
  const row = (res.rows as { buyer_user_id: string; product_name: string }[])[0];
  if (!row) throw new Error("Not allowed");
  await db.update(quoteRequest).set({ status }).where(eq(quoteRequest.id, id));
  const label = status === "quoted" ? "responded with a quote" : status === "declined" ? "declined your request" : "asked for more details";
  await notify(row.buyer_user_id, {
    type: "quote", title: `A supplier ${label}`,
    body: responseMessage || `Re: ${row.product_name}`,
    href: "/dashboard/quotes",
  });
  revalidatePath("/dashboard/quotes");
}
