"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { r2Url } from "@/lib/r2-public";

/** Shared placeholder for posts with no cover — and for covers that 404. */
export const NEWS_FALLBACK_COVER =
  r2Url("site/photo-1503387762-592deb58ef4e.jpg");

/**
 * A news feed cover image that survives a dead URL.
 *
 * `src={coverUrl || FALLBACK}` only covers the null case: a post whose coverUrl
 * is set but no longer resolves rendered as a broken image with the alt text
 * spilling across the card. A server component cannot react to a failed load,
 * so this thin client wrapper swaps to the placeholder on `error`.
 */
export function NewsCover({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? NEWS_FALLBACK_COVER : src;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
