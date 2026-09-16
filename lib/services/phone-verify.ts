"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile, company, employerProfile, phoneOtp } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import type { StackableRole } from "@/lib/entitlements";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send a 6-digit phone verification code for the given held role's phone
 * number (Account Settings → Account Information "Verify Number" / "Edit
 * Number" flows). No SMS gateway (Termii/Twilio) is wired up yet — a real
 * follow-up, not something fakeable without provider credentials — so the
 * code is logged server-side and, outside production, echoed back in the
 * response so the OTP flow is fully exercisable end to end today.
 */
export async function sendPhoneOtp(role: StackableRole, phone: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  if (!phone.trim()) return { ok: false, error: "Enter a phone number first." };
  const uid = await requireUserId();
  const code = genCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  try {
    await db
      .insert(phoneOtp)
      .values({ userId: uid, role, phone, code, expiresAt, attempts: 0, consumedAt: null })
      .onConflictDoUpdate({
        target: [phoneOtp.userId, phoneOtp.role],
        set: { phone, code, expiresAt, attempts: 0, consumedAt: null },
      });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start phone verification." };
  }

  console.info(`[phone-verify] OTP for user ${uid} (${role}) -> ${phone}: ${code}`);
  return { ok: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

/** Verify a submitted code and, on success, mark the role's phone as verified. */
export async function verifyPhoneOtp(role: StackableRole, code: string): Promise<{ ok: boolean; error?: string }> {
  const uid = await requireUserId();
  try {
    const [row] = await db.select().from(phoneOtp).where(and(eq(phoneOtp.userId, uid), eq(phoneOtp.role, role))).limit(1);
    if (!row) return { ok: false, error: "Request a new code first." };
    if (row.consumedAt) return { ok: false, error: "This code has already been used." };
    if (row.expiresAt < new Date()) return { ok: false, error: "That code has expired. Request a new one." };
    if (row.code !== code) {
      await db.update(phoneOtp).set({ attempts: (row.attempts ?? 0) + 1 }).where(eq(phoneOtp.id, row.id));
      return { ok: false, error: "That code is invalid." };
    }
    await db.update(phoneOtp).set({ consumedAt: new Date() }).where(eq(phoneOtp.id, row.id));
    await applyVerifiedPhone(uid, role, row.phone);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Verification failed." };
  }
}

/**
 * Called the moment the user confirms the "Changing your phone number will
 * remove your Tier 1 Verified Badge" warning — drops the verified flag
 * immediately (before they've even typed the new number), matching the
 * copy's promise.
 */
export async function beginPhoneEdit(role: StackableRole): Promise<{ ok: boolean }> {
  const uid = await requireUserId();
  try {
    await setPhoneVerified(uid, role, false);
  } catch { /* table not yet migrated — no-op */ }
  return { ok: true };
}

async function applyVerifiedPhone(uid: string, role: StackableRole, phone: string) {
  if (role === "professional") {
    const [existing] = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, uid)).limit(1);
    if (existing) await db.update(profile).set({ phone, phoneVerified: true, updatedAt: new Date() }).where(eq(profile.userId, uid));
    else await db.insert(profile).values({ userId: uid, phone, phoneVerified: true });
  } else if (role === "exhibitor") {
    const [existing] = await db.select({ id: company.id }).from(company).where(eq(company.ownerUserId, uid)).limit(1);
    if (existing) await db.update(company).set({ phone, phoneVerified: true, updatedAt: new Date() }).where(eq(company.ownerUserId, uid));
  } else {
    const [existing] = await db.select({ id: employerProfile.id }).from(employerProfile).where(eq(employerProfile.userId, uid)).limit(1);
    if (existing) await db.update(employerProfile).set({ phone, phoneVerified: true, updatedAt: new Date() }).where(eq(employerProfile.userId, uid));
    else await db.insert(employerProfile).values({ userId: uid, phone, phoneVerified: true });
  }
}

async function setPhoneVerified(uid: string, role: StackableRole, verified: boolean) {
  if (role === "professional") await db.update(profile).set({ phoneVerified: verified, updatedAt: new Date() }).where(eq(profile.userId, uid));
  else if (role === "exhibitor") await db.update(company).set({ phoneVerified: verified, updatedAt: new Date() }).where(eq(company.ownerUserId, uid));
  else await db.update(employerProfile).set({ phoneVerified: verified, updatedAt: new Date() }).where(eq(employerProfile.userId, uid));
}
