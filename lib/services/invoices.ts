"use server";

import { and, eq, or, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoice, salesOrder, orderItem, company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";

export type InvoiceRow = {
  id: string; invoiceNumber: string; type: string;
  issuerName: string; issuerAddress: string | null;
  recipientName: string; recipientCompany: string | null; recipientAddress: string | null; recipientEmail: string | null;
  subtotal: number; vat: number; vatRate: number; shipping: number; discount: number; total: number;
  currency: string; status: string;
  issuedAt: string; dueAt: string | null; paidAt: string | null;
  notes: string | null;
  items: { name: string; qty: number; unitPrice: number; image: string | null }[];
};

const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

/** Confirm the caller is a party to this order. Invoices carry the recipient's
 *  name, address, email and amounts, and every entry point here took a bare id
 *  with no auth — one of them creating an invoice as a side effect. */
async function assertOrderParty(orderId: string): Promise<void> {
  const uid = await requireUserId();
  const [row] = await db.select({ id: salesOrder.id }).from(salesOrder)
    .where(and(eq(salesOrder.id, orderId), or(eq(salesOrder.buyerUserId, uid), eq(salesOrder.vendorUserId, uid))))
    .limit(1);
  if (!row) throw new Error("Order not found");
}

export async function generateInvoiceForOrder(orderId: string): Promise<string> {
  await assertOrderParty(orderId);
  const [existing] = await db.select({ id: invoice.id }).from(invoice).where(eq(invoice.orderId, orderId)).limit(1);
  if (existing) return existing.id;

  const [order] = await db.select().from(salesOrder).where(eq(salesOrder.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));

  let issuerName = "Nomarc Vendor";
  let issuerAddress: string | null = null;
  if (order.vendorCompanyId) {
    const [co] = await db.select({ name: company.name, hq: company.headquarters }).from(company).where(eq(company.id, order.vendorCompanyId)).limit(1);
    if (co) { issuerName = co.name; issuerAddress = co.hq; }
  }

  const countResult = await db.execute(sql`SELECT COUNT(*)::int as c FROM invoice`);
  const seq = (Number((countResult.rows[0] as { c: number }).c) || 0) + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

  const [inv] = await db.insert(invoice).values({
    invoiceNumber,
    orderId,
    type: "order",
    issuerCompanyId: order.vendorCompanyId,
    issuerName,
    issuerAddress,
    recipientUserId: order.buyerUserId,
    recipientName: order.customerName,
    recipientCompany: order.customerCompany,
    recipientAddress: order.address,
    subtotal: order.subtotal ?? 0,
    vat: order.vat ?? 0,
    vatRate: 750,
    shipping: order.shipping ?? 0,
    total: order.total ?? 0,
    status: order.payment === "paid" ? "paid" : "issued",
    paidAt: order.payment === "paid" ? new Date() : null,
    notes: `Order reference: #NMC-${orderId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
  }).returning({ id: invoice.id });

  return inv.id;
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceRow | null> {
  try {
    const [inv] = await db.select().from(invoice).where(eq(invoice.id, invoiceId)).limit(1);
    if (!inv) return null;
    if (inv.orderId) await assertOrderParty(inv.orderId);
    else await requireUserId();

    let items: { name: string; qty: number; unitPrice: number; image: string | null }[] = [];
    if (inv.orderId) {
      const ois = await db.select().from(orderItem).where(eq(orderItem.orderId, inv.orderId));
      items = ois.map((oi) => ({ name: oi.name, qty: oi.qty, unitPrice: oi.unitPrice, image: oi.image }));
    }

    return {
      id: inv.id, invoiceNumber: inv.invoiceNumber, type: inv.type ?? "order",
      issuerName: inv.issuerName ?? "Nomarc Vendor",
      issuerAddress: inv.issuerAddress,
      recipientName: inv.recipientName ?? "",
      recipientCompany: inv.recipientCompany,
      recipientAddress: inv.recipientAddress,
      recipientEmail: inv.recipientEmail,
      subtotal: inv.subtotal ?? 0, vat: inv.vat ?? 0, vatRate: inv.vatRate ?? 750,
      shipping: inv.shipping ?? 0, discount: inv.discount ?? 0, total: inv.total ?? 0,
      currency: inv.currency ?? "NGN", status: inv.status ?? "issued",
      issuedAt: fmt(inv.issuedAt) ?? "", dueAt: fmt(inv.dueAt), paidAt: fmt(inv.paidAt),
      notes: inv.notes, items,
    };
  } catch { return null; }
}

export async function getInvoiceByOrderId(orderId: string): Promise<InvoiceRow | null> {
  try {
    await assertOrderParty(orderId);
    const [inv] = await db.select({ id: invoice.id }).from(invoice).where(eq(invoice.orderId, orderId)).limit(1);
    if (!inv) {
      const newId = await generateInvoiceForOrder(orderId);
      return getInvoiceById(newId);
    }
    return getInvoiceById(inv.id);
  } catch { return null; }
}
