"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { vendorPaymentAccount, vendorWallet, ledgerEntry, company } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { ensureCompany } from "@/lib/company-internal";
import { activeProvider } from "@/lib/payments";

export type PaymentAccount = {
  id: string;
  bankCode: string | null; bankName: string | null; accountNumber: string | null; accountName: string | null;
  subaccountCode: string | null; dvaAccountNumber: string | null; dvaBank: string | null; commissionPct: number;
};
export type WalletView = {
  available: number; held: number;
  entries: { id: string; type: string; amount: number; status: string; note: string | null; date: string }[];
};

const bump = () => { revalidatePath("/dashboard/wallet"); revalidatePath("/dashboard/orders"); };
const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function myCompanyId(): Promise<string> {
  const uid = await requireUserId();
  return ensureCompany(uid);
}

function mapAccount(a: typeof vendorPaymentAccount.$inferSelect): PaymentAccount {
  return {
    id: a.id, bankCode: a.bankCode, bankName: a.bankName, accountNumber: a.accountNumber, accountName: a.accountName,
    subaccountCode: a.paystackSubaccountCode, dvaAccountNumber: a.dvaAccountNumber, dvaBank: a.dvaBank,
    commissionPct: a.commissionPct ?? 10,
  };
}

export async function getVendorPaymentAccount(): Promise<PaymentAccount | null> {
  try {
    const companyId = await myCompanyId();
    const [a] = await db.select().from(vendorPaymentAccount).where(eq(vendorPaymentAccount.companyId, companyId)).limit(1);
    return a ? mapAccount(a) : null;
  } catch { return null; }
}

export async function getVendorPaymentAccounts(): Promise<PaymentAccount[]> {
  try {
    const companyId = await myCompanyId();
    const rows = await db.select().from(vendorPaymentAccount).where(eq(vendorPaymentAccount.companyId, companyId)).limit(3);
    return rows.map(mapAccount);
  } catch { return []; }
}

export async function saveVendorPaymentAccount(input: { bankCode: string; bankName: string; accountNumber: string; accountName: string; commissionPct?: number }): Promise<PaymentAccount> {
  const uid = await requireUserId();
  const companyId = await ensureCompany(uid);
  const [co] = await db.select({ name: company.name }).from(company).where(eq(company.id, companyId)).limit(1);

  const existing = await db.select({ id: vendorPaymentAccount.id, accountNumber: vendorPaymentAccount.accountNumber })
    .from(vendorPaymentAccount).where(eq(vendorPaymentAccount.companyId, companyId));
  const match = existing.find((e) => e.accountNumber === input.accountNumber);
  if (!match && existing.length >= 3) throw new Error("Maximum 3 settlement accounts allowed");

  let subaccountCode: string | null = null;
  let dvaAccountNumber: string | null = null;
  let dvaBank: string | null = null;
  const provider = activeProvider();
  if (provider?.createSubaccount) {
    const sub = await provider.createSubaccount({ businessName: co?.name ?? "Vendor", bankCode: input.bankCode, accountNumber: input.accountNumber, percentageCharge: input.commissionPct ?? 10 });
    subaccountCode = sub.subaccountCode;
    if (provider.createDedicatedAccount) {
      const dva = await provider.createDedicatedAccount({ name: co?.name ?? "Vendor", subaccountCode }).catch(() => null);
      if (dva) { dvaAccountNumber = dva.accountNumber; dvaBank = dva.bank; }
    }
  } else {
    subaccountCode = `DEMO_SUB_${companyId.slice(0, 8)}`;
    dvaAccountNumber = `90${companyId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`;
    dvaBank = "Wema Bank (demo)";
  }

  const row = {
    companyId, bankCode: input.bankCode, bankName: input.bankName, accountNumber: input.accountNumber,
    accountName: input.accountName, commissionPct: input.commissionPct ?? 10,
    paystackSubaccountCode: subaccountCode, dvaAccountNumber, dvaBank,
  };

  let saved: typeof vendorPaymentAccount.$inferSelect;
  if (match) {
    await db.update(vendorPaymentAccount).set({ ...row, updatedAt: new Date() }).where(eq(vendorPaymentAccount.id, match.id));
    const [updated] = await db.select().from(vendorPaymentAccount).where(eq(vendorPaymentAccount.id, match.id)).limit(1);
    saved = updated;
  } else {
    const [inserted] = await db.insert(vendorPaymentAccount).values(row).returning();
    saved = inserted;
  }
  bump();
  return mapAccount(saved);
}

export async function deleteVendorPaymentAccount(accountId: string): Promise<void> {
  const companyId = await myCompanyId();
  await db.delete(vendorPaymentAccount).where(and(eq(vendorPaymentAccount.id, accountId), eq(vendorPaymentAccount.companyId, companyId)));
  bump();
}

export async function getWallet(): Promise<WalletView> {
  try {
    const companyId = await myCompanyId();
    const [w] = await db.select().from(vendorWallet).where(eq(vendorWallet.companyId, companyId)).limit(1);
    const entries = await db.select().from(ledgerEntry).where(eq(ledgerEntry.vendorCompanyId, companyId)).orderBy(desc(ledgerEntry.createdAt)).limit(50);
    return {
      available: w?.balanceAvailable ?? 0,
      held: w?.balanceHeld ?? 0,
      entries: entries.map((e) => ({ id: e.id, type: e.type, amount: e.amount, status: e.status ?? "held", note: e.note, date: fmt(e.createdAt) })),
    };
  } catch { return { available: 0, held: 0, entries: [] }; }
}

/** Demo payout: move available balance to a 'paid' ledger entry (real path uses Paystack Transfers). */
export async function requestPayout(amount: number): Promise<void> {
  const companyId = await myCompanyId();
  const [w] = await db.select().from(vendorWallet).where(eq(vendorWallet.companyId, companyId)).limit(1);
  const available = w?.balanceAvailable ?? 0;
  if (amount <= 0 || amount > available) throw new Error("Amount exceeds available balance");
  await db.insert(ledgerEntry).values({ vendorCompanyId: companyId, type: "payout", amount: -amount, status: "paid", note: "Withdrawal to bank" });
  await db.update(vendorWallet).set({ balanceAvailable: available - amount, updatedAt: new Date() }).where(eq(vendorWallet.companyId, companyId));
  bump();
}

export async function updatePayoutStatus(reference: string, status: "completed" | "failed"): Promise<void> {
  try {
    const note = status === "completed" ? "Payout confirmed by provider" : "Payout failed — funds returned";
    await db.update(ledgerEntry).set({ status: status === "completed" ? "paid" : "failed", note })
      .where(eq(ledgerEntry.note, `transfer:${reference}`));
  } catch { /* ledger entry may not use this reference pattern */ }
}
