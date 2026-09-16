/**
 * Canonical Tier-2 personal ID document types — shared between the profile
 * verification tab (`components/dashboard/kyc-view.tsx`) and the Account
 * Settings Verification tab (`components/dashboard/settings/panels/verification-panel.tsx`).
 *
 * The Figma account-settings mockups only show 3 of these 5 options in their
 * "Document Type" select (National ID (NIN), International Passport,
 * Driver's License) — this file keeps the richer 5-entry list that already
 * existed in `kyc-view.tsx` (it has real per-type validation rules and a
 * "Permanent Voter Card" + "National Identity Card" option Figma doesn't
 * show), since narrowing it would be a regression for the existing profile
 * verification flow. Reconciliation decision, not drift.
 */
export type IdTypeDef = {
  value: string;
  label: string;
  numberLabel: string;
  placeholder: string;
  exactLen?: number;
  minLen?: number;
  maxLen?: number;
  numericOnly?: boolean;
  hint: string;
};

export const ID_TYPES: IdTypeDef[] = [
  { value: "nin",             label: "NIN Slip (National ID Number)",   numberLabel: "NIN",                              placeholder: "00000000000",      exactLen: 11, numericOnly: true,  hint: "Exactly 11 digits" },
  { value: "passport",        label: "International Passport",           numberLabel: "Passport Number",                  placeholder: "A12345678",        exactLen: 9,  numericOnly: false, hint: "9 characters (e.g. A12345678)" },
  { value: "drivers_licence", label: "Driver's Licence",                 numberLabel: "Licence Number",                   placeholder: "ABC000000000",     minLen: 10,  maxLen: 12, numericOnly: false, hint: "10–12 characters" },
  { value: "pvc",             label: "Permanent Voter Card (PVC)",       numberLabel: "Voter Identification Number (VIN)", placeholder: "0000000000000000000", exactLen: 19, numericOnly: false, hint: "Exactly 19 characters" },
  { value: "national_id",     label: "National Identity Card",           numberLabel: "Card Number",                      placeholder: "00000000000",      exactLen: 11, numericOnly: true,  hint: "Exactly 11 digits" },
];

export function validateIdNumber(typeValue: string, number: string): { valid: boolean; state: "empty" | "invalid" | "short" | "long" | "ok"; msg: string } {
  const t = ID_TYPES.find((x) => x.value === typeValue);
  if (!t || !number) return { valid: false, state: "empty", msg: "" };
  if (t.numericOnly && !/^\d+$/.test(number)) return { valid: false, state: "invalid", msg: "Digits only" };
  const len = number.length;
  if (t.exactLen) {
    if (len < t.exactLen) return { valid: false, state: "short", msg: `${len} / ${t.exactLen} — ${t.exactLen - len} more needed` };
    if (len > t.exactLen) return { valid: false, state: "long",  msg: `Too long — must be exactly ${t.exactLen}` };
    return { valid: true, state: "ok", msg: t.hint };
  }
  const min = t.minLen ?? 0; const max = t.maxLen ?? Infinity;
  if (len < min) return { valid: false, state: "short", msg: `${len} / ${min}–${t.maxLen} chars` };
  if (len > max) return { valid: false, state: "long",  msg: `Too long — max ${max} characters` };
  return { valid: true, state: "ok", msg: t.hint };
}
