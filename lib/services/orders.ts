"use server";

import { headers } from "next/headers";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { salesOrder, orderItem, vendorWallet, vendorPaymentAccount, ledgerEntry, product, productVariant, company, quoteRequest } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { notify } from "@/lib/notify-internal";

export type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type EscrowState = "held" | "released" | "refunded";
export type OrderLine = { name: string; qty: number; unitPrice: number; image: string };
export type OrderRow = {
  id: string; ref: string; customer: string; company: string; date: string;
  items: OrderLine[]; total: number; payment: PaymentStatus; status: OrderStatus;
  delivery: string; address: string; phone: string; escrowState: EscrowState;
};

const bump = () => { revalidatePath("/dashboard/orders"); revalidatePath("/dashboard/my-orders"); revalidatePath("/dashboard/wallet"); };
const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const refOf = (id: string) => `#NMC-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

async function sessionUser() {
  const s = await auth.api.getSession({ headers: await headers() });
  const u = s?.user as { id?: string; name?: string; email?: string } | undefined;
  return { name: u?.name ?? "Customer", email: u?.email ?? "" };
}

async function addToHeldWallet(companyId: string, amount: number) {
  const [w] = await db.select().from(vendorWallet).where(eq(vendorWallet.companyId, companyId)).limit(1);
  if (w) await db.update(vendorWallet).set({ balanceHeld: (w.balanceHeld ?? 0) + amount, updatedAt: new Date() }).where(eq(vendorWallet.companyId, companyId));
  else await db.insert(vendorWallet).values({ companyId, balanceHeld: amount, balanceAvailable: 0 });
}

type OrderLineInput = { productId: string | null; variantId?: string | null; name: string; qty: number; unitPrice: number; image: string | null };

/** Core: create + (demo) settle an order for a single vendor — one or more
 *  line items (a single-product buy/quote-accept, or one vendor's slice of
 *  a multi-vendor cart checkout). */
async function placeOrder(opts: {
  buyerUserId: string; buyerName: string; buyerCompany?: string;
  vendorCompanyId: string; vendorUserId: string | null;
  items: OrderLineInput[];
  delivery: string; address: string; phone: string;
  paymentRef?: string; provider?: string;
}): Promise<string> {
  const subtotal = opts.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const vat = Math.round(subtotal * 0.075);
  const shipping = /pickup/i.test(opts.delivery) ? 0 : 0; // demo: free / arranged
  const total = subtotal + vat + shipping;

  const [acct] = await db.select({ pct: vendorPaymentAccount.commissionPct }).from(vendorPaymentAccount).where(eq(vendorPaymentAccount.companyId, opts.vendorCompanyId)).limit(1);
  const pct = acct?.pct ?? 10;
  const commission = Math.round((subtotal * pct) / 100);
  const vendorNet = subtotal - commission;

  // Demo payment: mark paid immediately. (Real path sets pending → webhook flips to paid.)
  const [row] = await db.insert(salesOrder).values({
    buyerUserId: opts.buyerUserId, vendorCompanyId: opts.vendorCompanyId, vendorUserId: opts.vendorUserId,
    customerName: opts.buyerName, customerCompany: opts.buyerCompany ?? null,
    status: "processing", payment: "paid", subtotal, shipping, vat, commission, vendorNet, total,
    deliveryMethod: opts.delivery, address: opts.address, phone: opts.phone,
    paymentRef: opts.paymentRef ?? `demo_${Date.now()}`, provider: opts.provider ?? "demo", escrowState: "held",
  }).returning({ id: salesOrder.id });

  await db.insert(orderItem).values(
    opts.items.map((i) => ({ orderId: row.id, productId: i.productId, variantId: i.variantId || null, name: i.name, qty: i.qty, unitPrice: i.unitPrice, image: i.image })),
  );

  // Ledger: vendor earns net (held in escrow until delivery), platform takes commission.
  await db.insert(ledgerEntry).values([
    { orderId: row.id, vendorCompanyId: opts.vendorCompanyId, type: "sale", amount: vendorNet, status: "held", note: `Sale ${refOf(row.id)}` },
    { orderId: row.id, vendorCompanyId: opts.vendorCompanyId, type: "commission", amount: -commission, status: "paid", note: `Marketplace commission (${pct}%)` },
  ]);
  await addToHeldWallet(opts.vendorCompanyId, vendorNet);
  if (opts.vendorUserId) {
    const label = opts.items.length > 1 ? `${opts.items[0].name} +${opts.items.length - 1} more` : opts.items[0].name;
    await notify(opts.vendorUserId, { type: "order", title: "New order", body: `${opts.buyerName} ordered ${label}`, href: `/dashboard/orders/${row.id}` }).catch(() => {});
  }
  bump();
  return row.id;
}

/** Buyer buys a product directly (demo checkout). */
export async function createOrder(input: { productId: string; variantId?: string; qty: number; unitPrice: number; delivery?: string; address?: string; phone?: string }): Promise<string> {
  const uid = await requireUserId();
  const me = await sessionUser();
  const [p] = await db.select().from(product).where(eq(product.id, input.productId)).limit(1);
  if (!p) throw new Error("Product not found");
  const [co] = await db.select({ ownerUserId: company.ownerUserId }).from(company).where(eq(company.id, p.companyId)).limit(1);
  let itemName = p.name;
  let unitPrice = input.unitPrice || p.retailMin || 0;
  if (input.variantId) {
    const [v] = await db.select().from(productVariant).where(and(eq(productVariant.id, input.variantId), eq(productVariant.productId, p.id))).limit(1);
    if (v) { itemName = `${p.name} — ${v.name}`; unitPrice = input.unitPrice || v.price || unitPrice; }
  }
  return placeOrder({
    buyerUserId: uid, buyerName: me.name, vendorCompanyId: p.companyId, vendorUserId: co?.ownerUserId ?? null,
    items: [{ productId: p.id, variantId: input.variantId ?? null, name: itemName, qty: Math.max(1, input.qty), unitPrice, image: p.coverUrl ?? null }],
    delivery: input.delivery || "Courier delivery", address: input.address || "", phone: input.phone || "",
  });
}

/** Create an order when a buyer accepts an exhibitor's quote. */
export async function createOrderFromQuote(quoteId: string): Promise<string> {
  const uid = await requireUserId();
  const me = await sessionUser();
  const [q] = await db.select().from(quoteRequest).where(eq(quoteRequest.id, quoteId)).limit(1);
  if (!q) throw new Error("Quote not found");
  if (!q.productId) throw new Error("This quote has no linked product");
  await db.update(quoteRequest).set({ status: "accepted" }).where(eq(quoteRequest.id, quoteId));
  const [p] = await db.select().from(product).where(eq(product.id, q.productId)).limit(1);
  if (!p) throw new Error("Product not found");
  const [co] = await db.select({ ownerUserId: company.ownerUserId }).from(company).where(eq(company.id, p.companyId)).limit(1);
  const qty = parseInt(String(q.quantity ?? "1").replace(/[^0-9]/g, ""), 10) || 1;
  return placeOrder({
    buyerUserId: uid, buyerName: me.name, vendorCompanyId: p.companyId, vendorUserId: co?.ownerUserId ?? null,
    items: [{ productId: p.id, name: p.name, qty, unitPrice: p.retailMin || 0, image: p.coverUrl ?? null }],
    delivery: q.deliveryLocation ? `Deliver to ${q.deliveryLocation}` : "Courier delivery", address: q.deliveryLocation ?? "", phone: "",
  });
}

/** One line in a multi-vendor cart checkout, already grouped by vendor company
 *  (mirrors `groupByVendor` from `lib/store/cart.ts`). */
export type CartCheckoutItem = { productId: string; variantId?: string; name: string; qty: number; unitPrice: number; image: string };
export type CartCheckoutGroup = { vendorCompanyId?: string; vendorName: string; items: CartCheckoutItem[] };

/** Multi-vendor cart checkout: splits one buyer cart into N `salesOrder` rows
 *  (one per vendor company), sharing a single payment reference so they read
 *  as "one purchase" on the buyer side (thank-you page, my-orders grouping)
 *  while still settling independently per vendor (escrow, commission, wallet).
 *  Sequential inserts (no wrapping DB transaction) — same pattern `placeOrder`
 *  and every other write path in this file already uses. */
export async function createOrdersFromCart(input: {
  groups: CartCheckoutGroup[];
  delivery: string; address: string; phone: string;
  paymentRef: string; provider: string;
}): Promise<string[]> {
  const uid = await requireUserId();
  const me = await sessionUser();
  const ids: string[] = [];
  for (const g of input.groups) {
    if (g.items.length === 0) continue;
    if (!g.vendorCompanyId) throw new Error(`"${g.items[0].name}" isn't linked to a real supplier yet — remove it from your cart to continue.`);
    const [co] = await db.select({ ownerUserId: company.ownerUserId }).from(company).where(eq(company.id, g.vendorCompanyId)).limit(1);
    const id = await placeOrder({
      buyerUserId: uid, buyerName: me.name,
      vendorCompanyId: g.vendorCompanyId, vendorUserId: co?.ownerUserId ?? null,
      items: g.items.map((i) => ({ productId: i.productId || null, variantId: i.variantId || null, name: i.name, qty: i.qty, unitPrice: i.unitPrice, image: i.image || null })),
      delivery: input.delivery, address: input.address, phone: input.phone,
      paymentRef: input.paymentRef, provider: input.provider,
    });
    ids.push(id);
  }
  return ids;
}

/** All sales orders created by one checkout (shared payment reference) —
 *  used by the thank-you page to show every vendor sub-order for a purchase. */
export async function getOrdersByPaymentRef(reference: string): Promise<OrderRow[]> {
  try {
    // Scoped to the buyer who paid — references were otherwise enumerable.
    const uid = await requireUserId();
    const rows = await db.select().from(salesOrder)
      .where(and(eq(salesOrder.paymentRef, reference), eq(salesOrder.buyerUserId, uid)));
    return rowsToOrders(rows);
  } catch { return []; }
}

async function rowsToOrders(rows: (typeof salesOrder.$inferSelect)[]): Promise<OrderRow[]> {
  if (rows.length === 0) return [];
  const items = await db.select().from(orderItem).where(inArray(orderItem.orderId, rows.map((r) => r.id)));
  const byOrder = new Map<string, OrderLine[]>();
  for (const it of items) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push({ name: it.name, qty: it.qty, unitPrice: it.unitPrice, image: it.image ?? "" });
    byOrder.set(it.orderId, arr);
  }
  return rows.map((r) => ({
    id: r.id, ref: refOf(r.id), customer: r.customerName ?? "Customer", company: r.customerCompany ?? "",
    date: fmt(r.createdAt), items: byOrder.get(r.id) ?? [], total: r.total ?? 0,
    payment: (r.payment as PaymentStatus) ?? "pending", status: (r.status as OrderStatus) ?? "pending",
    delivery: r.deliveryMethod ?? "", address: r.address ?? "", phone: r.phone ?? "",
    escrowState: (r.escrowState as EscrowState) ?? "held",
  }));
}

/** Orders for the signed-in exhibitor's company. Resilient. */
export async function getVendorOrders(): Promise<OrderRow[]> {
  try {
    const uid = await requireUserId();
    const [c] = await db.select({ id: company.id }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
    const rows = await db.select().from(salesOrder)
      .where(c ? or(eq(salesOrder.vendorCompanyId, c.id), eq(salesOrder.vendorUserId, uid)) : eq(salesOrder.vendorUserId, uid))
      .orderBy(desc(salesOrder.createdAt));
    return rowsToOrders(rows);
  } catch { return []; }
}

/** Orders the signed-in buyer placed. Resilient. */
export async function getMyOrders(): Promise<OrderRow[]> {
  try {
    const uid = await requireUserId();
    const rows = await db.select().from(salesOrder).where(eq(salesOrder.buyerUserId, uid)).orderBy(desc(salesOrder.createdAt));
    return rowsToOrders(rows);
  } catch { return []; }
}

/** Scoped to the two parties on the order: the buyer, or the vendor who is
 *  fulfilling it. This was `where(eq(salesOrder.id, id))` with no auth at all,
 *  so any id read back a stranger's name, delivery address, phone and totals. */
export async function getOrderById(id: string): Promise<OrderRow | null> {
  try {
    const uid = await requireUserId();
    const [r] = await db.select().from(salesOrder)
      .where(and(eq(salesOrder.id, id), or(eq(salesOrder.buyerUserId, uid), eq(salesOrder.vendorUserId, uid))))
      .limit(1);
    if (!r) return null;
    return (await rowsToOrders([r]))[0] ?? null;
  } catch { return null; }
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const uid = await requireUserId();
  const [c] = await db.select({ id: company.id }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
  await db.update(salesOrder).set({ status, updatedAt: new Date() })
    .where(and(eq(salesOrder.id, id), c ? eq(salesOrder.vendorCompanyId, c.id) : eq(salesOrder.vendorUserId, uid)));

  // On completion, release escrow: held → available for this order's vendor net.
  if (status === "completed") {
    const [ord] = await db.select().from(salesOrder).where(eq(salesOrder.id, id)).limit(1);
    if (ord?.vendorCompanyId && ord.escrowState === "held") {
      await db.update(salesOrder).set({ escrowState: "released" }).where(eq(salesOrder.id, id));
      await db.update(ledgerEntry).set({ status: "available" }).where(and(eq(ledgerEntry.orderId, id), eq(ledgerEntry.type, "sale")));
      const [w] = await db.select().from(vendorWallet).where(eq(vendorWallet.companyId, ord.vendorCompanyId)).limit(1);
      if (w) {
        const net = ord.vendorNet ?? 0;
        await db.update(vendorWallet).set({ balanceHeld: Math.max(0, (w.balanceHeld ?? 0) - net), balanceAvailable: (w.balanceAvailable ?? 0) + net, updatedAt: new Date() }).where(eq(vendorWallet.companyId, ord.vendorCompanyId));
      }
    }
  }
  bump();
}
