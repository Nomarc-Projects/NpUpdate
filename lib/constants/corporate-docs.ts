/**
 * Canonical Tier-2 corporate verification documents for the Exhibitor and
 * Employer accordions in Account Settings → Verification, keyed by country
 * of business registration (Figma captures a Nigeria-specific 4-slot grid
 * and a generic international one). Shared so both accordions render the
 * exact same doc-tab names/keys.
 *
 * These keys are intentionally aligned with what the admin Corporate Checks
 * queue (`components/admin/verification-view.tsx`) should show once its own
 * reconciliation pass lands — today that view's doc-tab set doesn't include
 * a TIN slot yet (a gap called out in the plan), so `docKey` values here
 * (esp. `tin`) are the target the admin side should converge on.
 */
export type CorporateDocSlot = { docKey: string; label: string };

export const NIGERIA_CORPORATE_DOCS: CorporateDocSlot[] = [
  { docKey: "cac_certificate", label: "CAC Certificate of Incorporation" },
  { docKey: "cac_status_report", label: "CAC Status Report (Form I1 / CO2 & CO7)" },
  { docKey: "primary_contact_id", label: "Valid Primary Contact ID" },
  { docKey: "tin", label: "Tax Identification Number (TIN)" },
];

export const GENERIC_CORPORATE_DOCS: CorporateDocSlot[] = [
  { docKey: "certificate_of_incorporation", label: "Certificate of Incorporation / Business Registration" },
  { docKey: "company_extract", label: "Company Extract / Articles of Association" },
  { docKey: "primary_contact_id", label: "Valid Primary Contact ID" },
  { docKey: "tax_id", label: "Tax ID / Employer Identification Number (EIN)" },
];

export const REGISTRATION_COUNTRIES = ["Nigeria", "Other"] as const;

export function corporateDocsFor(country: string): CorporateDocSlot[] {
  return country === "Nigeria" ? NIGERIA_CORPORATE_DOCS : GENERIC_CORPORATE_DOCS;
}
