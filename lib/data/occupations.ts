/**
 * The occupations Nomarc treats as AEC professions.
 *
 * This list decides who counts as a professional across the app: a member whose
 * saved occupation is on it gets the profile-completion tracker (and can apply
 * for jobs); anyone who picked "Others" and typed a free-text occupation — a
 * client, student or other non-AEC role — is treated as already complete and
 * never sees the tracker. PublicProfileForm and the profile screen must agree,
 * so the list lives here rather than beside either of them.
 */
export const OCCUPATIONS = [
  "Architect",
  "Interior Designer",
  "Structural Engineer",
  "MEP Engineer (Mechanical, Electrical, Plumbing)",
  "BIM Specialist / Manager",
  "Quantity Surveyor",
  "Project Manager",
  "3D Visualizer",
  "Urban Planner",
  "Draftsman / CAD Technician",
  // Free-text escape hatch: picking this reveals an input for a custom
  // occupation, which is what gets saved as the profile headline.
  "Others",
];

/** The fixed options, i.e. everything except the "Others" escape hatch. */
export const KNOWN_OCCUPATIONS = OCCUPATIONS.filter((o) => o !== "Others");

/** True when the saved occupation marks the member as an AEC professional.
 *  An empty value means they haven't chosen yet, so keep nudging them. */
export function isProfessionalOccupation(headline?: string | null): boolean {
  return !headline || KNOWN_OCCUPATIONS.includes(headline);
}
