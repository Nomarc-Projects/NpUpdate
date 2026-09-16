"use server";

import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { ensureCompany } from "@/lib/company-internal";

export type CustomerRow = {
  buyerUserId: string;
  name: string;
  email: string;
  avatar: string | null;
  company: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  firstOrderDate: string;
  phone: string | null;
  address: string | null;
};

async function myCompanyId(): Promise<string> {
  const uid = await requireUserId();
  return ensureCompany(uid);
}

export async function getMyCustomers(): Promise<CustomerRow[]> {
  try {
    const companyId = await myCompanyId();
    const result = await db.execute(sql`
      SELECT
        o.buyer_user_id,
        u.name,
        u.email,
        u.image as avatar,
        MAX(o.customer_company) as company,
        COUNT(o.id)::int as order_count,
        COALESCE(SUM(o.total), 0)::int as total_spent,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date,
        MAX(o.phone) as phone,
        MAX(o.address) as address
      FROM sales_order o
      JOIN "user" u ON u.id = o.buyer_user_id
      WHERE o.vendor_company_id = ${companyId}
        AND o.status != 'cancelled'
      GROUP BY o.buyer_user_id, u.name, u.email, u.image
      ORDER BY last_order_date DESC
    `);

    return (result.rows as Record<string, unknown>[]).map((r) => ({
      buyerUserId: String(r.buyer_user_id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      avatar: r.avatar ? String(r.avatar) : null,
      company: r.company ? String(r.company) : null,
      orderCount: Number(r.order_count) || 0,
      totalSpent: Number(r.total_spent) || 0,
      lastOrderDate: r.last_order_date ? new Date(String(r.last_order_date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
      firstOrderDate: r.first_order_date ? new Date(String(r.first_order_date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
      phone: r.phone ? String(r.phone) : null,
      address: r.address ? String(r.address) : null,
    }));
  } catch { return []; }
}

export async function getCustomerOrders(buyerUserId: string) {
  try {
    const companyId = await myCompanyId();
    const result = await db.execute(sql`
      SELECT o.id, o.status, o.total, o.created_at, o.payment,
        (SELECT json_agg(json_build_object('name', oi.name, 'qty', oi.qty, 'unitPrice', oi.unit_price))
         FROM order_item oi WHERE oi.order_id = o.id) as items
      FROM sales_order o
      WHERE o.vendor_company_id = ${companyId}
        AND o.buyer_user_id = ${buyerUserId}
      ORDER BY o.created_at DESC
      LIMIT 20
    `);
    return (result.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      status: String(r.status),
      total: Number(r.total) || 0,
      payment: String(r.payment),
      date: new Date(String(r.created_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      items: (r.items as { name: string; qty: number; unitPrice: number }[]) ?? [],
    }));
  } catch { return []; }
}
