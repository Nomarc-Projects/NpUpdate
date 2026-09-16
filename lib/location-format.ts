import { COUNTRIES, statesFor } from "@/lib/data/countries";
import { lgasFor } from "@/lib/data/nigeria-lga";

/**
 * Reduce a stored profile location ("address, LGA, State, Country") to just
 * "State, Country" for display under a profile. Falls back gracefully:
 * legacy / unstructured strings keep their last two parts (or the whole
 * string) rather than showing nothing.
 */
export function shortLocation(loc: string): string {
  const s = (loc ?? "").trim();
  if (!s) return "";
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return s;

  const countryTail = parts[parts.length - 1];
  const country = COUNTRIES.find((c) => c.toLowerCase() === countryTail.toLowerCase());
  if (!country) {
    const tail = parts.slice(-2).join(", ");
    return parts.length >= 2 ? tail : s;
  }

  let rest = parts.slice(0, -1);
  let stateTail = rest.length ? rest[rest.length - 1].replace(/\s+state(\s|$)/i, "$1").trim() : "";
  const state = statesFor(country).find((st) => st.toLowerCase() === stateTail.toLowerCase()) ?? "";
  if (state) rest = rest.slice(0, -1);

  // Drop the LGA segment (Nigeria stores address, LGA, State, Country).
  if (state && country.toLowerCase() === "nigeria" && rest.length) {
    const lgaMatch = lgasFor(state).find((l) => l.toLowerCase() === rest[rest.length - 1].toLowerCase());
    if (lgaMatch) rest = rest.slice(0, -1);
  }

  return [state || stateTail, country].filter(Boolean).join(", ");
}