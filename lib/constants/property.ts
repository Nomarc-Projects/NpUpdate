/**
 * Shared vocabulary for the property marketplace. The database stores the
 * `value` strings; labels and required-document rules live here so the wizard,
 * listing cards, admin review screen and services all agree.
 */

export const PROPERTY_KINDS = [
  { value: "sale", label: "For sale" },
  { value: "lease", label: "For lease", hint: "5+ years" },
  { value: "rent", label: "For rent", hint: "Annual, monthly, weekly or daily" },
  { value: "bulk_land", label: "Bulk land", hint: "Minimum 1 acre" },
] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number]["value"];

export const PROPERTY_CATEGORIES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "coworking", label: "Coworking" },
  { value: "shortlet", label: "Shortlet" },
  { value: "land", label: "Land" },
] as const;
export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number]["value"];

export const PROPERTY_TYPES = [
  { value: "duplex", label: "Duplex" },
  { value: "bungalow", label: "Bungalow" },
  { value: "detached", label: "Detached house" },
  { value: "semi_detached", label: "Semi-detached house" },
  { value: "terraced", label: "Terraced house" },
  { value: "apartment", label: "Apartment" },
  { value: "high_rise", label: "High-rise" },
  { value: "tower", label: "Tower" },
  { value: "skyscraper", label: "Skyscraper" },
  { value: "office", label: "Office space" },
  { value: "shop", label: "Shop / retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "coworking_space", label: "Coworking space" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

export const PROPERTY_PRICE_PERIODS = [
  { value: "one_off", label: "One-off" },
  { value: "annual", label: "Per year" },
  { value: "monthly", label: "Per month" },
  { value: "weekly", label: "Per week" },
  { value: "daily", label: "Per day" },
] as const;
export type PropertyPricePeriod = (typeof PROPERTY_PRICE_PERIODS)[number]["value"];

export const PROPERTY_CURRENCIES = [
  { value: "NGN", label: "NGN — Nigerian Naira", symbol: "₦" },
  { value: "USD", label: "USD — US Dollar", symbol: "$" },
  { value: "GBP", label: "GBP — Pound Sterling", symbol: "£" },
] as const;
export type PropertyCurrency = (typeof PROPERTY_CURRENCIES)[number]["value"];

export const LISTER_TYPES = [
  { value: "realtor", label: "Realtor / agency", hint: "CAC registration required for verification" },
  { value: "homeowner", label: "Homeowner" },
  { value: "space_owner", label: "Space owner", hint: "Coworking, shortlets and commercial spaces" },
] as const;
export type ListerType = (typeof LISTER_TYPES)[number]["value"];

export const PROPERTY_STATUSES = [
  "draft",
  "pending_approval",
  "changes_requested",
  "approved_awaiting_payment",
  "published",
  "rejected",
  "sold",
  "leased",
  "rented",
  "expired",
  "archived",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  changes_requested: "Changes requested",
  approved_awaiting_payment: "Approved — awaiting payment",
  published: "Published",
  rejected: "Rejected",
  sold: "Sold",
  leased: "Leased",
  rented: "Rented",
  expired: "Expired",
  archived: "Archived",
};

export const PROPERTY_DOCUMENT_TYPES = [
  { value: "title_deed", label: "Title deed" },
  { value: "c_of_o", label: "Certificate of Occupancy (C of O)" },
  { value: "land_use_report", label: "Land use report" },
  { value: "survey_plan", label: "Survey plan" },
  { value: "cac_certificate", label: "CAC certificate" },
  { value: "other", label: "Other supporting document" },
] as const;
export type PropertyDocumentType = (typeof PROPERTY_DOCUMENT_TYPES)[number]["value"];

export const PROPERTY_DOCUMENT_LABEL: Record<PropertyDocumentType, string> = Object.fromEntries(
  PROPERTY_DOCUMENT_TYPES.map((d) => [d.value, d.label]),
) as Record<PropertyDocumentType, string>;

/** What must be attached before a listing may enter the admin review queue.
 *  Realtor CAC is a lister-level verification, not repeated per property. */
export const REQUIRED_PROPERTY_DOCUMENTS: Record<PropertyKind, PropertyDocumentType[]> = {
  sale: ["title_deed", "c_of_o", "land_use_report", "survey_plan"],
  lease: ["title_deed", "c_of_o", "land_use_report"],
  rent: ["title_deed", "c_of_o"],
  bulk_land: ["title_deed", "c_of_o", "land_use_report", "survey_plan"],
};

export const PROPERTY_MEDIA_KINDS = [
  { value: "image", label: "Property photo" },
  { value: "aerial", label: "Aerial view" },
  { value: "floor_plan", label: "Floor plan" },
  { value: "site_plan", label: "Site plan" },
  { value: "video", label: "Video" },
] as const;
export type PropertyMediaKind = (typeof PROPERTY_MEDIA_KINDS)[number]["value"];

export function isPropertyKind(value: string): value is PropertyKind {
  return PROPERTY_KINDS.some((k) => k.value === value);
}
export function isPropertyCategory(value: string): value is PropertyCategory {
  return PROPERTY_CATEGORIES.some((c) => c.value === value);
}
export function isPropertyType(value: string): value is PropertyType {
  return PROPERTY_TYPES.some((t) => t.value === value);
}
export function isPropertyCurrency(value: string): value is PropertyCurrency {
  return PROPERTY_CURRENCIES.some((c) => c.value === value);
}
export function isPropertyPricePeriod(value: string): value is PropertyPricePeriod {
  return PROPERTY_PRICE_PERIODS.some((p) => p.value === value);
}
export function isPropertyDocumentType(value: string): value is PropertyDocumentType {
  return PROPERTY_DOCUMENT_TYPES.some((d) => d.value === value);
}
export function isPropertyStatus(value: string): value is PropertyStatus {
  return (PROPERTY_STATUSES as readonly string[]).includes(value);
}

/** The label for a free-text status coming out of the database. */
export function propertyStatusLabel(value: string): string {
  return isPropertyStatus(value) ? PROPERTY_STATUS_LABEL[value] : value;
}
