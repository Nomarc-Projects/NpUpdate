"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Check, HelpCircle } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TimePresetPicker } from "@/components/ui/time-preset-picker";
import { uploadFile } from "@/lib/upload-client";
import {
  createQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
  type QuizQuestion, type QuizQuestionInput,
} from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

type Draft = {
  id: string | null; // null = unsaved new question
  questionText: string;
  imageUrl: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: "A" | "B" | "C" | "D" | "";
  explanation: string;
  examTag: string; subjectTag: string; year: string;
  timeLimit: boolean;
  timeLimitSeconds: number | null;
};

const blankDraft = (): Draft => ({
  id: null, questionText: "", imageUrl: "",
  optionA: "", optionB: "", optionC: "", optionD: "",
  correctOption: "", explanation: "",
  examTag: "", subjectTag: "", year: "",
  timeLimit: true, timeLimitSeconds: 30,
});

const fromQuestion = (q: QuizQuestion): Draft => ({
  id: q.id, questionText: q.questionText, imageUrl: q.imageUrl ?? "",
  optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
  correctOption: (q.correctOption as Draft["correctOption"]) || "",
  explanation: q.explanation ?? "",
  examTag: q.examTag ?? "", subjectTag: q.subjectTag ?? "", year: q.year ? String(q.year) : "",
  timeLimit: q.timeLimitSeconds != null, timeLimitSeconds: q.timeLimitSeconds,
});

const isComplete = (d: Draft) =>
  !!(d.questionText.trim() && d.optionA.trim() && d.optionB.trim() && d.optionC.trim() && d.optionD.trim() && d.correctOption);

export function AdminQuiz({ questions, examOptions, subjectOptions }: { questions: QuizQuestion[]; examOptions: string[]; subjectOptions: string[] }) {
  const [list, setList] = useState(questions);
  const [activeId, setActiveId] = useState<string | null>(list[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(list[0] ? fromQuestion(list[0]) : blankDraft());
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = list.find((x) => x.id === activeId);
    setDraft(q ? fromQuestion(q) : blankDraft());
  }, [activeId, list]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function addQuestion() {
    setActiveId(null);
    setDraft(blankDraft());
  }

  function save() {
    if (!draft.questionText.trim()) { toast.error("Question text is required"); return; }
    if (!draft.optionA.trim() || !draft.optionB.trim() || !draft.optionC.trim() || !draft.optionD.trim()) { toast.error("All four options are required"); return; }
    if (!draft.correctOption) { toast.error("Mark which option is correct"); return; }

    const input: QuizQuestionInput = {
      questionText: draft.questionText,
      imageUrl: draft.imageUrl || undefined,
      optionA: draft.optionA, optionB: draft.optionB, optionC: draft.optionC, optionD: draft.optionD,
      correctOption: draft.correctOption,
      explanation: draft.explanation || undefined,
      examTag: draft.examTag || undefined,
      subjectTag: draft.subjectTag || undefined,
      year: draft.year ? Number(draft.year) : undefined,
      timeLimitSeconds: draft.timeLimit ? draft.timeLimitSeconds ?? undefined : undefined,
    };

    start(async () => {
      try {
        if (draft.id) {
          await updateQuizQuestion(draft.id, input);
          setList((l) => l.map((q) => (q.id === draft.id ? { ...q, ...input, id: q.id, active: true } as QuizQuestion : q)));
          toast.success("Question updated");
        } else {
          await createQuizQuestion(input);
          toast.success("Question added");
          // Reload isn't wired here (no id returned) — simplest correct behavior
          // is a full refresh so the new row (with its real id) appears in the list.
          window.location.reload();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save question");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      try {
        await deleteQuizQuestion(id);
        setList((l) => l.filter((q) => q.id !== id));
        if (activeId === id) setActiveId(null);
        toast.success("Question deleted");
      } catch {
        toast.error("Could not delete question");
      }
    });
  }

  async function handleImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file, "product");
      set("imageUrl", url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec] dark:border-white/10">
        <h1 className="text-[17px] font-bold text-[#1e1e1e] dark:text-white">Quiz Creator</h1>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
            <Eye size={14} /> Preview
          </button>
          <button type="button" disabled={pending} onClick={save} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114] transition-colors disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px]">
        {/* left: question list */}
        <div className="border-b lg:border-b-0 lg:border-r border-[#ececec] dark:border-white/10 p-4 max-h-[70vh] overflow-y-auto">
          <p className="text-[12.5px] font-semibold text-[#6b6b6b] dark:text-white/60 mb-3">Questions ({list.length})</p>
          <div className="space-y-2.5">
            {list.map((q, i) => {
              const complete = isComplete(fromQuestion(q));
              const active = q.id === activeId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveId(q.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-colors",
                    active ? "border-[#ffd716] bg-[#fffdf2] dark:bg-[#ffd716]/10" : "border-[#ececec] dark:border-white/10 hover:border-[#d4d4d4]",
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">{i + 1}</span>
                    <span className={cn("text-[10.5px] font-medium px-1.5 py-0.5 rounded", complete ? "text-[#16803c] bg-[#dcfce7]" : "text-[#9a9a9a] bg-[#f0f0f0] dark:bg-white/10")}>
                      {complete ? "Complete" : "Incomplete"}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8c8c8c] line-clamp-2">{q.questionText || "Untitled question"}</p>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[#d4d4d4] dark:border-white/20 text-[13px] font-semibold text-[#6b6b6b] dark:text-white/70 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
          >
            <Plus size={14} /> Add Question
          </button>
        </div>

        {/* middle: editor */}
        <div className="p-5 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-[#ececec] dark:border-white/10">
          <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">
            {draft.id ? `Question ${list.findIndex((q) => q.id === draft.id) + 1}` : "New question"}
          </p>
          <Field label="Question">
            <div className="relative">
              <HelpCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
              <input className={inputClass + " pl-9"} placeholder="Enter question" value={draft.questionText} onChange={(e) => set("questionText", e.target.value)} />
            </div>
          </Field>

          {draft.imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.imageUrl} alt="" className="w-full h-32 rounded-lg object-cover" />
              <button type="button" onClick={() => set("imageUrl", "")} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          ) : (
            <FileUpload accept="image/png,image/jpeg,image/webp" maxSizeMB={5} label="Add image to this question (optional)" upload={(f) => uploadFile(f, "product")} onChange={(items) => { const u = items[0]?.url; if (u) set("imageUrl", u); }} />
          )}
          {uploading && <p className="text-[11px] text-[#9a9a9a]">Uploading…</p>}

          {(["A", "B", "C", "D"] as const).map((letter) => (
            <Field key={letter} label={`Option ${letter}`}>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => set("correctOption", letter)}
                  aria-label={`Mark option ${letter} correct`}
                  className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                    draft.correctOption === letter ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#d4d4d4] dark:border-white/25 text-transparent",
                  )}
                >
                  <Check size={13} />
                </button>
                <input
                  className={inputClass}
                  placeholder={`Enter option ${letter.toLowerCase() === "a" ? "1" : letter === "B" ? "2" : letter === "C" ? "3" : "4"}`}
                  value={draft[`option${letter}` as "optionA"]}
                  onChange={(e) => set(`option${letter}` as "optionA", e.target.value)}
                />
              </div>
            </Field>
          ))}

          <Field label="Explanation" hint="Optional">
            <textarea rows={3} className={inputClass} placeholder="Enter explanation (optional)" value={draft.explanation} onChange={(e) => set("explanation", e.target.value)} />
          </Field>
        </div>

        {/* right: specification + time limit */}
        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white mb-3">Specification</p>
            <div className="space-y-3">
              <Field label="Exam">
                <SearchableSelect placeholder="Select exam tag" value={draft.examTag} onChange={(v) => set("examTag", v)} options={examOptions.map((o) => ({ value: o, label: o }))} />
              </Field>
              <Field label="Subject">
                <SearchableSelect placeholder="Select subject tag" value={draft.subjectTag} onChange={(v) => set("subjectTag", v)} options={subjectOptions.map((o) => ({ value: o, label: o }))} />
              </Field>
              <Field label="Year">
                <SearchableSelect placeholder="Select year" value={draft.year} onChange={(v) => set("year", v)} options={YEARS.map((y) => ({ value: y, label: y }))} />
              </Field>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Time Limit</p>
              <button
                type="button"
                onClick={() => set("timeLimit", !draft.timeLimit)}
                className={cn("w-9 h-5 rounded-full transition-colors relative flex-shrink-0", draft.timeLimit ? "bg-[#ffd716]" : "bg-[#e3e3e3] dark:bg-white/15")}
              >
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", draft.timeLimit ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </div>
            {draft.timeLimit && <TimePresetPicker value={draft.timeLimitSeconds} onChange={(v) => set("timeLimitSeconds", v)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
