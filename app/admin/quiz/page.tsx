import { AdminQuiz } from "@/components/admin/admin-quiz";
import { listQuizQuestions } from "@/lib/services/quiz";
import { getTaxonomy } from "@/lib/services/taxonomy";

export const metadata = { title: "Quiz Creator" };

export default async function AdminQuizPage() {
  const [questions, examOptions, subjectOptions] = await Promise.all([
    listQuizQuestions(),
    getTaxonomy("quiz_exam"),
    getTaxonomy("quiz_subject"),
  ]);
  return (
    <div className="p-4 sm:p-6">
      <AdminQuiz questions={questions} examOptions={examOptions} subjectOptions={subjectOptions} />
    </div>
  );
}
