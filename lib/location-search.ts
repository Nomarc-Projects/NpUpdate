/**
 * Location-search matching and ranking.
 *
 * Rules:
 * - Match the start of words, not letters inside words. "usa" matches "USA"
 *   but not "Lusada"; "lek" matches "Lekki".
 * - Treat common alternate names as the same place: USA/US/United States and
 *   UK/United Kingdom.
 * - Rank exact matches before word-start (prefix) matches.
 *
 * Used by every location search on the platform so the behaviour stays
 * consistent (Find Jobs, directory people/companies/catalogue, Find
 * Professionals, …).
 */

/** Alias groups — each member is treated as the same place. */
const ALIAS_GROUPS: string[][] = [
  ["usa", "us", "united states", "united states of america"],
  ["uk", "united kingdom", "great britain", "gb", "britain"],
];

/** Normalise for comparison: lowercase, strip dots/apostrophes, collapse to
 *  single spaces. "U.S.A." -> "usa", "United Kingdom" -> "united kingdom". */
export function normalizeLocationText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/['’\.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Word-boundary start positions in a normalised string (index 0 + after each
 *  space). */
function wordStarts(norm: string): number[] {
  if (!norm) return [];
  const starts = [0];
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] === " " && i + 1 < norm.length) starts.push(i + 1);
  }
  return starts;
}

function isWordBoundaryPrefix(normHaystack: string, normQuery: string): boolean {
  if (!normQuery) return true;
  for (const i of wordStarts(normHaystack)) {
    if (normHaystack.startsWith(normQuery, i)) return true;
  }
  return false;
}

/** All normalised searchable forms for a location, including alias expansions
 *  when the location contains a member of an alias group. */
function searchableForms(normLocation: string): string[] {
  const forms = new Set<string>([normLocation]);
  if (!normLocation) return [normLocation];

  for (const group of ALIAS_GROUPS) {
    const normGroup = group.map(normalizeLocationText);
    // Does this location refer to a member of the group? Match when a group
    // member appears as a whole word/phrase (bounded by start/end or spaces)
    // inside the location, or equals it.
    const present = normGroup.some((member) => containsPhrase(normLocation, member));
    if (present) {
      for (const member of normGroup) forms.add(member);
    }
  }
  return [...forms];
}

function containsPhrase(normHaystack: string, normPhrase: string): boolean {
  if (!normPhrase) return false;
  if (normHaystack === normPhrase) return true;
  let idx = normHaystack.indexOf(normPhrase);
  while (idx !== -1) {
    const beforeOk = idx === 0 || normHaystack[idx - 1] === " ";
    const after = idx + normPhrase.length;
    const afterOk = after === normHaystack.length || normHaystack[after] === " ";
    if (beforeOk && afterOk) return true;
    idx = normHaystack.indexOf(normPhrase, idx + 1);
  }
  return false;
}

/**
 * Score how well `location` matches `query`.
 *   0 = exact match (a searchable form equals the query, best)
 *   1 = whole-string prefix (a form starts with the query)
 *   2 = a word in a form starts with the query
 *   Infinity = no match
 *
 * "Exact match" is judged against the location and its alias forms so that
 * searching "usa" ranks "USA" / "United States" as exact-equivalent hits.
 */
export function locationMatchScore(location: string, query: string): number {
  const q = normalizeLocationText(query);
  if (!q) return Infinity;
  const normLoc = normalizeLocationText(location);
  if (!normLoc) return Infinity;

  const forms = searchableForms(normLoc);
  const qForms = searchableForms(q); // lets "united states" query be exact for "usa" location and vice versa

  // Exact: any location form equals the query or any alias of the query.
  for (const form of forms) {
    if (form === q) return 0;
    for (const qf of qForms) {
      if (form === qf) return 0;
    }
  }

  // Whole-string prefix: any form starts with the query.
  for (const form of forms) {
    if (form.startsWith(q)) return 1;
  }
  // Also treat the query as prefix of an alias-expanded meaning: if query is
  // a prefix of some alias member that the location maps to (covered above),
  // but also allow "united k" matching "United Kingdom" which startsWith works
  // for. Already handled. For the reverse (query "u" matching alias "uk" via
  // location "United Kingdom") word-start below will catch "uk"? "uk" starts
  // with "u" yes, so alias form "uk" gives word-start/prefix. "uk".startsWith("u") true => prefix score 1.
  for (const form of forms) {
    for (const i of wordStarts(form)) {
      if (i === 0) continue; // whole-string prefix handled
      // a later word starts at i; if the slice from i starts with q that's a
      // word-prefix match (score 2). We check whole-form prefix at i==0 above
      // only; but startsWith(q) on whole form already returned 1. So later
      // word prefixes fall through to score 2 below.
    }
  }

  // Word-start (prefix at any word boundary).
  for (const form of forms) {
    if (isWordBoundaryPrefix(form, q)) return 2;
  }

  return Infinity;
}

/** True when `location` matches `query` by the platform location-search rule. */
export function locationMatches(location: string, query: string): boolean {
  return locationMatchScore(location, query) !== Infinity;
}

/**
 * Comparator for sorting results by location-match quality (best first).
 * Non-matching items compare equal (score Infinity) — callers should usually
 * filter first.
 */
export function compareLocationMatch(a: string, b: string, query: string): number {
  return locationMatchScore(a, query) - locationMatchScore(b, query);
}
