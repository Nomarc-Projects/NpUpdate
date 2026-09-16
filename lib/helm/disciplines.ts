/**
 * Helm's discipline vocabulary — the persona axis.
 *
 * Shared by the consultant's persona switcher, the profile field, and the
 * backend's retrieval filter. Values match `bt_template.discipline` so business
 * templates and Helm speak the same language.
 *
 * A professional's discipline is `profile.discipline` when set; when it isn't,
 * {@link inferDiscipline} makes a decent guess from their free-text occupation
 * (`profile.headline`) so the consultant adapts on day one without any setup.
 */

export const DISCIPLINES = [
  { value: "architecture", label: "Architecture", blurb: "Design intent, spatial planning, approvals, buildability" },
  { value: "structural", label: "Structural Engineering", blurb: "Loads, load paths, codes, structural safety" },
  { value: "quantity_surveying", label: "Quantity Surveying", blurb: "Measurement, cost, procurement, contracts" },
  { value: "mep", label: "MEP / Services", blurb: "Mechanical, electrical and plumbing coordination" },
  { value: "project_management", label: "Project Management", blurb: "Programme, resourcing, risk, delivery" },
  { value: "building", label: "Building / Construction", blurb: "Site execution, methods, workmanship, supervision" },
  { value: "surveying", label: "Land Surveying", blurb: "Setting out, levels, boundaries, site measurement" },
] as const;

export type Discipline = (typeof DISCIPLINES)[number]["value"];

export const DISCIPLINE_LABEL: Record<string, string> = Object.fromEntries(
  DISCIPLINES.map((d) => [d.value, d.label]),
);

export function isDiscipline(value: string | null | undefined): value is Discipline {
  return !!value && DISCIPLINES.some((d) => d.value === value);
}

/**
 * Best-effort discipline from a free-text occupation/headline. Ordered so the
 * more specific title wins (a "quantity surveyor" must not match "surveying").
 */
const HEADLINE_PATTERNS: [RegExp, Discipline][] = [
  [/quantity\s*survey|(^|\W)qs(\W|$)|cost\s*(manager|consultant|engineer)|estimator/i, "quantity_surveying"],
  [/structural|civil\s*engineer|structures/i, "structural"],
  [/\bmep\b|mechanical|electrical|plumbing|hvac|building\s*services/i, "mep"],
  [/architect/i, "architecture"],
  [/project\s*manag|construction\s*manag|\bpm\b|planner|scheduler/i, "project_management"],
  [/land\s*survey|geomatic|surveyor/i, "surveying"],
  [/builder|building|construction|site\s*(engineer|agent|manager)|foreman|contractor/i, "building"],
];

export function inferDiscipline(headline: string | null | undefined): Discipline | null {
  if (!headline) return null;
  for (const [pattern, discipline] of HEADLINE_PATTERNS) {
    if (pattern.test(headline)) return discipline;
  }
  return null;
}

/** The discipline Helm should adopt: explicit choice → profile → inferred → null. */
export function resolveDiscipline(input: {
  chosen?: string | null;
  profileDiscipline?: string | null;
  headline?: string | null;
}): Discipline | null {
  if (isDiscipline(input.chosen)) return input.chosen;
  if (isDiscipline(input.profileDiscipline)) return input.profileDiscipline;
  return inferDiscipline(input.headline);
}
