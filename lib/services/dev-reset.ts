"use server";

import { eq, or, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUserId } from "@/lib/server-user";
import {
  userRole, kycDocument, quizAttempt,
  profile, workExperience, education, profileSkill, certification, professionalRegistration, reference, project,
  company, job, application, recommendation, promotion, quoteRequest,
  savedItem, follow, list, notification, conversationParticipant, message, conversation,
  buyerAddress, supportTicket, ticketMessage,
} from "@/lib/db/schema";

/**
 * TEMPORARY dev/QA tool — wipes the caller's own account back to a
 * brand-new-signup state so onboarding can be re-walked per role. Clears role
 * grants, onboarding/identity data, everything they authored (jobs, products
 * via company cascade, applications, recommendations, promotions, quotes),
 * and their social/derived state (saved items, follows, lists, notifications,
 * conversations, addresses, support tickets).
 *
 * Only touches rows the caller owns — never another user's data. The Better
 * Auth `user` row itself is kept (same login/email/name); role, active_role
 * and plan are reset to a fresh signup's values.
 *
 * Remove this file + its call sites before public launch.
 */
export async function resetMyAccountForTesting(): Promise<void> {
  const uid = await requireUserId();

  /* ── role grants + verification/quiz gates ── */
  await db.delete(userRole).where(eq(userRole.userId, uid));
  await db.delete(kycDocument).where(eq(kycDocument.userId, uid));
  await db.delete(quizAttempt).where(eq(quizAttempt.userId, uid));

  /* ── professional profile + everything hanging off it ── */
  await db.delete(profile).where(eq(profile.userId, uid));
  await db.delete(workExperience).where(eq(workExperience.userId, uid));
  await db.delete(education).where(eq(education.userId, uid));
  await db.delete(profileSkill).where(eq(profileSkill.userId, uid));
  await db.delete(certification).where(eq(certification.userId, uid));
  await db.delete(professionalRegistration).where(eq(professionalRegistration.userId, uid));
  await db.delete(reference).where(eq(reference.userId, uid));
  await db.delete(project).where(eq(project.userId, uid));

  /* ── authored content ── */
  // company cascades → product / product_variant / company_certification
  await db.delete(company).where(eq(company.ownerUserId, uid));
  await db.delete(job).where(eq(job.ownerUserId, uid)); // cascades → application
  await db.delete(application).where(eq(application.applicantUserId, uid));
  await db.delete(promotion).where(eq(promotion.ownerUserId, uid));
  await db
    .delete(recommendation)
    .where(or(eq(recommendation.recommenderUserId, uid), eq(recommendation.recommendeeUserId, uid)));
  await db
    .delete(quoteRequest)
    .where(or(eq(quoteRequest.buyerUserId, uid), eq(quoteRequest.exhibitorUserId, uid)));

  /* ── social / derived state ── */
  await db.delete(savedItem).where(eq(savedItem.userId, uid));
  await db.delete(follow).where(or(eq(follow.followerId, uid), eq(follow.followeeId, uid)));
  await db.delete(list).where(eq(list.userId, uid)); // cascades → list_item
  await db.delete(notification).where(eq(notification.userId, uid));
  await db.delete(buyerAddress).where(eq(buyerAddress.userId, uid));

  /* ── messaging: drop the caller's conversations wholesale ── */
  const convoRows = await db
    .select({ id: conversationParticipant.conversationId })
    .from(conversationParticipant)
    .where(eq(conversationParticipant.userId, uid));
  const convoIds = convoRows.map((c) => c.id);
  if (convoIds.length > 0) {
    await db.delete(message).where(inArray(message.conversationId, convoIds));
    await db.delete(conversationParticipant).where(inArray(conversationParticipant.conversationId, convoIds));
    await db.delete(conversation).where(inArray(conversation.id, convoIds));
  }

  /* ── support ── */
  const ticketRows = await db.select({ id: supportTicket.id }).from(supportTicket).where(eq(supportTicket.reporterId, uid));
  const ticketIds = ticketRows.map((t) => t.id);
  if (ticketIds.length > 0) {
    await db.delete(ticketMessage).where(inArray(ticketMessage.ticketId, ticketIds));
    await db.delete(supportTicket).where(inArray(supportTicket.id, ticketIds));
  }

  /* ── back to a fresh signup's scalars ── */
  await db.execute(sql`UPDATE "user" SET role = 'client', active_role = NULL, plan = 'free' WHERE id = ${uid}`);
}
