"use client";

import { useDashboardRole } from "@/lib/use-dashboard-role";
import { ExhibitorHome } from "@/components/dashboard/exhibitor/exhibitor-home";
import { ProfessionalHome } from "@/components/dashboard/professional/professional-home";

// Admins never reach this page — the (dashboard) layout redirects them to
// /admin server-side (unless impersonating) before this renders.
//
// Employers get the professional home for now: their sidebar is already correct
// (see employerNav) but there's no employer-specific home built yet, and the
// professional shell at least surfaces messages and hiring. Worth replacing with
// a posted-jobs-and-applicants home when one exists.
export default function DashboardHomePage() {
  const role = useDashboardRole();
  if (role === "exhibitor") return <ExhibitorHome />;
  return <ProfessionalHome />;
}
