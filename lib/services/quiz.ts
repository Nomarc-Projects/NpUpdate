"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { quizQuestion, quizAttempt } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { requireAdmin } from "@/lib/authz";
import { grantRole } from "@/lib/roles-internal";

const PASS_RATIO = 0.7;

export type QuizQuestion = {
  id: string;
  questionText: string;
  imageUrl: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  examTag: string | null;
  subjectTag: string | null;
  year: number | null;
  timeLimitSeconds: number | null;
  active: boolean;
};

const map = (r: typeof quizQuestion.$inferSelect): QuizQuestion => ({
  id: r.id,
  questionText: r.questionText,
  imageUrl: r.imageUrl,
  optionA: r.optionA,
  optionB: r.optionB,
  optionC: r.optionC,
  optionD: r.optionD,
  correctOption: r.correctOption,
  explanation: r.explanation,
  examTag: r.examTag,
  subjectTag: r.subjectTag,
  year: r.year,
  timeLimitSeconds: r.timeLimitSeconds,
  active: r.active ?? true,
});

const bump = () => revalidatePath("/admin/quiz");

/* ── Admin: question bank CRUD ────────────────────────────────────────── */

export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  await requireAdmin();
  const rows = await db.select().from(quizQuestion).orderBy(quizQuestion.createdAt);
  return rows.map(map);
}

export type QuizQuestionInput = {
  questionText: string;
  imageUrl?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  examTag?: string;
  subjectTag?: string;
  year?: number;
  timeLimitSeconds?: number;
};

export async function createQuizQuestion(input: QuizQuestionInput) {
  await requireAdmin();
  if (!input.questionText.trim()) throw new Error("Question text is required");
  await db.insert(quizQuestion).values({
    questionText: input.questionText.trim(),
    imageUrl: input.imageUrl || null,
    optionA: input.optionA,
    optionB: input.optionB,
    optionC: input.optionC,
    optionD: input.optionD,
    correctOption: input.correctOption,
    explanation: input.explanation || null,
    examTag: input.examTag || null,
    subjectTag: input.subjectTag || null,
    year: input.year ?? null,
    timeLimitSeconds: input.timeLimitSeconds ?? null,
  });
  bump();
}

export async function updateQuizQuestion(id: string, input: QuizQuestionInput) {
  await requireAdmin();
  if (!input.questionText.trim()) throw new Error("Question text is required");
  await db.update(quizQuestion).set({
    questionText: input.questionText.trim(),
    imageUrl: input.imageUrl || null,
    optionA: input.optionA,
    optionB: input.optionB,
    optionC: input.optionC,
    optionD: input.optionD,
    correctOption: input.correctOption,
    explanation: input.explanation || null,
    examTag: input.examTag || null,
    subjectTag: input.subjectTag || null,
    year: input.year ?? null,
    timeLimitSeconds: input.timeLimitSeconds ?? null,
    updatedAt: new Date(),
  }).where(eq(quizQuestion.id, id));
  bump();
}

export async function deleteQuizQuestion(id: string) {
  await requireAdmin();
  await db.delete(quizQuestion).where(eq(quizQuestion.id, id));
  bump();
}

/* ── Attempt flow ──────────────────────────────────────────────────────── */

export type AttemptQuestion = Omit<QuizQuestion, "correctOption" | "explanation">;

/** A random sample of active questions, with answers stripped client-side. */
export async function getQuizForAttempt(count = 10): Promise<AttemptQuestion[]> {
  const res = await db.execute(sql`
    SELECT id, question_text, image_url, option_a, option_b, option_c, option_d,
           exam_tag, subject_tag, year, time_limit_seconds
    FROM quiz_question
    WHERE active = true
    ORDER BY random()
    LIMIT ${count}
  `);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    questionText: r.question_text as string,
    imageUrl: r.image_url as string | null,
    optionA: r.option_a as string,
    optionB: r.option_b as string,
    optionC: r.option_c as string,
    optionD: r.option_d as string,
    examTag: r.exam_tag as string | null,
    subjectTag: r.subject_tag as string | null,
    year: r.year as number | null,
    timeLimitSeconds: r.time_limit_seconds as number | null,
    active: true,
  }));
}

export type QuizAnswer = { questionId: string; chosen: "A" | "B" | "C" | "D" };
export type QuizResult = {
  score: number;
  total: number;
  passed: boolean;
  review: { questionId: string; chosen: string; correct: string; isCorrect: boolean; explanation: string | null }[];
};

/**
 * Scores an attempt server-side against the real answer key, records it, and
 * — if the pass bar is met — grants the professional role (tier-1 self-serve,
 * same mechanism as lib/services/profile.ts / company.ts).
 */
export async function submitQuizAttempt(answers: QuizAnswer[]): Promise<QuizResult> {
  const uid = await requireUserId();
  if (!answers.length) throw new Error("No answers submitted");

  const rows = await db
    .select({ id: quizQuestion.id, correctOption: quizQuestion.correctOption, explanation: quizQuestion.explanation })
    .from(quizQuestion);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const review = answers.map((a) => {
    const q = byId.get(a.questionId);
    const correct = q?.correctOption ?? "";
    return { questionId: a.questionId, chosen: a.chosen, correct, isCorrect: a.chosen === correct, explanation: q?.explanation ?? null };
  });
  const score = review.filter((r) => r.isCorrect).length;
  const total = answers.length;
  const passed = total > 0 && score / total >= PASS_RATIO;

  await db.insert(quizAttempt).values({ userId: uid, score, totalQuestions: total, passed, answers: review });
  if (passed) await grantRole(uid, "professional", "self_serve_tier1");

  return { score, total, passed, review };
}
