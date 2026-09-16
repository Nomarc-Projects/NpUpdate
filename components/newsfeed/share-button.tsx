"use client";

import { ShareTrigger } from "@/components/ui/share";

export function ShareButton({ title, url, variant = "pill" }: {
  title: string;
  url?: string;
  variant?: "icon" | "pill";
}) {
  return <ShareTrigger title={title} url={url} variant={variant} />;
}
