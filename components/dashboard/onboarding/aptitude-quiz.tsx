"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Brain, X, Check, XCircle, RotateCcw, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuizForAttempt, submitQuizAttempt, type AttemptQuestion, type QuizResult } from "@/lib/services/quiz";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
};

/**
 * The general aptitude quiz — the second half of the professional gate.
 * Fetches a random question set, walks through them one at a time (same
 * fixed-modal / segmented-progress / slide-transition chrome as
 * kyc-view.tsx's DocWizard), scores server-side on submit, and either
 * unlocks (onPass) or offers a retry with a fresh random set.
 */
export function AptitudeQuiz({ onPass, onClose }: { onPass: () => void; onClose: () => void }) {
  const [questions, setQuestions] = useState<AttemptQuestion[] | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadQuestions() {
    setQuestions(null);
    setResult(null);
    setAnswers({});
    setStep(0);
    setDir(1);
    try {
      const qs = await getQuizForAttempt(10);
      setQuestions(qs);
    } catch {
      toast.error("Could not load the quiz. Please try again.");
      onClose();
    }
  }

  useEffect(() => { loadQuestions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = questions?.length ?? 0;
  const current = questions?.[step];
  const isLast = step === total - 1;
  const isEmpty = questions !== null && questions.length === 0;

  function choose(letter: OptionKey) {
    if (!current) return;
    setAnswers((a) => ({ ...a, [current.id]: letter }));
  }

  function next() {
    if (!current || !answers[current.id]) { toast.error("Select an answer to continue."); return; }
    if (isLast) { void submit(); return; }
    setDir(1);
    setStep((s) => s + 1);
  }
  function back() {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!questions) return;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, chosen: answers[q.id] })).filter((a) => a.chosen);
      const res = await submitQuizAttempt(payload);
      setResult(res);
    } catch {
      toast.error("Could not submit your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative z-10 w-full sm:max-w-[560px] max-h-[94vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#181818] border border-[#ececec] dark:border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="relative px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-white/10 flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ffd716]/12 via-[#ffd716]/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#ffd716]/30 blur-md" />
                <div className="relative w-9 h-9 rounded-full bg-[#ffd716] flex items-center justify-center">
                  <Brain size={16} className="text-[#1e1e1e]" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#caa400] dark:text-[#ffd716]">General Aptitude Quiz</p>
                <h2 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white truncate">One last step to unlock Professional</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1e1e1e] dark:hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress */}
        {!result && questions && !isEmpty && (
          <div className="px-5 sm:px-6 pt-3.5 pb-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {questions.map((_, i) => (
                <motion.div
                  key={i}
                  className={cn("h-1.5 rounded-full flex-1 transition-colors", i < step ? "bg-[#16a34a]" : i === step ? "bg-[#ffd716]" : "bg-[#f0f0f0] dark:bg-white/10")}
                  animate={i === step ? { opacity: [1, 0.6, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              ))}
            </div>
            <p className="text-[11px] text-[#9a9a9a] mt-2">Question {step + 1} of {total}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {!questions && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={22} className="animate-spin text-[#caa400]" />
              <p className="text-[13px] text-[#9a9a9a]">Loading questions…</p>
            </div>
          )}

          {isEmpty && !result && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <Brain size={22} className="text-[#9a9a9a]" />
              <p className="text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">No quiz questions available yet</p>
              <p className="text-[12px] text-[#9a9a9a] max-w-[320px]">The question bank hasn&apos;t been set up. Please check back later.</p>
            </div>
          )}

          {questions && !result && current && (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                {current.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.imageUrl} alt="" className="w-full h-36 rounded-xl object-cover mb-4" />
                )}
                <p className="text-[15px] font-semibold text-[#1e1e1e] dark:text-white leading-snug mb-4">{current.questionText}</p>
                <div className="space-y-2">
                  {OPTION_KEYS.map((letter) => {
                    const label = current[`option${letter}` as "optionA"];
                    const selected = answers[current.id] === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => choose(letter)}
                        className={cn(
                          "w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors",
                          selected ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/10" : "border-[#ececec] dark:border-white/10 hover:border-[#d4d4d4]",
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0", selected ? "border-[#ffd716] bg-[#ffd716]" : "border-[#d4d4d4] dark:border-white/25")}>
                          {selected && <Check size={12} className="text-[#1e1e1e]" />}
                        </span>
                        <span className="text-[13.5px] text-[#1e1e1e] dark:text-white">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className={cn("rounded-2xl p-5 mb-4 text-center", result.passed ? "bg-[#dcfce7]" : "bg-[#fee2e2]")}>
                {result.passed ? <Check size={22} className="mx-auto text-[#16803c] mb-1.5" /> : <XCircle size={22} className="mx-auto text-[#b91c1c] mb-1.5" />}
                <p className={cn("text-[17px] font-bold", result.passed ? "text-[#16803c]" : "text-[#b91c1c]")}>
                  {result.passed ? "You passed!" : "Not quite — try again"}
                </p>
                <p className="text-[13px] text-[#4b5563] dark:text-[#1e1e1e]/70 mt-0.5">
                  Score: {result.score} / {result.total}
                </p>
              </div>

              <div className="space-y-2 mb-2">
                {result.review.map((r, i) => (
                  <div key={r.questionId} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#ececec] dark:border-white/10 text-[12.5px]">
                    {r.isCorrect ? <Check size={14} className="text-[#16803c] flex-shrink-0" /> : <XCircle size={14} className="text-[#b91c1c] flex-shrink-0" />}
                    <span className="text-[#6b6b6b] dark:text-white/60">Question {i + 1}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#f0f0f0] dark:border-white/10 flex-shrink-0 flex items-center justify-between gap-3">
          {result ? (
            result.passed ? (
              <button onClick={onPass} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-bold hover:bg-[#e6c114] transition-colors">
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button onClick={loadQuestions} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-bold hover:bg-[#e6c114] transition-colors">
                <RotateCcw size={14} /> Try again
              </button>
            )
          ) : isEmpty ? (
            <button onClick={onClose} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-bold hover:bg-[#e6c114] transition-colors">
              Close
            </button>
          ) : (
            <>
              <button onClick={back} disabled={step === 0} className="px-4 py-2 rounded-lg text-sm font-medium text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white disabled:opacity-40 transition-colors">
                Back
              </button>
              <button
                onClick={next}
                disabled={submitting || !questions}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-bold hover:bg-[#e6c114] transition-colors disabled:opacity-60"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : isLast ? "Submit" : "Next"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
