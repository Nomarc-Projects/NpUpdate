"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { paymentTransaction, salesOrder } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import { activeProvider, getProvider, type ProviderName } from "@/lib/payments";
import { createOrdersFromCart, getOrdersByPaymentRef, type CartCheckoutGroup, type OrderRow } from "@/lib/services/orders";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * Multi-vendor marketplace checkout (Exhibition Hub cart) — mirrors
 * lib/services/billing.ts's checkout↔verify↔settle pattern (reference
 * generation, pending-transaction insert, provider.init→checkoutUrl,
 * webhook/callback settle with FOR UPDATE SKIP LOCKED + amount-guard +
 * idempotent CAS update) but adapted so ONE payment covers N `salesOrder`
 * rows (one per vendor company). Same `payment_transaction` table as
 * billing, distinguished by `kind: "cart"`; the cart contents/address are
 * stashed in `payload` (JSON) so a webhook — which only carries the
 * reference — can reconstruct and create the orders on settle.
 */

const APP_URL = resolveSiteUrl();

export type CheckoutAddress = { address: string; city: string; state: string; country: string; phone: string };

type CartPayload = {
  groups: CartCheckoutGroup[];
  address: string; // flattened delivery address string
  phone: string;
  delivery: string;
};

export type StartCartCheckoutInput = {
  groups: CartCheckoutGroup[];
  shipping: CheckoutAddress;
  deliveryMethod: string;
  provider: ProviderName;
};

export type StartCartResult = { demo?: boolean; checkoutUrl?: string; orderIds?: string[]; reference: string };

function flattenAddress(a: CheckoutAddress): string {
  return [a.address, a.city, a.state, a.country].filter(Boolean).join(", ");
}

function cartTotal(groups: CartCheckoutGroup[]): number {
  const subtotal = groups.reduce((s, g) => s + g.items.reduce((s2, i) => s2 + i.qty * i.unitPrice, 0), 0);
  const vat = Math.round(subtotal * 0.075);
  return subtotal + vat; // shipping is demo-free, mirrors placeOrder()
}

export async function startCartCheckout(input: StartCartCheckoutInput): Promise<StartCartResult> {
  const uid = await requireUserId();
  const total = cartTotal(input.groups);
  if (total <= 0) throw new Error("Your cart is empty");

  const reference = `nm_cart_${crypto.randomBytes(12).toString("hex")}`;
  const address = flattenAddress(input.shipping);
  const payload: CartPayload = { groups: input.groups, address, phone: input.shipping.phone, delivery: input.deliveryMethod };
  const provider = getProvider(input.provider);

  if (!provider?.isConfigured() || !activeProvider()) {
    // No gateway configured → demo: create the orders immediately, record a demo transaction.
    const orderIds = await createOrdersFromCart({ groups: input.groups, delivery: input.deliveryMethod, address, phone: input.shipping.phone, paymentRef: reference, provider: "demo" });
    await db.insert(paymentTransaction).values({
      userId: uid, plan: "cart", cycle: "one_time", amount: total, currency: "NGN",
      provider: "demo", reference, status: "success", verifiedAt: new Date(),
      kind: "cart", payload: JSON.stringify(payload),
    });
    revalidatePath("/dashboard/my-orders"); revalidatePath("/dashboard/orders");
    return { demo: true, orderIds, reference };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? "";
  await db.insert(paymentTransaction).values({
    userId: uid, plan: "cart", cycle: "one_time", amount: total, currency: "NGN",
    provider: provider.name, reference, status: "pending",
    kind: "cart", payload: JSON.stringify(payload),
  });
  const callbackUrl = `${APP_URL}/exhibition-hub/checkout/verify?reference=${reference}`;
  const { checkoutUrl } = await provider.init({ email, amountNaira: total, reference, callbackUrl, metadata: { uid, kind: "cart" } });
  return { checkoutUrl, reference };
}

/** Settle a cart transaction by RE-VERIFYING with the provider (source of
 *  truth). Locks the row, amount-guards, CAS-flips pending→success exactly
 *  once, and — only on that first flip — replays the stashed cart payload
 *  into real `salesOrder`/`orderItem` rows via createOrdersFromCart. */
async function settleCart(reference: string): Promise<"success" | "failed" | "pending"> {
  const lockResult = await db.execute(sql`
    SELECT id, user_id, amount, provider, status, payload
    FROM payment_transaction
    WHERE reference = ${reference} AND kind = 'cart'
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);
  const tx = (lockResult.rows as Record<string, unknown>[])[0];
  if (!tx) return "pending";
  if (tx.status === "success") return "success";

  const provider = getProvider(tx.provider as ProviderName);
  if (!provider || !provider.isConfigured()) return "pending";

  const result = await provider.verify(reference);

  if (result.status === "success") {
    if (result.amountNaira < (tx.amount as number)) {
      await db.update(paymentTransaction).set({ status: "failed" })
        .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")));
      throw new Error(`Amount mismatch: expected ${tx.amount}, got ${result.amountNaira}`);
    }
    const updated = await db.update(paymentTransaction)
      .set({ status: "success", verifiedAt: new Date() })
      .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")))
      .returning({ id: paymentTransaction.id });

    if (updated.length > 0) {
      // Idempotency guard: only create orders if this reference doesn't already have them
      // (a retried webhook could otherwise double-create — belt & suspenders alongside the CAS above).
      const existing = await getOrdersByPaymentRef(reference);
      if (existing.length === 0 && tx.payload) {
        const p = JSON.parse(String(tx.payload)) as CartPayload;
        await createOrdersFromCart({ groups: p.groups, delivery: p.delivery, address: p.address, phone: p.phone, paymentRef: reference, provider: String(tx.provider) });
      }
      revalidatePath("/dashboard/my-orders"); revalidatePath("/dashboard/orders");
    }
    return "success";
  }

  if (result.status === "failed") {
    await db.update(paymentTransaction).set({ status: "failed" })
      .where(and(eq(paymentTransaction.id, String(tx.id)), eq(paymentTransaction.status, "pending")));
    return "failed";
  }

  return "pending";
}

/** Called by the shared payments webhook route once it identifies a `kind: "cart"` transaction. */
export async function settleCartByWebhook(reference: string) {
  return settleCart(reference);
}

/** Called from the post-checkout callback page (`/exhibition-hub/checkout/verify`), scoped to the user. */
export async function verifyCartCheckout(reference: string): Promise<{ status: "success" | "failed" | "pending"; orderIds?: string[] }> {
  const uid = await requireUserId();
  const [tx] = await db.select().from(paymentTransaction).where(and(eq(paymentTransaction.reference, reference), eq(paymentTransaction.userId, uid))).limit(1);
  if (!tx) throw new Error("Transaction not found");
  const status = await settleCart(reference);
  if (status !== "success") return { status };
  const orders = await getOrdersByPaymentRef(reference);
  return { status, orderIds: orders.map((o) => o.id) };
}

/** Orders + payment summary for the thank-you page. Scoped to the current buyer. */
export async function getCheckoutSummary(reference: string): Promise<{ orders: OrderRow[]; reference: string } | null> {
  try {
    const uid = await requireUserId();
    const [tx] = await db.select().from(paymentTransaction).where(and(eq(paymentTransaction.reference, reference), eq(paymentTransaction.userId, uid))).limit(1);
    if (!tx) return null;
    const orders = await getOrdersByPaymentRef(reference);
    return { orders, reference };
  } catch { return null; }
}
