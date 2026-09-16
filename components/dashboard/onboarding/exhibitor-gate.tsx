"use client";

import { ExhibitorOnboardingWizard } from "./exhibitor-onboarding-wizard";

/**
 * Shown in place of an exhibitor-track page when the viewer isn't an exhibitor
 * yet. Renders the 5-step onboarding wizard (guidelines → company name+email →
 * email OTP → full profile → summary). The final step calls saveCompany
 * (lib/services/company.ts) which grants the exhibitor role, then routes to the
 * dashboard so the parent server page re-evaluates the gate. `title`/`description`
 * are retained for backwards-compatibility with existing callers.
 */
export function ExhibitorGate(_props?: { title?: string; description?: string }) {
  return <ExhibitorOnboardingWizard />;
}
