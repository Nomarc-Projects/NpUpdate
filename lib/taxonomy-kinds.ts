export type TaxonomyKind = "occupation" | "skill" | "product_category" | "service_category" | "industry" | "regulatory_body" | "quiz_exam" | "quiz_subject";

export const TAXONOMY_KINDS: { kind: TaxonomyKind; label: string; hint: string }[] = [
  { kind: "occupation", label: "Occupations", hint: "Used by the Find Professionals filter" },
  { kind: "skill", label: "Skills", hint: "Suggested skills on profiles" },
  { kind: "service_category", label: "Service categories", hint: "Categories when publishing a Service" },
  { kind: "product_category", label: "Product categories", hint: "Categories for exhibitor products" },
  { kind: "industry", label: "Industries", hint: "Company primary industries" },
  { kind: "regulatory_body", label: "Regulatory bodies", hint: "Professional/regulatory bodies for qualifications" },
  { kind: "quiz_exam", label: "Quiz exams", hint: "Exam tags for the aptitude question bank" },
  { kind: "quiz_subject", label: "Quiz subjects", hint: "Subject tags for the aptitude question bank" },
];
