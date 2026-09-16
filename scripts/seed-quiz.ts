/**
 * Seeds the general aptitude quiz bank used by the professional onboarding
 * gate (/dashboard/jobs → "Continue to the quiz"). The bank is admin-managed
 * via /admin/quiz, but a fresh install has zero rows — and getQuizForAttempt
 * then returns an empty list, leaving the wizard stuck on "Question 1 of 0"
 * with nothing to answer. This seeds a starter set; it is idempotent and does
 * NOT touch questions once any exist.
 * Run: npx tsx scripts/seed-quiz.ts   (with DATABASE_URL in env, like seed.ts)
 */
import { count } from "drizzle-orm";
import { db } from "../lib/db/client";
import { quizQuestion } from "../lib/db/schema";

type Row = typeof quizQuestion.$inferInsert;

const QUESTIONS: Row[] = [
  {
    questionText: "A site store issues 240 bags of cement over 6 days at the same daily rate. How many bags are issued per day?",
    optionA: "30", optionB: "36", optionC: "40", optionD: "48",
    correctOption: "C",
    explanation: "240 ÷ 6 = 40 bags per day.",
    examTag: "General Aptitude", subjectTag: "Numerical Reasoning",
  },
  {
    questionText: "A contractor bids ₦4.5M for a job. Materials take 40% and labour 35% of the bid. How much is left for overhead and profit?",
    optionA: "₦1,125,000", optionB: "₦1,350,000", optionC: "₦1,800,000", optionD: "₦2,250,000",
    correctOption: "A",
    explanation: "Materials + labour = 75% of ₦4.5M = ₦3,375,000; remaining 25% = ₦1,125,000.",
    examTag: "General Aptitude", subjectTag: "Numerical Reasoning",
  },
  {
    questionText: "If 8 workers can plaster a wall in 15 days, how long would 12 workers take at the same rate?",
    optionA: "8 days", optionB: "10 days", optionC: "11 days", optionD: "12 days",
    correctOption: "B",
    explanation: "Work = 8 × 15 = 120 worker-days; 120 ÷ 12 = 10 days.",
    examTag: "General Aptitude", subjectTag: "Numerical Reasoning",
  },
  {
    questionText: "A drawing scale of 1:50 means a 5 mm line on paper represents what length on site?",
    optionA: "150 mm", optionB: "200 mm", optionC: "250 mm", optionD: "500 mm",
    correctOption: "C",
    explanation: "5 mm × 50 = 250 mm on site.",
    examTag: "General Aptitude", subjectTag: "Numerical Reasoning",
  },
  {
    questionText: "Choose the word most nearly OPPOSITE in meaning to 'feasible':",
    optionA: "Practical", optionB: "Impossible", optionC: "Reasonable", optionD: "Likely",
    correctOption: "B",
    explanation: "'Feasible' means achievable; its opposite is 'impossible'.",
    examTag: "General Aptitude", subjectTag: "Verbal Reasoning",
  },
  {
    questionText: "Which sentence is grammatically correct?",
    optionA: "The engineer and the foreman was on site.", optionB: "The engineer and the foreman were on site.", optionC: "The engineer and foreman is on site.", optionD: "The engineers was on site.",
    correctOption: "B",
    explanation: "Two subjects joined by 'and' take a plural verb: 'were'.",
    examTag: "General Aptitude", subjectTag: "Verbal Reasoning",
  },
  {
    questionText: "'The report was submitted late because the data arrived incomplete.' What is the cause?",
    optionA: "The report was late", optionB: "The data arrived incomplete", optionC: "Someone lost the report", optionD: "The submission was rejected",
    correctOption: "B",
    explanation: "The sentence states the lateness happened because of incomplete data.",
    examTag: "General Aptitude", subjectTag: "Verbal Reasoning",
  },
  {
    questionText: "Find the next number in the sequence: 3, 6, 12, 24, ___",
    optionA: "30", optionB: "36", optionC: "48", optionD: "60",
    correctOption: "C",
    explanation: "Each term doubles: 24 × 2 = 48.",
    examTag: "General Aptitude", subjectTag: "Logical Reasoning",
  },
  {
    questionText: "All scaffolds must be inspected. This scaffold has not been inspected. Therefore:",
    optionA: "It may be used if it looks strong", optionB: "It must not be used until inspected", optionC: "Only the foreman may use it", optionD: "Inspection is optional for short jobs",
    correctOption: "B",
    explanation: "An uninspected scaffold fails the stated rule and must not be used.",
    examTag: "General Aptitude", subjectTag: "Logical Reasoning",
  },
  {
    questionText: "If BLOCK is coded as YOLYP (each letter is replaced by its opposite in the alphabet), how is SITE coded?",
    optionA: "HRGV", optionB: "HGRV", optionC: "RGHV", optionD: "GVHR",
    correctOption: "A",
    explanation: "Each letter maps to its alphabet opposite: S→H, I→R, T→G, E→V, so SITE → HRGV.",
    examTag: "General Aptitude", subjectTag: "Logical Reasoning",
  },
  {
    questionText: "What does PPE stand for on a construction site?",
    optionA: "Project Planning & Estimation", optionB: "Personal Protective Equipment", optionC: "Public Property Enforcement", optionD: "Pre-Pour Evaluation",
    correctOption: "B",
    explanation: "PPE is Personal Protective Equipment — helmets, boots, gloves, hi-vis.",
    examTag: "General Aptitude", subjectTag: "Site Safety",
  },
  {
    questionText: "The safest response to discovering a frayed electrical cable on site is to:",
    optionA: "Tape it and carry on", optionB: "Move it out of the walkway only", optionC: "Report it and stop using the equipment", optionD: "Use it briefly for small loads",
    correctOption: "C",
    explanation: "Damaged cables must be taken out of service and reported immediately.",
    examTag: "General Aptitude", subjectTag: "Site Safety",
  },
  {
    questionText: "Working at height generally requires fall protection once the drop exceeds:",
    optionA: "1 metre", optionB: "2 metres (about 6 feet)", optionC: "5 metres", optionD: "No threshold applies",
    correctOption: "B",
    explanation: "Common practice/regulation sets the threshold at about 2 metres (6 feet).",
    examTag: "General Aptitude", subjectTag: "Site Safety",
  },
  {
    questionText: "A concrete cube test primarily checks the concrete's:",
    optionA: "Slump", optionB: "Compressive strength", optionC: "Temperature", optionD: "Water content",
    correctOption: "B",
    explanation: "Cube (or cylinder) crushing tests measure compressive strength.",
    examTag: "General Aptitude", subjectTag: "Construction Knowledge",
  },
  {
    questionText: "On a Gantt chart, a horizontal bar represents:",
    optionA: "A cost line", optionB: "A task and its duration", optionC: "A worker assignment", optionD: "A milestone diamond",
    correctOption: "B",
    explanation: "Each bar spans a task's start and finish dates, showing duration.",
    examTag: "General Aptitude", subjectTag: "Construction Knowledge",
  },
];

async function main() {
  const [row] = await db.select({ n: count() }).from(quizQuestion);
  const existing = Number(row?.n ?? 0);
  if (existing > 0) {
    console.log(`quiz_question already has ${existing} row(s) — skipping (idempotent).`);
    return;
  }
  await db.insert(quizQuestion).values(QUESTIONS);
  console.log(`Seeded ${QUESTIONS.length} quiz questions.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
