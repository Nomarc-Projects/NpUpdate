"use client";

import { useEffect } from "react";
import { recordPropertyView } from "@/lib/services/properties";

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const key = `nm:viewed:${propertyId}`;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 1000 * 60 * 30) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* private mode — still count the view */
    }
    recordPropertyView(propertyId).catch(() => {});
  }, [propertyId]);
  return null;
}
