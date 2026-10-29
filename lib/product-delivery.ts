import { NG_STATES } from "@/lib/data/nigeria-lga";

export const DELIVERY_OPTIONS = [
  { value: "nationwide", label: "Nationwide" },
  { value: "selected_states", label: "Selected states" },
  { value: "pickup_only", label: "Pickup only" },
] as const;

export type DeliveryMode = (typeof DELIVERY_OPTIONS)[number]["value"];

export const NIGERIAN_STATES = NG_STATES;

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return DELIVERY_OPTIONS.some((option) => option.value === value);
}

export function parseDeliveryMode(value: string | undefined): DeliveryMode | undefined {
  const normalized = value?.trim().toLowerCase().replace(/[-_]+/g, " ");
  if (!normalized) return undefined;
  if (normalized === "nationwide" || normalized === "delivers nationwide") return "nationwide";
  if (normalized === "selected states" || normalized === "selected state") return "selected_states";
  if (normalized === "pickup only" || normalized === "pickup") return "pickup_only";
  return undefined;
}

/** Short label for product cards; absent delivery data intentionally yields no badge. */
export function deliveryTag(mode: string | null | undefined, states: string[] | null | undefined): string | undefined {
  if (mode === "nationwide") return "Delivers nationwide";
  if (mode === "pickup_only") return "Pickup only";
  if (mode !== "selected_states" || !states?.length) return undefined;
  const names = states.slice(0, 2).join(", ");
  const remainder = states.length > 2 ? ` +${states.length - 2}` : "";
  return `Delivers to ${names}${remainder}`;
}
