"use client";

import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";

/**
 * Shown in place of a professional-track page when the viewer holds no role
 * yet. Renders the full professional onboarding form — country, state/region,
 * company name, qualifications, skills, certifications, work experience,
 * education, bio, availability. Submitting it (completeProfessionalOnboarding)
 * saves the profile AND grants the professional role in one action, then
 * navigates to /dashboard/jobs. The parent server page re-evaluates the gate
 * on return to reveal the real content.
 */
export function ProfessionalGate({ title, description }: { title: string; description: string }) {
  return <ProfessionalOnboarding title={title} description={description} />;
}
