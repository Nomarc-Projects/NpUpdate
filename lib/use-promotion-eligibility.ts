"use client";

import { useEffect, useState } from "react";
import { getPromotionEligibility, type PromotionEligibility } from "@/lib/services/promotions";

/**
 * The signed-in user's promotion rights — only Key players exhibitors and
 * Nomarc partners may run promotions. Resolves the server action once on
 * mount; defaults to ineligible so an unqualified user never flashes the
 * dashboard Ads tab on first paint.
 */
export function usePromotionEligibility(): { eligible: boolean; planLabel: string } {
  const [state, setState] = useState<{ eligible: boolean; planLabel: string }>({ eligible: false, planLabel: "Key players" });
  useEffect(() => {
    let alive = true;
    getPromotionEligibility()
      .then((e: PromotionEligibility) => { if (alive) setState({ eligible: e.eligible, planLabel: e.planLabel }); })
      .catch(() => { if (alive) setState({ eligible: false, planLabel: "Key players" }); });
    return () => { alive = false; };
  }, []);
  return state;
}