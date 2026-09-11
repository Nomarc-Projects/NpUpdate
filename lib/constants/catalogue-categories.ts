/**
 * Directory catalogue kinds + curated categories (client-safe; imported by the
 * admin console, the tabbed Directory, and the catalogue service).
 */

export const CATALOGUE_KINDS = ["institution", "ministry"] as const;
export type CatalogueKind = (typeof CATALOGUE_KINDS)[number];

export const INSTITUTION_CATEGORIES = [
  "Regulatory Body", "Professional Body", "University", "Polytechnic",
  "College of Education", "Research Institute", "Training Centre", "Other",
] as const;

export const MINISTRY_CATEGORIES = [
  "Federal Ministry", "State Ministry", "Federal Agency", "State Agency",
  "Commission", "Authority", "Other",
] as const;

export const CATEGORIES_BY_KIND: Record<CatalogueKind, readonly string[]> = {
  institution: INSTITUTION_CATEGORIES,
  ministry: MINISTRY_CATEGORIES,
};

export const CATALOGUE_KIND_LABEL: Record<CatalogueKind, string> = {
  institution: "Institutions",
  ministry: "Ministries",
};

export const CATALOGUE_KIND_NAME: Record<CatalogueKind, string> = {
  institution: "Institution",
  ministry: "Ministry",
};