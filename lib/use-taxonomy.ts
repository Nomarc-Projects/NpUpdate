"use client";

import { useEffect, useState } from "react";
import { getTaxonomy } from "@/lib/services/taxonomy";
import type { TaxonomyKind } from "@/lib/taxonomy-kinds";

/**
 * Live admin-curated list for a taxonomy kind. Returns `fallback` immediately
 * (so dropdowns never flash empty) and swaps in the DB list once loaded.
 */
export function useTaxonomy(kind: TaxonomyKind, fallback: string[] = []): string[] {
  const [terms, setTerms] = useState<string[]>(fallback);
  useEffect(() => {
    let alive = true;
    getTaxonomy(kind).then((t) => { if (alive && t.length) setTerms(t); }).catch(() => {});
    return () => { alive = false; };
  }, [kind]);
  return terms;
}
