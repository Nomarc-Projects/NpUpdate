/**
 * Segment rule vocabulary — shared by the server actions in ./segments.ts and
 * the rule-builder UI. Deliberately a plain module, not "use server": a
 * "use server" file may only export async functions, and the builder needs the
 * field list and label helpers synchronously on the client.
 */

export type SegmentOperator = "is" | "is_not" | "contains" | "gt" | "lt";

export type SegmentRule = {
  field: string;
  operator: SegmentOperator;
  value: string;
};

export type SegmentMatchMode = "all" | "any";

export type SegmentFieldKind = "select" | "text" | "number";

export type SegmentFieldDef = {
  key: string;
  label: string;
  kind: SegmentFieldKind;
  operators: SegmentOperator[];
  options?: { value: string; label: string }[];
  /** Placeholder for free-text/number inputs. */
  hint?: string;
};

/** Every field a segment rule may reference, and how the UI should render it. */
export const SEGMENT_FIELDS: SegmentFieldDef[] = [
  {
    key: "user_type", label: "User Type", kind: "select", operators: ["is", "is_not"],
    options: [
      { value: "professional", label: "Professional" },
      { value: "exhibitor", label: "Exhibitor" },
      { value: "employer", label: "Employer" },
      { value: "client", label: "Client" },
    ],
  },
  {
    key: "plan", label: "Subscription plan", kind: "select", operators: ["is", "is_not"],
    options: [
      { value: "free", label: "Free" },
      { value: "plus", label: "Plus" },
      { value: "pro", label: "Pro" },
      { value: "premium", label: "Premium" },
    ],
  },
  {
    key: "verified", label: "Verification status", kind: "select", operators: ["is"],
    options: [{ value: "true", label: "Verified" }, { value: "false", label: "Not verified" }],
  },
  { key: "occupation", label: "Occupation", kind: "text", operators: ["is", "contains"], hint: "e.g. Architect" },
  { key: "industry", label: "Primary industry", kind: "text", operators: ["is", "contains"], hint: "e.g. Core Building Materials" },
  { key: "location", label: "Location", kind: "text", operators: ["is", "contains"], hint: "e.g. Lagos" },
  { key: "product_count", label: "Products published", kind: "number", operators: ["gt", "lt", "is"], hint: "e.g. 5" },
  { key: "days_since_signup", label: "Days since signup", kind: "number", operators: ["gt", "lt"], hint: "e.g. 30" },
];

export const OPERATOR_LABEL: Record<SegmentOperator, string> = {
  is: "Is",
  is_not: "Is not",
  contains: "Contains",
  gt: "Greater than",
  lt: "Less than",
};

export function fieldDef(key: string): SegmentFieldDef | undefined {
  return SEGMENT_FIELDS.find((f) => f.key === key);
}

/** A rule the server would accept — mirrors the checks in segments.ts. */
export function isRuleComplete(rule: SegmentRule): boolean {
  const def = fieldDef(rule.field);
  if (!def || !def.operators.includes(rule.operator)) return false;
  const raw = (rule.value ?? "").trim();
  if (!raw) return false;
  if (def.kind === "number" && !Number.isFinite(Number(raw))) return false;
  return true;
}

/** Human-readable rule lines for the list's FILTER RULES column. */
export function describeRules(rules: SegmentRule[]): string[] {
  return rules.map((r) => {
    const def = fieldDef(r.field);
    const label = def?.label ?? r.field;
    const valueLabel = def?.options?.find((o) => o.value === r.value)?.label ?? r.value;
    const op =
      r.operator === "is" ? "=" :
      r.operator === "is_not" ? "≠" :
      r.operator === "contains" ? "contains" :
      r.operator === "gt" ? ">" : "<";
    return `${label} ${op} ${valueLabel}`;
  });
}

export const BUILTIN_AUDIENCES = [
  { value: "all_users", label: "All Active Users" },
  { value: "professionals", label: "Professionals" },
  { value: "exhibitors", label: "Exhibitors" },
  { value: "employers", label: "Employers" },
] as const;

export function audienceLabel(key: string): string {
  return BUILTIN_AUDIENCES.find((a) => a.value === key)?.label ?? key;
}
